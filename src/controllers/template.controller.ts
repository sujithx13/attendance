import { Request, Response } from 'express';
import { getDb } from '../database/db.js';

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

    if (!targetType || !targetId) {
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

    let appliedCount = 0;
    for (const slot of slotsRes.rows) {
      const timetableSlotId = `slot_${targetType.toLowerCase()}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
      await db.query(
        `INSERT INTO timetable_slots (
           id, schedule_type, day_of_week, start_time, end_time,
           target_type, course_id, batch_id, professor_id, classroom_id
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          timetableSlotId,
          'RECURRING_WEEKLY',
          slot.day_of_week,
          slot.start_time,
          slot.end_time,
          targetType,
          targetType === 'CLASS' ? targetId : null,
          targetType === 'BATCH' ? targetId : null,
          slot.professor_id || 'usr_prof_alan',
          slot.classroom_id || 'room_hall_a'
        ]
      );
      appliedCount++;
    }

    res.json({
      message: `Template applied! Created ${appliedCount} weekly timetable slot(s) specifically for ${targetType} ${targetId}.`,
      appliedCount
    });
  }
}
