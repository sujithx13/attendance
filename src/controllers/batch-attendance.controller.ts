import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { getDb } from '../database/db.js';

export class BatchAttendanceController {
  static async list(req: AuthenticatedRequest, res: Response): Promise<void> {
    const batchId = String(req.params.id);
    const date = String(req.query.date || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date)) || new Date(date).toISOString().slice(0,10)!==date) { res.status(400).json({ message: 'Choose a valid date (YYYY-MM-DD).' }); return; }
    const db = await getDb();
    const batch = await db.query('SELECT id FROM batches WHERE id=$1', [batchId]);
    if (!batch.rows.length) { res.status(404).json({ message: 'Batch not found.' }); return; }
    const sessions = await db.query(`SELECT s.id, COALESCE(t.subject_name, c.title, 'Class session') AS name, s.start_time AS "startTime", s.end_time AS "endTime", s.status
      FROM sessions s LEFT JOIN courses c ON c.id=s.course_id LEFT JOIN timetable_slots t ON t.id=s.timetable_slot_id
      WHERE s.batch_id=$1 AND (s.start_time AT TIME ZONE 'Asia/Kolkata')::date=$2::date AND s.status <> 'CANCELLED' ORDER BY s.start_time`, [batchId,date]);
    const students = await db.query(`SELECT u.id, u.full_name AS name, u.enrollment_id AS "registerNumber", u.email, u.phone_number AS phone,
      d.code AS department FROM users u LEFT JOIN departments d ON d.id=u.department_id
      WHERE u.role='STUDENT' AND (EXISTS (SELECT 1 FROM batch_members bm WHERE bm.batch_id=$1 AND bm.student_id=u.id AND (bm.enrolled_at AT TIME ZONE 'Asia/Kolkata')::date <= $2::date)
      OR EXISTS (SELECT 1 FROM attendance_records a JOIN sessions s ON s.id=a.session_id WHERE s.batch_id=$1 AND a.student_id=u.id AND (s.start_time AT TIME ZONE 'Asia/Kolkata')::date=$2::date)) ORDER BY u.full_name,u.id`, [batchId,date]);
    const records = await db.query(`SELECT a.student_id AS "studentId", a.session_id AS "sessionId", a.status FROM attendance_records a JOIN sessions s ON s.id=a.session_id WHERE s.batch_id=$1 AND (s.start_time AT TIME ZONE 'Asia/Kolkata')::date=$2::date`, [batchId,date]);
    const index = new Map(records.rows.map(r => [`${r.studentId}:${r.sessionId}`,r.status]));
    res.json({ date, sessions: sessions.rows, students: students.rows.map(u => ({ ...u, attendance: Object.fromEntries(sessions.rows.map(s => [s.id,index.get(`${u.id}:${s.id}`) || (new Date(s.endTime).getTime() <= Date.now() ? 'ABSENT' : new Date(s.startTime).getTime() > Date.now() ? 'NOT_STARTED' : 'PENDING')])) })) });
  }
}
