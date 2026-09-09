import assert from 'assert';
import { getDb } from '../src/database/db.js';
import { FlowService } from '../src/services/flow.service.js';
import { PolicyService } from '../src/services/policy.service.js';
import { QrService } from '../src/services/qr.service.js';
import { AnalyticsService } from '../src/services/analytics.service.js';
import { AttendanceDecision } from '../src/config/constants.js';

export async function testPolicyAndFlow(): Promise<void> {
  console.log('\n--- Running Test Suite: Layer 4 & SDUI - Policy Engine, Server-Driven UI & Analytics ---');

  const sessionId = 'sess_cs101_active';
  const studentId = 'usr_student_john';
  const professorId = 'usr_prof_alan';

  // 1. Server-Driven UI Contract for Mobile Client
  const mobileFlow = await FlowService.generateStudentFlow(sessionId, studentId, {
    hasHardwareGps: true,
    hasCamera: true,
    platform: 'android'
  });
  assert(mobileFlow.steps.length >= 3, 'Mobile flow must contain declaration, qr scan, and gps check');
  assert(mobileFlow.steps.some((s) => s.type === 'DECLARATION'));
  assert(mobileFlow.steps.some((s) => s.type === 'QR_SCANNER'));
  assert(mobileFlow.steps.some((s) => s.type === 'GEOLOCATION_CHECK'));
  console.log(`  ✓ Generated dynamic Server-Driven UI contract for Mobile (${mobileFlow.steps.length} steps configured)`);

  // 2. Server-Driven UI Contract for Desktop Client (No GPS)
  const desktopFlow = await FlowService.generateStudentFlow(sessionId, studentId, {
    hasHardwareGps: false,
    hasCamera: true,
    platform: 'web_desktop'
  });
  assert(desktopFlow.steps.some((s) => s.type === 'REVERSE_QR_DISPLAY'), 'Desktop flow must adapt to reverse QR display');
  assert(!desktopFlow.steps.some((s) => s.type === 'GEOLOCATION_CHECK'), 'Desktop flow must omit mobile GPS check');
  console.log('  ✓ Server-Driven UI dynamically adapted flow for sensor-constrained desktop client');

  // 3. End-to-End Successful Attendance Attempt (ACCEPT)
  const { payload: validQr } = QrService.generateSessionBroadcastPayload(sessionId, 20);
  const acceptResult = await PolicyService.evaluateAttempt(studentId, {
    sessionId,
    clientTimestamp: new Date().toISOString(),
      declarationAccepted: true,
    qrPayload: validQr,
    coordinates: {
      latitude: 12.971600, // inside Turing Hall (12.971598, 77.594562)
      longitude: 77.594565,
      accuracy: 10.0
    },
    telemetry: {
      isFromMockProvider: false,
      isMock: false
    }
  });

  assert.strictEqual(acceptResult.decision, AttendanceDecision.ACCEPT, `Expected ACCEPT, got ${acceptResult.decision}`);
  assert(acceptResult.attendanceRecordId, 'Attendance record must be generated');
  console.log('  ✓ Full 5-layer pipeline accepted genuine attendance attempt (status: ACCEPT)');

  // 4. Replay Attack Detection (REJECT)
  const replayResult = await PolicyService.evaluateAttempt(studentId, {
    sessionId,
    clientTimestamp: new Date().toISOString(),
      declarationAccepted: true,
    qrPayload: validQr, // same QR payload re-submitted
    coordinates: {
      latitude: 12.971600,
      longitude: 77.594565,
      accuracy: 10.0
    }
  });
  assert.strictEqual(replayResult.decision, AttendanceDecision.REJECT);
  assert(replayResult.decisionReason.includes('REPLAY'));
  console.log('  ✓ Replay attack with intercepted QR token rejected (status: REJECT)');

  // 5. Spoofed GPS Detection (REJECT)
  const { payload: freshQr2 } = QrService.generateSessionBroadcastPayload(sessionId, 20);
  const spoofResult = await PolicyService.evaluateAttempt(studentId, {
    sessionId,
    clientTimestamp: new Date().toISOString(),
      declarationAccepted: true,
    qrPayload: freshQr2,
    coordinates: {
      latitude: 12.971600,
      longitude: 77.594565,
      accuracy: 10.0
    },
    telemetry: {
      isFromMockProvider: true, // Android mock provider flag set!
      mockAppDetected: true,
      mockAppNames: ['FakeGpsPro']
    }
  });
  assert.strictEqual(spoofResult.decision, AttendanceDecision.REJECT);
  assert(spoofResult.decisionReason.includes('MOCK_LOCATION'));
  console.log('  ✓ Spoofed GPS telemetry with mock provider flagged and rejected (status: REJECT)');

  const db = await getDb();
  await db.query('DELETE FROM attendance_records WHERE session_id = $1 AND student_id = $2', [sessionId, studentId]);
  // 6. Borderline Distance Attempt (CHALLENGE State)
  const { payload: freshQr3 } = QrService.generateSessionBroadcastPayload(sessionId, 20);
  const challengeResult = await PolicyService.evaluateAttempt(studentId, {
    sessionId,
    clientTimestamp: new Date().toISOString(),
      declarationAccepted: true,
    qrPayload: freshQr3,
    coordinates: {
      latitude: 12.971860, // ~31m away, slightly above 25m radius but within 10m margin
      longitude: 77.594565,
      accuracy: 12.0
    },
    telemetry: { isFromMockProvider: false }
  });
  assert.strictEqual(challengeResult.decision, AttendanceDecision.CHALLENGE, `Expected CHALLENGE, got ${challengeResult.decision}`);
  console.log('  ✓ Borderline signal discrepancy gracefully escalated to CHALLENGE state');

  // 7. Professor Resolves Challenge
  const resolveOutcome = await PolicyService.resolveChallenge(
    professorId,
    challengeResult.attemptId,
    'ACCEPT',
    'Student verified in person by professor in row 3.'
  );
  assert.strictEqual(resolveOutcome.success, true);
  assert.strictEqual(resolveOutcome.status, 'PRESENT');
  console.log('  ✓ Professor 1-click review resolved challenge to PRESENT');

  // 8. Bidirectional Reverse Scan (Student QR scanned by Professor)
  const studentPersonalQr = QrService.generateStudentPersonalPayload(sessionId, 'usr_student_sarah', 30);
  const profScanResult = await PolicyService.processProfessorScan(
    professorId,
    sessionId,
    studentPersonalQr.payload
  );
  assert.strictEqual(profScanResult.decision, AttendanceDecision.ACCEPT);
  console.log('  ✓ Reverse Roster Scan: Professor directly scanned student personal dynamic QR');

  // 9. Analytics Query via Materialized Views
  const studentAnalytics = await AnalyticsService.getStudentAttendanceSummary(studentId);
  assert(studentAnalytics.length > 0, 'Analytics summary must return enrolled courses');
  const cs101Stats = studentAnalytics.find((c) => c.courseCode === 'CS101');
  assert(cs101Stats, 'CS101 stats must be present');
  console.log(`  ✓ High-speed analytics query: Student attendance percentage = ${cs101Stats.attendancePercentage}% (sessions held: ${cs101Stats.totalSessionsHeld}, attended: ${cs101Stats.attendedSessions})`);
}
