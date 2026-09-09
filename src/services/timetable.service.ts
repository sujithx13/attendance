import { getDb } from '../database/db.js';
import {
  TimetableSlot,
  CreateTimetableSlotDto,
  ScheduleType,
  TargetType
} from '../types/timetable.types.js';

export class TimetableService {
  /**
   * Admin creates a recurring weekly or single-day timetable slot.
   */
  static async createSlot(dto: CreateTimetableSlotDto): Promise<TimetableSlot> {
    const db = await getDb();
    const id = `slot_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    if (dto.scheduleType === ScheduleType.RECURRING_WEEKLY && dto.dayOfWeek === undefined) {
      throw new Error('dayOfWeek (0-6) is required for RECURRING_WEEKLY timetable slots.');
    }

    if (dto.scheduleType === ScheduleType.SPECIFIC_DATE && !dto.specificDate) {
      throw new Error('specificDate (YYYY-MM-DD) is required for SPECIFIC_DATE timetable slots.');
    }

    if (dto.targetType === TargetType.CLASS && !dto.courseId) {
      throw new Error('courseId is required when targetType is CLASS.');
    }

    if (dto.targetType === TargetType.BATCH && !dto.batchId) {
      throw new Error('batchId is required when targetType is BATCH.');
    }

    await db.query(
      `INSERT INTO timetable_slots (
        id, schedule_type, day_of_week, specific_date, start_time, end_time,
        target_type, course_id, batch_id, professor_id, classroom_id,
        effective_from, effective_until
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        id,
        dto.scheduleType,
        dto.dayOfWeek ?? null,
        dto.specificDate || null,
        dto.startTime,
        dto.endTime,
        dto.targetType,
        dto.courseId || null,
        dto.batchId || null,
        dto.professorId,
        dto.classroomId,
        dto.effectiveFrom ? new Date(dto.effectiveFrom) : new Date(),
        dto.effectiveUntil ? new Date(dto.effectiveUntil) : null
      ]
    );

    return this.getSlotById(id) as Promise<TimetableSlot>;
  }

  /**
   * Retrieves timetable slots with joins for courses, batches, professors, and classrooms.
   */
  static async listSlots(filters: {
    dayOfWeek?: number;
    specificDate?: string;
    targetType?: TargetType;
    professorId?: string;
    scheduleType?: ScheduleType;
  } = {}): Promise<TimetableSlot[]> {
    const db = await getDb();
    let sql = `
      SELECT ts.*,
             c.code AS course_code, c.name AS course_name,
             b.code AS batch_code, b.name AS batch_name,
             u.full_name AS professor_name,
             clr.name AS classroom_name
      FROM timetable_slots ts
      LEFT JOIN courses c ON ts.course_id = c.id
      LEFT JOIN batches b ON ts.batch_id = b.id
      JOIN users u ON ts.professor_id = u.id
      JOIN classrooms clr ON ts.classroom_id = clr.id
      WHERE ts.is_active = TRUE
    `;
    const params: any[] = [];

    if (filters.scheduleType) {
      params.push(filters.scheduleType);
      sql += ` AND ts.schedule_type = $${params.length}`;
    }

    if (filters.dayOfWeek !== undefined) {
      params.push(filters.dayOfWeek);
      sql += ` AND ts.day_of_week = $${params.length}`;
    }

    if (filters.specificDate) {
      params.push(filters.specificDate);
      sql += ` AND ts.specific_date = $${params.length}`;
    }

    if (filters.targetType) {
      params.push(filters.targetType);
      sql += ` AND ts.target_type = $${params.length}`;
    }

    if (filters.professorId) {
      params.push(filters.professorId);
      sql += ` AND ts.professor_id = $${params.length}`;
    }

    sql += ` ORDER BY ts.day_of_week ASC, ts.start_time ASC`;

    const res = await db.query(sql, params);
    return res.rows.map(this.mapSlotRow);
  }

  static async getSlotById(id: string): Promise<TimetableSlot | null> {
    const db = await getDb();
    const res = await db.query(
      `SELECT ts.*,
              c.code AS course_code, c.name AS course_name,
              b.code AS batch_code, b.name AS batch_name,
              u.full_name AS professor_name,
              clr.name AS classroom_name
       FROM timetable_slots ts
       LEFT JOIN courses c ON ts.course_id = c.id
       LEFT JOIN batches b ON ts.batch_id = b.id
       JOIN users u ON ts.professor_id = u.id
       JOIN classrooms clr ON ts.classroom_id = clr.id
       WHERE ts.id = $1`,
      [id]
    );

    if (res.rows.length === 0) return null;
    return this.mapSlotRow(res.rows[0]);
  }

  static async deleteSlot(id: string): Promise<void> {
    const db = await getDb();
    await db.query('UPDATE timetable_slots SET is_active = FALSE WHERE id = $1', [id]);
  }

  static async updateSlot(
    id: string,
    dto: {
      dayOfWeek?: number;
      startTime?: string;
      endTime?: string;
      batchId?: string;
      courseId?: string;
      professorId?: string;
      classroomId?: string;
    }
  ): Promise<TimetableSlot | null> {
    const db = await getDb();
    await db.query(
      `UPDATE timetable_slots
       SET day_of_week = COALESCE($1, day_of_week),
           start_time = COALESCE($2, start_time),
           end_time = COALESCE($3, end_time),
           batch_id = CASE WHEN $8 THEN $4 ELSE batch_id END,
           course_id = CASE WHEN $9 THEN $5 ELSE course_id END,
           professor_id = COALESCE($6, professor_id),
           classroom_id = COALESCE($7, classroom_id)
       WHERE id = $10`,
      [
        dto.dayOfWeek !== undefined ? dto.dayOfWeek : null,
        dto.startTime || null,
        dto.endTime || null,
        dto.batchId || null,
        dto.courseId || null,
        dto.professorId || null,
        dto.classroomId || null,
        dto.batchId !== undefined,
        dto.courseId !== undefined,
        id
      ]
    );

    return this.getSlotById(id);
  }

  static async getStudentTimetable(studentId: string): Promise<TimetableSlot[]> {
    const db = await getDb();
    const res = await db.query(
      `SELECT DISTINCT ts.*,
              b.code AS batch_code, b.name AS batch_name,
              c.code AS course_code, c.name AS course_name,
              u.full_name AS professor_name,
              clr.name AS classroom_name
       FROM timetable_slots ts
       LEFT JOIN batches b ON ts.batch_id = b.id
       LEFT JOIN batch_members bm ON b.id = bm.batch_id
       LEFT JOIN courses c ON ts.course_id = c.id
       LEFT JOIN enrollments en ON c.id = en.course_id
       JOIN users u ON ts.professor_id = u.id
       JOIN classrooms clr ON ts.classroom_id = clr.id
       WHERE ts.is_active = TRUE
         AND (bm.student_id = $1 OR en.student_id = $1)
       ORDER BY ts.day_of_week ASC, ts.start_time ASC`,
      [studentId]
    );
    return res.rows.map(this.mapSlotRow);
  }

  static async getProfessorTimetable(professorId: string): Promise<TimetableSlot[]> {
    const db = await getDb();
    const res = await db.query(
      `SELECT DISTINCT ts.*,
              b.code AS batch_code, b.name AS batch_name,
              c.code AS course_code, c.name AS course_name,
              u.full_name AS professor_name,
              clr.name AS classroom_name
       FROM timetable_slots ts
       LEFT JOIN batches b ON ts.batch_id = b.id
       LEFT JOIN batch_professors bp ON b.id = bp.batch_id
       LEFT JOIN courses c ON ts.course_id = c.id
       JOIN users u ON ts.professor_id = u.id
       JOIN classrooms clr ON ts.classroom_id = clr.id
       WHERE ts.is_active = TRUE
         AND (ts.professor_id = $1 OR bp.professor_id = $1 OR b.professor_id = $1)
       ORDER BY ts.day_of_week ASC, ts.start_time ASC`,
      [professorId]
    );
    return res.rows.map(this.mapSlotRow);
  }

  /**
   * CORE SCHEDULING ENGINE:
   * Generates live class & batch attendance sessions for a given date from active timetable slots.
   * Seamlessly honors weekly repeating schedules and ad-hoc single-day overrides.
   */
  static async generateSessionsForDate(targetDate: Date): Promise<{ createdCount: number; sessions: any[] }> {
    const db = await getDb();
    const dateStr = targetDate.toISOString().slice(0, 10); // 'YYYY-MM-DD'
    const dayOfWeek = targetDate.getDay(); // 0-6

    // Fetch recurring weekly slots matching dayOfWeek + any specific date overrides for today
    const slotsRes = await db.query(
      `SELECT ts.*
       FROM timetable_slots ts
       WHERE ts.is_active = TRUE
         AND (
           (ts.schedule_type = 'RECURRING_WEEKLY' AND ts.day_of_week = $1
            AND ts.effective_from <= $2
            AND (ts.effective_until IS NULL OR ts.effective_until >= $2))
           OR
           (ts.schedule_type = 'SPECIFIC_DATE' AND ts.specific_date = $2)
         )`,
      [dayOfWeek, dateStr]
    );

    const createdSessions: any[] = [];

    for (const slot of slotsRes.rows) {
      // Build start_time and end_time timestamps for the target date
      const startTimeIso = `${dateStr}T${slot.start_time}`;
      const endTimeIso = `${dateStr}T${slot.end_time}`;
      const startDateTime = new Date(startTimeIso);
      const endDateTime = new Date(endTimeIso);

      // Check if session for this slot on this date already exists
      const existingRes = await db.query(
        `SELECT id FROM sessions
         WHERE professor_id = $1
           AND classroom_id = $2
           AND start_time = $3
           AND ((course_id = $4) OR (batch_id = $5))`,
        [slot.professor_id, slot.classroom_id, startDateTime, slot.course_id, slot.batch_id]
      );

      if (existingRes.rows.length === 0) {
        const sessionId = `sess_${dateStr.replace(/-/g, '')}_${Math.random().toString(36).substring(2, 8)}`;
        await db.query(
          `INSERT INTO sessions (
            id, course_id, batch_id, professor_id, classroom_id,
            start_time, end_time, status, timetable_slot_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'SCHEDULED', $8)`,
          [
            sessionId,
            slot.course_id || null,
            slot.batch_id || null,
            slot.professor_id,
            slot.classroom_id,
            startDateTime,
            endDateTime,
            slot.id
          ]
        );

        createdSessions.push({
          id: sessionId,
          targetType: slot.target_type,
          courseId: slot.course_id,
          batchId: slot.batch_id,
          startTime: startDateTime,
          endTime: endDateTime
        });
      }
    }

    return {
      createdCount: createdSessions.length,
      sessions: createdSessions
    };
  }

  private static mapSlotRow(row: any): TimetableSlot {
    return {
      id: row.id,
      scheduleType: row.schedule_type,
      dayOfWeek: row.day_of_week !== null ? parseInt(row.day_of_week, 10) : undefined,
      specificDate: row.specific_date ? row.specific_date.toISOString().slice(0, 10) : undefined,
      startTime: row.start_time,
      endTime: row.end_time,
      targetType: row.target_type,
      courseId: row.course_id,
      courseCode: row.course_code,
      courseName: row.course_name,
      batchId: row.batch_id,
      batchCode: row.batch_code,
      batchName: row.batch_name,
      professorId: row.professor_id,
      professorName: row.professor_name,
      classroomId: row.classroom_id,
      classroomName: row.classroom_name,
      isActive: Boolean(row.is_active),
      effectiveFrom: row.effective_from,
      effectiveUntil: row.effective_until,
      createdAt: row.created_at
    };
  }
}
