import assert from 'node:assert/strict';
import http from 'node:http';
import jwt from 'jsonwebtoken';
import { WebSocket } from 'ws';
import { createApp } from '../src/app.js';
import { getDb } from '../src/database/db.js';
import { ENV } from '../src/config/env.js';
import { QrService } from '../src/services/qr.service.js';
import { DisplayService } from '../src/services/display.service.js';
import { SessionSocketServer } from '../src/websocket/session-socket.js';

export async function testClassroomDisplay(): Promise<void> {
  console.log('\n--- Classroom Display Pairing Tests ---');
  assert.equal(ENV.NODE_ENV, 'test');
  const db = await getDb();
  const sessionId = 'sess_cs101_active';
  const server = http.createServer(createApp());
  SessionSocketServer.init(server);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as import('node:net').AddressInfo).port;
  const base = `http://127.0.0.1:${port}`;
  const sign = (userId: string, role: string) => jwt.sign({ userId, role, email: 'test', fullName: 'Test' }, ENV.JWT_SECRET, { expiresIn: '1h' });
  const professor = sign('usr_prof_alan', 'PROFESSOR'), otherProfessor = sign('usr_prof_ada', 'PROFESSOR');
  const request = (path: string, token?: string, body?: unknown, method?: string) => fetch(base + '/api/v1' + path, { method: method || (body ? 'POST' : 'GET'), headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  let ws: WebSocket | undefined;
  try {
    const page = await fetch(base + '/display/');
    assert.equal(page.status, 200);
    assert.match(page.headers.get('content-security-policy') || '', /frame-ancestors 'none'/);
    assert.match(await page.text(), /Connect your classroom/);
    const created = await request('/display/pairing', undefined, {});
    assert.equal(created.status, 201);
    const pairing: any = await created.json();
    assert.equal(pairing.code.length, 8);
    assert.equal((await request('/display/state')).status, 401);
    const waiting: any = await (await request('/display/state', pairing.deviceSecret)).json();
    assert.equal(waiting.status, 'WAITING');
    assert.equal((await request(`/display/sessions/${sessionId}/pair`, sign('usr_student_john', 'STUDENT'), { code: pairing.code })).status, 403);
    assert.equal((await request(`/display/sessions/${sessionId}/pair`, otherProfessor, { code: pairing.code })).status, 403);
    assert.equal((await request(`/display/sessions/${sessionId}/pair`, professor, { code: pairing.code })).status, 200);
    assert.equal((await request(`/display/sessions/${sessionId}/pair`, professor, { code: pairing.code })).status, 409);
    const paired: any = await (await request('/display/state', pairing.deviceSecret)).json();
    assert.equal(paired.status, 'PAIRED');
    assert.equal(paired.sessionId, sessionId);
    assert.equal((await request('/auth/me', paired.displayToken)).status, 403, 'Display token cannot access normal account APIs.');
    assert.equal(DisplayService.verifyToken(paired.displayToken).sessionId, sessionId);
    const messages: any[] = [];
    ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    const qr: any = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Display QR timed out.')), 3000);
      ws!.on('open', () => ws!.send(JSON.stringify({ type: 'SUBSCRIBE_DISPLAY', token: paired.displayToken })));
      ws!.on('message', data => { const message = JSON.parse(data.toString()); messages.push(message); if (message.type === 'QR_ROTATION') { clearTimeout(timeout); resolve(message); } });
      ws!.on('error', reject);
    });
    assert.equal(QrService.verifyPayload(qr.qrPayload, sessionId, 'SESSION_BROADCAST').isValid, true);
    SessionSocketServer.broadcastCheckIn(sessionId, { studentName: 'Private student name', status: 'PRESENT' });
    await new Promise(resolve => setTimeout(resolve, 50));
    assert.ok(!messages.some(message => message.type === 'STUDENT_CHECK_IN'), 'Display sockets must never receive student records.');
    await request(`/display/sessions/${sessionId}/pair`, professor, undefined, 'DELETE');
    assert.equal((await request('/display/state', pairing.deviceSecret)).status, 410);
    await assert.rejects(DisplayService.validatePairing(DisplayService.verifyToken(paired.displayToken).pairingId, sessionId));
    const expired: any = await (await request('/display/pairing', undefined, {})).json();
    await db.query("UPDATE classroom_displays SET expires_at = CURRENT_TIMESTAMP - INTERVAL '1 second' WHERE session_id IS NULL");
    assert.equal((await request(`/display/sessions/${sessionId}/pair`, professor, { code: expired.code })).status, 409);
    console.log('  ✓ Browser page, pairing ownership, one-time codes, expiry, revocation, live QR and display privacy passed');
  } finally {
    ws?.terminate();
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
}
