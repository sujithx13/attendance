import { getDb } from '../database/db.js';
import { httpError, professorScope } from './access.service.js';
import { ScheduleService } from './schedule.service.js';
import type { UserTokenPayload } from '../types/auth.types.js';

export class SessionContextService {
  static async forSlots(slotIds: string[], studentId?: string): Promise<Map<string, any>> {
    if (!slotIds.length) return new Map();
    await ScheduleService.sync();
    const db = await getDb();
    const result = await db.query(`
      SELECT ts.id AS slot_id, s.id AS session_id, s.status, s.end_time, s.origin_radius_meters, s.scheduled_start_at, s.scheduled_end_at, s.start_time,
        ar.status AS attendance_status, ar.verified_at
      FROM timetable_slots ts
      LEFT JOIN LATERAL (
        SELECT * FROM sessions ss WHERE ss.timetable_slot_id = ts.id
          AND (ss.start_time AT TIME ZONE 'Asia/Kolkata')::date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date
        ORDER BY (ss.attendance_date IS NOT NULL) DESC, (ss.status = 'ACTIVE' AND ss.end_time > CURRENT_TIMESTAMP) DESC, ss.start_time DESC LIMIT 1
      ) s ON TRUE
      LEFT JOIN attendance_records ar ON ar.session_id = s.id AND ar.student_id = $2
      WHERE ts.id = ANY($1::varchar[])`, [slotIds, studentId || null]);
    return new Map(result.rows.map((row: any) => [row.slot_id, {
      sessionId: row.session_id || null,
      sessionActive: row.status === 'ACTIVE' && new Date(row.end_time) > new Date(),
      attendanceStatus: ['PRESENT', 'LATE', 'EXCUSED'].includes(row.attendance_status) ? 'MARKED' : row.attendance_status === 'CHALLENGED' ? 'PENDING' : 'NOT_MARKED',
      verifiedAt: row.verified_at || null,
      radiusMeters: row.origin_radius_meters || null,
      locationReady: row.origin_radius_meters != null,
      outsideScheduledTime: row.session_id ? !ScheduleService.inScheduledTime(row) : true
    }]));
  }

  static async forSlot(user: UserTokenPayload, slotId: string) {
    const db = await getDb();
    const found = await db.query(`SELECT ts.* FROM timetable_slots ts WHERE ts.id = $1 AND ts.is_active = TRUE`, [slotId]);
    const slot = found.rows[0];
    if (!slot) throw httpError(404, 'Class not found.');
    if (user.role === 'STUDENT') {
      const access = slot.batch_id
        ? await db.query('SELECT 1 FROM batch_members WHERE batch_id = $1 AND student_id = $2', [slot.batch_id, user.userId])
        : await db.query("SELECT 1 FROM enrollments WHERE course_id = $1 AND student_id = $2 AND status = 'ACTIVE'", [slot.course_id, user.userId]);
      if (!access.rows.length) throw httpError(403, 'You are not enrolled in this class.');
    } else if (user.role !== 'ADMIN') {
      const access = await db.query(`SELECT 1 FROM timetable_slots ts WHERE ts.id = $1 AND ${professorScope('ts', '$2')}`, [slotId, user.userId]);
      if (!access.rows.length) throw httpError(403, 'Only teachers assigned to this class or batch can open it.');
    }
    await ScheduleService.ensureToday(slotId, false);
    return (await this.forSlots([slotId], user.role === 'STUDENT' ? user.userId : undefined)).get(slotId);
  }
}
