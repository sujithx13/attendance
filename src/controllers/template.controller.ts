import { Request, Response } from 'express';
import { getDb, withTransaction } from '../database/db.js';

export class TemplateController {
  static async list(req: Request, res: Response): Promise<void> {
    const db = await getDb();

    const templatesRes = await db.query(
      `SELECT t.id, t.name, t.description, t.target_type AS "targetType", t.target_id AS "targetId",
              t.created_at AS "createdAt",
              COUNT(s.id)::int AS slot_count
       FROM timetable_templates t
       LEFT JOIN timetable_template_slots s ON t.id = s.template_id
       GROUP BY t.id, t.name, t.description, t.target_type, t.target_id, t.created_at
       ORDER BY t.created_at DESC`
    );

    const templates = templatesRes.rows;

    for (const tmpl of templates) {
      const slotsRes = await db.query(
        `SELECT s.id, s.day_of_week AS "dayOfWeek", s.start_time AS "startTime", s.end_time AS "endTime",
                s.subject_name AS "subjectName", s.classroom_id AS "classroomId", s.professor_id AS "professorId",
                c.name AS "classroomName", u.full_name AS "professorName"
         FROM timetable_template_slots s
         LEFT JOIN classrooms c ON s.classroom_id = c.id
         LEFT JOIN users u ON s.professor_id = u.id
         WHERE s.template_id = $1
         ORDER BY s.day_of_week, s.start_time`,
        [tmpl.id]
      );
      tmpl.slots = slotsRes.rows;
    }

    res.json({ templates });
  }

  static async create(req: Request, res: Response): Promise<void> {
    const { name, description, slots, targetType, targetId } = req.body;

    if (!name) {
      res.status(400).json({ error: 'MISSING_NAME', message: 'Template name is required.' });
      return;
    }

    if (!Array.isArray(slots) || !slots.length || slots.some(s => !Number.isInteger(s.dayOfWeek) || s.dayOfWeek<0 || s.dayOfWeek>6 || !/^\d{2}:\d{2}(:\d{2})?$/.test(s.startTime) || !/^\d{2}:\d{2}(:\d{2})?$/.test(s.endTime) || s.startTime>=s.endTime || !s.professorId || !s.classroomId)) {
      res.status(400).json({message:'Every template slot needs a day, increasing start/end times, teacher and classroom.'}); return;
    }
    const db = await getDb();
    const templateId = `tmpl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

    await db.query(
      `INSERT INTO timetable_templates (id, name, description, target_type, target_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [templateId, name.trim(), description || null, targetType || null, targetId || null]
    );

    if (Array.isArray(slots)) {
      for (const slot of slots) {
        const slotId = `tslot_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
        await db.query(
          `INSERT INTO timetable_template_slots (id, template_id, day_of_week, start_time, end_time, subject_name, classroom_id, professor_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            slotId,
            templateId,
            slot.dayOfWeek,
            slot.startTime,
            slot.endTime,
            slot.subjectName,
            slot.classroomId || 'room_hall_a',
            slot.professorId || 'usr_prof_alan'
          ]
        );
      }
    }

    res.status(201).json({ message: 'Timetable template created successfully.', templateId });
  }

  static async delete(req: Request, res: Response): Promise<void> {
    const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
    const db = await getDb();

    await db.query('DELETE FROM timetable_template_slots WHERE template_id = $1', [id]);
    await db.query('DELETE FROM timetable_templates WHERE id = $1', [id]);

    res.json({ message: 'Template deleted successfully.', deletedId: id });
  }

  static async applyToCohort(req: Request, res: Response): Promise<void> {
    const templateId = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
    const { targetType, targetId } = req.body; // targetType: 'CLASS' | 'BATCH', targetId: course_id or batch_id

    if (!['CLASS','BATCH'].includes(targetType) || typeof targetId !== 'string' || !targetId) {
      res.status(400).json({ error: 'MISSING_TARGET', message: 'targetType (CLASS or BATCH) and targetId are required.' });
      return;
    }

    const db = await getDb();

    // Fetch template slots
    const slotsRes = await db.query(
      `SELECT * FROM timetable_template_slots WHERE template_id = $1`,
      [templateId]
    );

    if (slotsRes.rows.length === 0) {
      res.status(404).json({ error: 'NO_SLOTS', message: 'Template has no slots to apply.' });
      return;
    }

    const { sourceDay, daysOfWeek, dates } = req.body;
    const dayTemplate = sourceDay !== undefined;
    const selected = dayTemplate ? slotsRes.rows.filter(s => s.day_of_week === Number(sourceDay)) : slotsRes.rows;
    const validDate = (d: unknown) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d)) && new Date(d).toISOString().slice(0,10) === d;
    if ((daysOfWeek !== undefined && (!Array.isArray(daysOfWeek) || !daysOfWeek.length || daysOfWeek.some(d => !Number.isInteger(d) || d<0 || d>6))) || (dates !== undefined && (!Array.isArray(dates) || !dates.length || !dates.every(validDate))) || (!selected.length) || (dates && daysOfWeek)) {
      res.status(400).json({message:'Choose a source day and valid target dates or weekdays.'}); return;
    }
    let appliedCount=0;
    await withTransaction(async()=>{
      const connection=await getDb();
      await connection.query('SELECT id FROM batches WHERE id=$1 FOR UPDATE',[targetType==='BATCH'?targetId:null]);
      for(const slot of selected) for(const target of (dates ? [...new Set(dates)] : daysOfWeek ? [...new Set(daysOfWeek)] : [slot.day_of_week])) {
        const date=dates?target:null, day=dates?null:target;
        const conflict=await connection.query(`SELECT id FROM timetable_slots WHERE is_active=TRUE AND (batch_id=$1 OR professor_id=$2 OR classroom_id=$3) AND start_time<$5::time AND end_time>$4::time AND
          (($6::date IS NOT NULL AND (specific_date=$6::date OR (schedule_type='RECURRING_WEEKLY' AND day_of_week=EXTRACT(DOW FROM $6::date)::int AND effective_from<=$6::date AND (effective_until IS NULL OR effective_until>=$6::date)))) OR
          ($6::date IS NULL AND ((schedule_type='RECURRING_WEEKLY' AND day_of_week=$7::int) OR (schedule_type='SPECIFIC_DATE' AND EXTRACT(DOW FROM specific_date)::int=$7::int AND specific_date>=CURRENT_DATE)))) LIMIT 1`,[targetType==='BATCH'?targetId:null,slot.professor_id,slot.classroom_id,slot.start_time,slot.end_time,date,day]);
        if(conflict.rows.length) { const error=new Error('Template overlaps an existing batch, teacher or classroom schedule. No slots were applied.'); (error as any).statusCode=409; throw error; }
        await connection.query(`INSERT INTO timetable_slots(id,schedule_type,day_of_week,specific_date,start_time,end_time,target_type,course_id,batch_id,professor_id,classroom_id,subject_name) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,[`slot_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,10)}`,dates?'SPECIFIC_DATE':'RECURRING_WEEKLY',day,date,slot.start_time,slot.end_time,targetType,targetType==='CLASS'?targetId:null,targetType==='BATCH'?targetId:null,slot.professor_id,slot.classroom_id,slot.subject_name]);
        appliedCount++;
      }
    });

    res.json({
      message: `Template applied! Created ${appliedCount} weekly timetable slot(s) specifically for ${targetType} ${targetId}.`,
      appliedCount
    });
  }
}
