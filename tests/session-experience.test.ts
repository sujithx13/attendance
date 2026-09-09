import assert from 'node:assert/strict';
import http from 'node:http';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';
import { getDb } from '../src/database/db.js';
import { ENV } from '../src/config/env.js';
import { QrService } from '../src/services/qr.service.js';
import { PolicyService } from '../src/services/policy.service.js';

export async function testSessionExperience() {
  console.log('\n--- Session location, student pass and attendance status tests ---');
  assert.equal(ENV.NODE_ENV, 'test');
  const db = await getDb();
  await db.query(`INSERT INTO users (id, email, password_hash, full_name, role) VALUES ('usr_location_outsider', 'location-outsider@example.test', 'not-a-login-password', 'Unenrolled test student', 'STUDENT')`);
  await db.query(`INSERT INTO users (id, email, password_hash, full_name, role) VALUES ('usr_location_student', 'location-student@example.test', 'not-a-login-password', 'Location test student', 'STUDENT')`);
  await db.query(`INSERT INTO enrollments (id, course_id, student_id, status) VALUES ('enr_location_test', 'crs_cs101', 'usr_location_student', 'ACTIVE')`);
  // A distinct slot avoids sharing attendance state with earlier suites.
  await db.query(`INSERT INTO timetable_slots (id, schedule_type, day_of_week, start_time, end_time, target_type, course_id, professor_id, classroom_id)
    VALUES ('slot_location_test', 'RECURRING_WEEKLY', 4, '10:00', '11:00', 'CLASS', 'crs_cs101', 'usr_prof_alan', 'clr_turing_hall')`);
  const server = http.createServer(createApp());
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${(server.address() as import('node:net').AddressInfo).port}/api/v1`;
  const sign = (userId: string, role: string) => jwt.sign({ userId, role }, ENV.JWT_SECRET, { expiresIn: '1h' });
  const professor = sign('usr_prof_alan', 'PROFESSOR'), john = sign('usr_location_student', 'STUDENT'), emily = sign('usr_location_outsider', 'STUDENT');
  const request = (path: string, token: string, body?: unknown) => fetch(base + path, { method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const location = { latitude: 11.0, longitude: 76.0, accuracy: 8, timestamp: Date.now(), radiusMeters: 100 };
  try {
    const initial = await request('/sessions/for-slot/slot_location_test', john);
    assert.equal(initial.status, 200);
    assert.equal((await initial.json() as any).sessionActive, false);
    assert.equal((await request('/attendance/student-qr?sessionId=slot_location_test', john)).status, 409);
    assert.equal((await request('/sessions/launch-slot', john, { slotId: 'slot_location_test', location })).status, 403);
    for (const point of [{ ...location, latitude: 999 }, { ...location, accuracy: 300 }, { ...location, mocked: true }, { ...location, timestamp: Date.now() - 90000 }, { ...location, radiusMeters: 999 }]) {
      assert.equal((await request('/sessions/launch-slot', professor, { slotId: 'slot_location_test', location: point })).status, 400);
    }
    const launched = await request('/sessions/launch-slot', professor, { slotId: 'slot_location_test', location });
    assert.equal(launched.status, 201);
    const { sessionId } = await launched.json() as any;
    const again = await request('/sessions/launch-slot', professor, { slotId: 'slot_location_test', location: { ...location, latitude: 12, radiusMeters: 25 } });
    assert.equal((await again.json() as any).sessionId, sessionId);
    const stored = (await db.query('SELECT origin_latitude, origin_radius_meters FROM sessions WHERE id = $1', [sessionId])).rows[0];
    assert.equal(stored.origin_latitude, 11);
    assert.equal(stored.origin_radius_meters, 100, 'Refreshing or reopening must not move the original center/radius.');
    assert.equal((await request('/sessions/for-slot/slot_location_test', emily)).status, 403);
    assert.equal((await request(`/attendance/student-qr?sessionId=${sessionId}`, emily)).status, 403);
    const passResponse = await request('/attendance/student-qr?sessionId=slot_location_test', john);
    assert.equal(passResponse.status, 200);
    const pass = await passResponse.json() as any;
    assert.equal(pass.sessionId, sessionId);
    assert.match(pass.dataUrl, /^data:image\/png;base64,/);
    assert.ok(pass.expiresAt * 1000 > Date.now());
    assert.equal(QrService.verifyPayload(pass.qrPayload, sessionId, 'STUDENT_PERSONAL').isValid, true);
    const flow = await (await request(`/flows/student?sessionId=${sessionId}`, john)).json() as any;
    assert.equal(flow.policy.maxDistanceMeters, 100);
    assert.equal(flow.steps.find((s: any) => s.type === 'GEOLOCATION_CHECK').metadata.targetLatitude, 11);
    const attempt = (latitude: number, accuracy = 8) => PolicyService.evaluateAttempt('usr_location_student', { sessionId, declarationAccepted: true, clientTimestamp: new Date().toISOString(), qrPayload: QrService.generateSessionBroadcastPayload(sessionId, 60).payload, coordinates: { latitude, longitude: 76, accuracy } });
    const outside = await attempt(11.01);
    assert.equal(outside.decision, 'REJECT');
    assert.match(outside.decisionReason, /exceeds classroom geofence/, 'The professor origin must be the center actually enforced.');
    // Remove the deliberate far-away sample so velocity detection does not obscure the next spatial assertion.
    await db.query('UPDATE attendance_attempts SET submitted_latitude = NULL, submitted_longitude = NULL WHERE session_id = $1', [sessionId]);
    const poor = await attempt(11, 300);
    assert.equal(poor.decision, 'REJECT');
    assert.match(poor.decisionReason, /GPS accuracy too poor/);
    const accepted = await attempt(11);
    assert.equal(accepted.decision, 'ACCEPT', JSON.stringify(accepted));
    let context = await (await request('/sessions/for-slot/slot_location_test', john)).json() as any;
    assert.equal(context.attendanceStatus, 'MARKED');
    const timetable = await (await request('/timetable/my', john)).json() as any;
    assert.equal(timetable.slots.find((s: any) => s.id === 'slot_location_test').attendanceStatus, 'MARKED');
    await db.query("UPDATE attendance_records SET status = 'CHALLENGED' WHERE session_id = $1", [sessionId]);
    context = await (await request('/sessions/for-slot/slot_location_test', john)).json() as any;
    assert.equal(context.attendanceStatus, 'PENDING');
    const scan = await request('/attendance/professor-scan', professor, { sessionId, studentQrPayload: pass.qrPayload });
    assert.equal(scan.status, 200, await scan.text());
    context = await (await request('/sessions/for-slot/slot_location_test', john)).json() as any;
    assert.equal(context.attendanceStatus, 'MARKED', 'A professor scanning the pass must update the student status.');
    await db.query("UPDATE sessions SET status = 'COMPLETED' WHERE id = $1", [sessionId]);
    assert.equal((await request(`/attendance/student-qr?sessionId=${sessionId}`, john)).status, 409);
    console.log('  ✓ Fixed professor origin, radius enforcement, personal QR, live marked/pending status and ownership passed');
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
}
