import assert from 'assert';
import { QrService } from '../src/services/qr.service.js';

export async function testQrLayer(): Promise<void> {
  console.log('\n--- Running Test Suite: Layer 1 - Cryptographic QR & Replay Prevention ---');

  const sessionId = 'sess_cs101_active';
  const studentId = 'usr_student_john';

  // 1. Generate Broadcast QR
  const { payload, tokenObj } = QrService.generateSessionBroadcastPayload(sessionId, 20);
  assert(payload && payload.length > 20, 'QR payload must be a non-empty string');
  assert.strictEqual(tokenObj.sessionId, sessionId, 'Session ID must match in token');
  assert.strictEqual(tokenObj.type, 'SESSION_BROADCAST', 'Token type must be SESSION_BROADCAST');
  console.log('  ✓ Generated valid signed cryptographic session broadcast QR payload');

  // 2. Verify Valid QR
  const verifyRes = QrService.verifyPayload(payload, sessionId, 'SESSION_BROADCAST');
  assert.strictEqual(verifyRes.isValid, true, 'Valid payload must pass verification');
  assert(verifyRes.token, 'Verified token must be present');
  console.log('  ✓ Verified genuine HMAC-SHA256 signature and timestamp');

  // 3. Verify Session Mismatch Rejection
  const mismatchRes = QrService.verifyPayload(payload, 'wrong_session_id', 'SESSION_BROADCAST');
  assert.strictEqual(mismatchRes.isValid, false, 'Mismatched session must fail verification');
  assert.strictEqual(mismatchRes.reason, 'SESSION_MISMATCH');
  console.log('  ✓ Successfully rejected QR token for wrong session ID');

  // 4. Verify Forged Signature Rejection
  const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
  decoded.signature = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const forgedPayload = Buffer.from(JSON.stringify(decoded)).toString('base64url');
  const forgedRes = QrService.verifyPayload(forgedPayload, sessionId, 'SESSION_BROADCAST');
  assert.strictEqual(forgedRes.isValid, false, 'Forged signature must fail verification');
  assert.strictEqual(forgedRes.reason, 'FORGED_CRYPTOGRAPHIC_SIGNATURE');
  console.log('  ✓ Successfully detected and rejected forged HMAC signature');

  // 5. Verify Expired QR Rejection
  const expiredGen = QrService.generateSessionBroadcastPayload(sessionId, -5); // already expired 5s ago
  const expiredRes = QrService.verifyPayload(expiredGen.payload, sessionId, 'SESSION_BROADCAST', 0);
  assert.strictEqual(expiredRes.isValid, false, 'Expired QR must fail verification');
  assert.strictEqual(expiredRes.reason, 'EXPIRED_QR_TOKEN');
  console.log('  ✓ Successfully rejected expired time-bound QR token');

  // 6. Test Nonce Replay Prevention
  const freshNonce = `test_nonce_${Date.now()}_${Math.random()}`;
  const firstUse = await QrService.checkAndConsumeNonce(freshNonce, sessionId, studentId, Math.floor(Date.now() / 1000) + 60);
  assert.strictEqual(firstUse.isFresh, true, 'Fresh nonce must be accepted');

  const replayedUse = await QrService.checkAndConsumeNonce(freshNonce, sessionId, studentId, Math.floor(Date.now() / 1000) + 60);
  assert.strictEqual(replayedUse.isFresh, false, 'Replayed nonce must be rejected');
  assert.strictEqual(replayedUse.reason, 'REPLAY_ATTACK_NONCE_ALREADY_USED');
  console.log('  ✓ Cryptographic nonce tracking successfully prevented replay attack');

  // 7. Test Student Reverse QR Generation
  const studentQr = QrService.generateStudentPersonalPayload(sessionId, studentId, 30);
  assert.strictEqual(studentQr.tokenObj.type, 'STUDENT_PERSONAL');
  assert.strictEqual(studentQr.tokenObj.studentId, studentId);
  const studentVerify = QrService.verifyPayload(studentQr.payload, sessionId, 'STUDENT_PERSONAL');
  assert.strictEqual(studentVerify.isValid, true);
  console.log('  ✓ Reverse Roster Dynamic Student QR generated and validated');

  // 8. Test QR Rendering (DataURL & SVG)
  const dataUrl = await QrService.renderQrCode(payload, 'dataUrl');
  assert(typeof dataUrl === 'string' && dataUrl.startsWith('data:image/png;base64,'), 'Must render valid data URL');
  const svg = await QrService.renderQrCode(payload, 'svg');
  assert(typeof svg === 'string' && svg.includes('<svg'), 'Must render valid SVG');
  console.log('  ✓ QR Code image export (PNG DataURL & SVG) rendered successfully');
}
