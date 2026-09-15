import { randomUUID } from 'node:crypto';
import { getDb, withTransaction } from '../database/db.js';

// Timetable wall-clock times belong to the campus, independently of the server timezone.
export class ScheduleService {
  static campusDate(now = new Date()) { return now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); }
  static isToday(session: any) { return this.campusDate(new Date(session.start_time)) === this.campusDate(); }
  static inScheduledTime(session: any, now = new Date()) {
    return now >= new Date(session.scheduled_start_at || session.start_time)
      && now < new Date(session.scheduled_end_at || session.end_time);
  }

  static async ensureToday(slotId: string, allowOtherDay: boolean): Promise<any | null> {
    return withTransaction(async () => {
      const db = await getDb();
      const slot = (await db.query('SELECT * FROM timetable_slots WHERE id = $1 AND is_active = TRUE FOR UPDATE', [slotId])).rows[0];
      if (!slot) return null;
      const date = this.campusDate();
      const day = new Date(`${date}T12:00:00+05:30`).getUTCDay();
      const dateOnly = (v: any) => typeof v === 'string' ? v.slice(0, 10) : v?.toISOString().slice(0, 10);
      const scheduledToday = slot.schedule_type === 'SPECIFIC_DATE' ? dateOnly(slot.specific_date) === date
        : Number(slot.day_of_week) === day && (!slot.effective_from || dateOnly(slot.effective_from) <= date)
          && (!slot.effective_until || dateOnly(slot.effective_until) >= date);
      if (!scheduledToday && !allowOtherDay) return null;
      let session = (await db.query(`SELECT * FROM sessions WHERE timetable_slot_id = $1
        AND (start_time AT TIME ZONE 'Asia/Kolkata')::date = $2::date ORDER BY (attendance_date IS NOT NULL) DESC, start_time DESC LIMIT 1`, [slotId, date])).rows[0];
      const start = new Date(`${date}T${slot.start_time}+05:30`);
      const end = new Date(`${date}T${slot.end_time}+05:30`);
      if (end <= start) end.setUTCDate(end.getUTCDate() + 1);
      // A teacher opening a different weekday is always outside its scheduled window.
      const scheduledStart = scheduledToday ? start : new Date(`${date}T00:00:00+05:30`);
      const scheduledEnd = scheduledToday ? end : scheduledStart;
      if (session) {
        if (!session.attendance_date) {
          await db.query(`UPDATE sessions SET attendance_date = $2, scheduled_start_at = $3, scheduled_end_at = $4 WHERE id = $1`, [session.id, date, scheduledStart, scheduledEnd]);
          session = { ...session, attendance_date: date, scheduled_start_at: scheduledStart, scheduled_end_at: scheduledEnd };
        }
        return session;
      }
      const active = scheduledToday && this.inScheduledTime({ start_time: start, end_time: end });
      session = (await db.query(`INSERT INTO sessions (id, timetable_slot_id, attendance_date, course_id, batch_id,
        professor_id, classroom_id, start_time, end_time, scheduled_start_at, scheduled_end_at, status)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
        [randomUUID(), slot.id, date, slot.course_id, slot.batch_id, slot.professor_id, slot.classroom_id,
          start, end, scheduledStart, scheduledEnd, active ? 'ACTIVE' : 'SCHEDULED'])).rows[0];
      return session;
    });
  }

  static async sync() {
    const db = await getDb();
    const slots = await db.query('SELECT id FROM timetable_slots WHERE is_active = TRUE');
    for (const slot of slots.rows) await this.ensureToday(slot.id, false);
    await db.query(`UPDATE sessions SET status = 'ACTIVE' WHERE attendance_date IS NOT NULL AND status = 'SCHEDULED'
      AND scheduled_start_at <= CURRENT_TIMESTAMP AND scheduled_end_at > CURRENT_TIMESTAMP`);
    await db.query(`UPDATE sessions SET status = 'COMPLETED' WHERE attendance_date IS NOT NULL AND status = 'ACTIVE' AND end_time <= CURRENT_TIMESTAMP`);
  }

  static async openForTeacher(id: string) {
    const db = await getDb();
    await db.query(`UPDATE sessions SET status = 'ACTIVE', end_time = GREATEST(end_time,
      LEAST(CURRENT_TIMESTAMP + INTERVAL '2 hours', ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date + 1)::timestamp AT TIME ZONE 'Asia/Kolkata')) WHERE id = $1`, [id]);
  }
}
