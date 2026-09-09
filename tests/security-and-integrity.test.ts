import assert from 'node:assert/strict';
import http from 'node:http';
import jwt from 'jsonwebtoken';
import { WebSocket } from 'ws';
import { createApp } from '../src/app.js';
import { getDb, withTransaction } from '../src/database/db.js';
import { ENV } from '../src/config/env.js';
import { runMigrations } from '../src/database/migrate.js';
import { PolicyService } from '../src/services/policy.service.js';
import { QrService } from '../src/services/qr.service.js';
import { SessionSocketServer } from '../src/websocket/session-socket.js';

export async function testSecurityAndIntegrity(): Promise<void> {
  console.log('\n--- Running Security & Integrity Regression Suite ---');
  assert.equal(ENV.NODE_ENV, 'test', 'Regression tests require isolated database mode.');
  const db = await getDb();
  const sessionId = 'sess_cs101_active';
  const john = 'usr_student_john', sarah = 'usr_student_sarah';
  const qr = QrService.generateSessionBroadcastPayload(sessionId);
  assert.equal((await QrService.checkAndConsumeNonce(qr.tokenObj.nonce, sessionId, john, qr.tokenObj.exp)).isFresh, true);
  assert.equal((await QrService.checkAndConsumeNonce(qr.tokenObj.nonce, sessionId, sarah, qr.tokenObj.exp)).isFresh, true, 'A broadcast must work for a second student.');
  assert.equal((await QrService.checkAndConsumeNonce(qr.tokenObj.nonce, sessionId, john, qr.tokenObj.exp)).isFresh, false);
  const race = QrService.generateSessionBroadcastPayload(sessionId);
  const concurrent = await Promise.all([1, 2].map(() => QrService.checkAndConsumeNonce(race.tokenObj.nonce, sessionId, john, race.tokenObj.exp)));
  assert.equal(concurrent.filter(r => r.isFresh).length, 1);

  const rolledBack = QrService.generateSessionBroadcastPayload(sessionId);
  await assert.rejects(PolicyService.evaluateAttempt(john, {
    sessionId, declarationAccepted: true, clientTimestamp: new Date().toISOString(), qrPayload: rolledBack.payload,
    deviceId: 'x'.repeat(101), coordinates: { latitude: 12.9716, longitude: 77.594565, accuracy: 10 }
  }));
  assert.equal((await db.query('SELECT 1 FROM used_qr_nonces WHERE nonce = $1', [rolledBack.tokenObj.nonce])).rows.length, 0, 'Failed writes must roll back nonce consumption.');
  await assert.rejects(withTransaction(async () => { const tx = await getDb(); await tx.query("UPDATE users SET full_name = 'rollback' WHERE id = $1", [john]); throw new Error('rollback'); }));
  assert.notEqual((await db.query('SELECT full_name FROM users WHERE id = $1', [john])).rows[0].full_name, 'rollback');

  const ended = QrService.generateStudentPersonalPayload('sess_cs101_yesterday', john);
  await assert.rejects(PolicyService.processProfessorScan('usr_prof_alan', 'sess_cs101_yesterday', ended.payload), /not active/);
  const unknown = QrService.generateStudentPersonalPayload('missing-session', john);
  await assert.rejects(PolicyService.processProfessorScan('usr_prof_alan', 'missing-session', unknown.payload), /not found/);
  const bioSession = 'sess_cs201_active';
  const enrolled = await db.query("SELECT 1 FROM enrollments WHERE course_id = 'crs_cs201' AND student_id = $1", [john]);
  if (!enrolled.rows.length) await db.query("INSERT INTO enrollments (id, course_id, student_id, status) VALUES ('enr_regression', 'crs_cs201', $1, 'ACTIVE')", [john]);
  const proxyQr = QrService.generateStudentPersonalPayload(bioSession, john);
  const proxy = await PolicyService.processProfessorScan('usr_prof_alan', bioSession, proxyQr.payload);
  assert.equal(proxy.decision, 'ACCEPT');
  assert.equal((await db.query('SELECT marked_by FROM attendance_records WHERE attempt_id = $1', [proxy.attemptId])).rows[0].marked_by, 'PROFESSOR_OUT_OF_BATCH');

  const countBefore = (await db.query('SELECT COUNT(*)::int AS count FROM schema_migrations')).rows[0].count;
  await runMigrations();
  assert.equal((await db.query('SELECT COUNT(*)::int AS count FROM schema_migrations')).rows[0].count, countBefore);

  const server = http.createServer(createApp());
  SessionSocketServer.init(server);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as import('node:net').AddressInfo).port;
  const token = (id: string, role: string) => jwt.sign({ userId: id, role, email: 'test', fullName: 'Test' }, ENV.JWT_SECRET, { expiresIn: '1h' });
  const studentToken = token(john, 'STUDENT');
  const adminToken = token('usr_admin', 'ADMIN');
  const call = (path: string, bearer?: string, body?: unknown, method?: string) => fetch(`http://127.0.0.1:${port}/api/v1${path}`, {
    method: method || (body ? 'POST' : 'GET'), headers: { 'Content-Type': 'application/json', ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}) }, body: body ? JSON.stringify(body) : undefined
  });
  const subscribe = (subscription: object) => new Promise<any>((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    const timer = setTimeout(() => { ws.terminate(); reject(new Error('WebSocket response timed out')); }, 3000);
    ws.on('open', () => ws.send(JSON.stringify({ type: 'SUBSCRIBE', ...subscription })));
    ws.once('message', data => { clearTimeout(timer); ws.close(); resolve(JSON.parse(data.toString())); });
    ws.on('error', reject);
  });
  try {
    assert.equal((await call('/auth/register', undefined, { role: 'ADMIN' })).status, 401);
    assert.equal((await call('/auth/register', studentToken, { role: 'ADMIN' })).status, 403);
    assert.equal((await call('/auth/face-embedding', studentToken, { embedding: [1] }, 'PUT')).status, 403);
    for (const path of ['/attendance/records', '/attendance/attempts']) {
      const response = await call(path, studentToken);
      assert.equal(response.status, 200);
      const data: any = await response.json();
      assert.ok((data.records || data.attempts).every((row: any) => row.student_id === john));
    }
    assert.equal((await call(`/sessions/${sessionId}/qr-code`, studentToken)).status, 403);
    assert.equal((await call(`/sessions/${sessionId}/end`, token('usr_prof_ada', 'PROFESSOR'), {})).status, 403);
    assert.equal((await call(`/analytics/student/${sarah}`, studentToken)).status, 403);
    assert.equal((await call('/attendance/student-qr?sessionId=missing-session', studentToken)).status, 404);
    assert.equal((await subscribe({ sessionId })).type, 'ERROR');
    assert.equal((await subscribe({ sessionId, role: 'DISPLAY', token: studentToken })).type, 'ERROR');
    assert.equal((await subscribe({ sessionId: 'CAMPUS', token: adminToken })).type, 'SUBSCRIBED');

    const slot = (await db.query('SELECT id FROM timetable_slots WHERE batch_id IS NOT NULL LIMIT 1')).rows[0];
    assert.ok(slot);
    const launch: any = await (await call('/sessions/launch-slot', adminToken, { slotId: slot.id })).json();
    const again: any = await (await call('/sessions/launch-slot', adminToken, { slotId: slot.id })).json();
    assert.equal(launch.sessionId, again.sessionId, 'Repeated launch must reuse the active session.');
    const listed: any = await (await call('/sessions', adminToken)).json();
    assert.ok(listed.sessions.some((row: any) => row.id === launch.sessionId), 'Batch-only sessions must remain visible.');
    const summary: any = await (await call('/analytics/live-summary', adminToken)).json();
    assert.equal(typeof summary.checkInsToday, 'number');

    await db.query('DELETE FROM attendance_records WHERE session_id = $1 AND student_id = $2', [sessionId, john]);
    const challenge = await PolicyService.evaluateAttempt(john, { sessionId, declarationAccepted: true, clientTimestamp: new Date().toISOString(), qrPayload: QrService.generateSessionBroadcastPayload(sessionId).payload });
    assert.equal(challenge.decision, 'CHALLENGE');
    await assert.rejects(PolicyService.resolveChallenge('usr_prof_ada', challenge.attemptId, 'ACCEPT'), /access/);
    await PolicyService.resolveChallenge('usr_prof_alan', challenge.attemptId, 'ACCEPT');
    await assert.rejects(PolicyService.resolveChallenge('usr_prof_alan', challenge.attemptId, 'REJECT'), /pending challenges/);
    const nonmember = 'usr_regression_nonmember';
    await db.query("INSERT INTO users (id, email, password_hash, full_name, role) VALUES ($1, 'nonmember@test.edu', 'test', 'Nonmember', 'STUDENT')", [nonmember]);
    await assert.rejects(PolicyService.processProfessorScan('usr_prof_alan', sessionId, QrService.generateStudentPersonalPayload(sessionId, nonmember).payload), /access/);
    assert.equal((await db.query('SELECT 1 FROM attendance_records WHERE student_id = $1', [nonmember])).rows.length, 0);
    // Neither an arbitrary telemetry IP nor a forged forwarded header grants network presence.
    await db.query("UPDATE classrooms SET allowed_ip_subnets = ARRAY['10.77.77.0/24'] WHERE id = 'clr_turing_hall'");
    const fakeIp = await fetch(`http://127.0.0.1:${port}/api/v1/attendance/attempt`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}`, 'X-Forwarded-For': '10.77.77.9' },
      body: JSON.stringify({ sessionId, declarationAccepted: true, clientTimestamp: new Date().toISOString(), qrPayload: QrService.generateSessionBroadcastPayload(sessionId).payload, telemetry: { clientIp: '10.77.77.9' } })
    });
    assert.equal(fakeIp.status, 202, 'Spoofed IP must not bypass professor review.');
    const forgedRole = token(john, 'ADMIN');
    assert.equal((await call('/auth/register', forgedRole, { role: 'ADMIN' })).status, 403, 'Current database role must override stale JWT claims.');
    console.log('  ✓ Security, QR sharing, transaction rollback, migrations, WebSockets, and session integration regressions passed');
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
}
