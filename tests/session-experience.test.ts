import assert from 'node:assert/strict';
import http from 'node:http';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';
import { getDb } from '../src/database/db.js';
import { ENV } from '../src/config/env.js';
import { QrService } from '../src/services/qr.service.js';
import { ScheduleService } from '../src/services/schedule.service.js';

export async function testSessionExperience() {
  console.log('\n--- Scheduled attendance, batch teachers, same-day passes and GPS-free checks ---');
  const db = await getDb();
  const date = ScheduleService.campusDate();
  const window = { start_time: '2026-10-29T10:00:00+05:30', end_time: '2026-10-29T11:00:00+05:30' };
  assert.equal(ScheduleService.inScheduledTime(window, new Date('2026-10-29T04:30:00Z')), true);
  assert.equal(ScheduleService.inScheduledTime(window, new Date('2026-10-29T05:30:00Z')), false);
  assert.equal(ScheduleService.campusDate(new Date('2026-10-28T20:00:00Z')), '2026-10-29');
  await db.query(`INSERT INTO timetable_slots (id, schedule_type, specific_date, start_time, end_time, target_type, course_id, professor_id, classroom_id)
    VALUES ('slot_daily_test', 'SPECIFIC_DATE', $1, '23:58', '23:59', 'CLASS', 'crs_cs101', 'usr_prof_alan', 'clr_turing_hall')`, [date]);
  const server = http.createServer(createApp());
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${(server.address() as import('node:net').AddressInfo).port}/api/v1`;
  const sign = (userId: string, role: string) => jwt.sign({ userId, role }, ENV.JWT_SECRET, { expiresIn: '1h' });
  const prof = sign('usr_prof_alan', 'PROFESSOR'), other = sign('usr_prof_ada', 'PROFESSOR');
  const student = sign('usr_student_john', 'STUDENT');
  const request = (path: string, token: string, body?: unknown) => fetch(base + path, { method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  try {
    const initial = await request('/sessions/for-slot/slot_daily_test', student);
    assert.equal(initial.status, 200);
    const context = await initial.json() as any;
    assert.ok(context.sessionId, 'Today’s occurrence exists without teacher launch.');
    const id = context.sessionId;
    // Freeze this occurrence's schedule outside now; tests do not depend on wall-clock hours.
    await db.query(`UPDATE sessions SET scheduled_start_at = CURRENT_TIMESTAMP + INTERVAL '1 hour', scheduled_end_at = CURRENT_TIMESTAMP + INTERVAL '2 hours', status = 'SCHEDULED' WHERE id = $1`, [id]);
    const passRes = await request('/attendance/student-qr?sessionId=slot_daily_test', student);
    assert.equal(passRes.status, 200, 'Students may show a pass before class.');
    const pass = await passRes.json() as any;
    assert.equal(pass.sessionId, id);
    assert.equal((await request('/sessions/launch-slot', student, { slotId: 'slot_daily_test', confirmOutsideSchedule: true })).status, 403);
    assert.equal((await request('/sessions/launch-slot', other, { slotId: 'slot_daily_test', confirmOutsideSchedule: true })).status, 403);
    assert.equal((await request('/attendance/professor-scan', other, { sessionId: id, studentQrPayload: pass.qrPayload, confirmOutsideSchedule: true })).status, 403);
    const warning = await request('/attendance/professor-scan', prof, { sessionId: id, studentQrPayload: pass.qrPayload });
    assert.equal(warning.status, 409);
    assert.equal((await warning.json() as any).error, 'OUTSIDE_SCHEDULE');
    assert.equal((await db.query('SELECT 1 FROM used_qr_nonces WHERE session_id = $1', [id])).rows.length, 0, 'Warning does not consume pass.');
    const confirmed = await request('/attendance/professor-scan', prof, { sessionId: id, studentQrPayload: pass.qrPayload, confirmOutsideSchedule: true });
    assert.equal(confirmed.status, 200, await confirmed.text());
    assert.equal((await request('/attendance/professor-scan', prof, { sessionId: id, studentQrPayload: pass.qrPayload, confirmOutsideSchedule: true })).status, 400, 'Confirmation cannot bypass replay protection.');
    assert.equal((await (await request('/sessions/for-slot/slot_daily_test', student)).json() as any).attendanceStatus, 'MARKED');
    const openWarning = await request('/sessions/launch-slot', prof, { slotId: 'slot_daily_test' });
    assert.equal((await openWarning.json() as any).error, 'OUTSIDE_SCHEDULE');
    assert.equal((await request('/sessions/launch-slot', prof, { slotId: 'slot_daily_test', confirmOutsideSchedule: true })).status, 200);
    const flow = await (await request(`/flows/student?sessionId=${id}`, student)).json() as any;
    assert.equal(flow.policy.requiresGps, false);
    assert.equal(flow.steps.some((step: any) => step.type === 'GEOLOCATION_CHECK'), false);
    const qr = QrService.generateSessionBroadcastPayload(id).payload;
    const attempt = await request('/attendance/attempt', student, { sessionId: id, declarationAccepted: true, qrPayload: qr });
    assert.equal(attempt.status, 200, 'Valid QR needs no GPS.');
    // Expired schedule also requires warning, but may be confirmed.
    await db.query(`UPDATE sessions SET scheduled_start_at = CURRENT_TIMESTAMP - INTERVAL '2 hours', scheduled_end_at = CURRENT_TIMESTAMP - INTERVAL '1 hour' WHERE id = $1`, [id]);
    const laterPass = await (await request(`/attendance/student-qr?sessionId=${id}`, student)).json() as any;
    assert.equal((await request('/attendance/professor-scan', prof, { sessionId: id, studentQrPayload: laterPass.qrPayload })).status, 409);
    assert.equal((await request('/attendance/professor-scan', prof, { sessionId: id, studentQrPayload: laterPass.qrPayload, confirmOutsideSchedule: true })).status, 200);
    // Automatic activation and completion at boundaries, without launch.
    await db.query(`UPDATE sessions SET status = 'SCHEDULED', scheduled_start_at = CURRENT_TIMESTAMP - INTERVAL '1 minute', scheduled_end_at = CURRENT_TIMESTAMP + INTERVAL '1 minute', end_time = CURRENT_TIMESTAMP + INTERVAL '1 minute' WHERE id = $1`, [id]);
    await ScheduleService.sync();
    assert.equal((await db.query('SELECT status FROM sessions WHERE id = $1', [id])).rows[0].status, 'ACTIVE');
    assert.equal((await request('/sessions/launch-slot', prof, { slotId: 'slot_daily_test' })).status, 200);
    await db.query(`UPDATE sessions SET end_time = CURRENT_TIMESTAMP - INTERVAL '1 second' WHERE id = $1`, [id]);
    await ScheduleService.sync();
    assert.equal((await db.query('SELECT status FROM sessions WHERE id = $1', [id])).rows[0].status, 'COMPLETED');
    // Any assigned batch teacher may display and scan; unrelated teachers may not.
    const batch = (await db.query('SELECT batch_id FROM batch_members WHERE student_id = $1 LIMIT 1', ['usr_student_john'])).rows[0].batch_id;
    await db.query(`INSERT INTO batch_professors (id, batch_id, professor_id, role) VALUES ('bp_daily_test', $1, 'usr_prof_ada', 'INSTRUCTOR') ON CONFLICT DO NOTHING`, [batch]);
    await db.query('UPDATE timetable_slots SET batch_id = $1 WHERE id = $2', [batch, 'slot_daily_test']);
    await db.query('UPDATE sessions SET batch_id = $1 WHERE id = $2', [batch, id]);
    assert.equal((await request('/sessions/for-slot/slot_daily_test', other)).status, 200);
    assert.equal((await request('/sessions/launch-slot', other, { slotId: 'slot_daily_test', confirmOutsideSchedule: true })).status, 200);
    assert.equal((await request(`/sessions/${id}/qr-export`, other)).status, 200);
    const batchPass = await (await request(`/attendance/student-qr?sessionId=${id}`, student)).json() as any;
    assert.equal((await request('/attendance/professor-scan', other, { sessionId: id, studentQrPayload: batchPass.qrPayload, confirmOutsideSchedule: true })).status, 200);
    await db.query(`UPDATE sessions SET start_time = start_time - INTERVAL '1 day' WHERE id = $1`, [id]);
    assert.equal((await request(`/attendance/student-qr?sessionId=${id}`, student)).status, 409, 'Yesterday’s pass cannot be issued.');
    console.log('  ✓ Automatic timing, before/after warnings, same-day passes, saved status, no GPS and batch-teacher access passed');
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
}
