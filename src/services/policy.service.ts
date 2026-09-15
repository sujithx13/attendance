import { ScheduleService } from './schedule.service.js';
import { getDb, withTransaction, afterCommit } from '../database/db.js';
import { requireSessionAccess, httpError } from './access.service.js';
import { UserRole } from '../config/constants.js';
import {
  AttendanceAttemptPayload,
  AttemptEvaluationResult,
  ValidationDiagnostics
} from '../types/attempt.types.js';
import {
  AttendanceDecision,
  AttendanceRecordStatus,
  SessionStatus,
  ViolationType
} from '../config/constants.js';
import { QrService } from './qr.service.js';
import { SpatialService } from './spatial.service.js';
import { TelemetryService } from './telemetry.service.js';
import { BiometricService } from './biometric.service.js';
import { VerificationPolicy } from '../types/flow.types.js';
import { DEFAULT_VERIFICATION_POLICY } from '../config/constants.js';
import { SessionSocketServer } from '../websocket/session-socket.js';

export class PolicyService {
  /**
   * Evaluates an incoming Attendance Attempt through all 5 layers of verification
   * and produces an immutable audit record and finalized decision.
   */
  static async evaluateAttempt(
    studentId: string,
    payload: AttendanceAttemptPayload
  ): Promise<AttemptEvaluationResult> {
    await ScheduleService.sync();
    return withTransaction(() => this.evaluateInTransaction(studentId, payload));
  }

  private static async evaluateInTransaction(studentId: string, payload: AttendanceAttemptPayload): Promise<AttemptEvaluationResult> {
    if (payload.coordinates && (!Number.isFinite(payload.coordinates.latitude) || !Number.isFinite(payload.coordinates.longitude) || !Number.isFinite(payload.coordinates.accuracy) || Math.abs(payload.coordinates.latitude) > 90 || Math.abs(payload.coordinates.longitude) > 180 || payload.coordinates.accuracy < 0)) {
      throw httpError(400, 'Invalid GPS coordinates or accuracy.');
    }
    const db = await getDb();
    const attemptId = `att_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const serverTimestamp = new Date();

    // 1. Fetch Session, Course/Batch, Classroom & Policy
    const sessionRes = await db.query(
      `SELECT s.*,
              c.code AS course_code, c.name AS course_name,
              b.code AS batch_code, b.name AS batch_name,
              clr.latitude, clr.longitude, clr.radius_meters, clr.allowed_ip_subnets, clr.ble_beacon_ids,
              u.full_name AS student_name, u.enrollment_id, u.photo_url, u.face_embedding
       FROM sessions s
       LEFT JOIN courses c ON s.course_id = c.id
       LEFT JOIN batches b ON s.batch_id = b.id
       JOIN classrooms clr ON s.classroom_id = clr.id
       LEFT JOIN users u ON u.id = $1
       WHERE s.id = $2 FOR SHARE OF s`,
      [studentId, payload.sessionId]
    );

    if (sessionRes.rows.length === 0) {
      throw new Error(`Session ${payload.sessionId} not found.`);
    }

    const sessionData = sessionRes.rows[0];
    const policy: VerificationPolicy = {
      ...DEFAULT_VERIFICATION_POLICY,
      ...(sessionData.verification_policy_override || {})
    };
    // GPS attendance checks are temporarily disabled by product request.
    policy.requiresGps = false;
    if (policy.declarationRequired && payload.declarationAccepted !== true) throw httpError(400, 'Confirm the physical presence declaration before submitting attendance.');

    // Initialize diagnostics
    const diagnostics: ValidationDiagnostics = {
      enrollmentCheck: { passed: false, message: 'Pending' },
      sessionStateCheck: { passed: false, message: 'Pending' },
      qrVerification: { passed: false, message: 'Pending' },
      replayPrevention: { passed: false, message: 'Pending' },
      spatialCheck: { passed: false, message: 'Pending' },
      antiSpoofingCheck: { passed: false, message: 'Pending' },
      biometricCheck: { passed: false, omitted: true, message: 'Not required' }
    };

    let hardFailure = false;
    let challengeTriggered = false;
    let rejectionReason = '';
    let challengeReason = '';
    const pendingViolations: Array<{
      violationType: ViolationType;
      details: Record<string, any>;
      severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    }> = [];

    // --- CHECK 1: Enrollment Check (Class Course OR Cohort Batch) ---
    if (sessionData.batch_id) {
      const batchMemberRes = await db.query(
        `SELECT id FROM batch_members WHERE batch_id = $1 AND student_id = $2`,
        [sessionData.batch_id, studentId]
      );
      if (batchMemberRes.rows.length === 0) {
        diagnostics.enrollmentCheck = { passed: false, message: 'Student is not enrolled in this batch.' };
        hardFailure = true;
        rejectionReason = 'STUDENT_NOT_IN_BATCH';
        pendingViolations.push({
          violationType: ViolationType.UNENROLLED_STUDENT,
          details: { batchId: sessionData.batch_id },
          severity: 'LOW'
        });
      } else {
        diagnostics.enrollmentCheck = { passed: true, message: 'Student actively enrolled in batch.' };
      }
    } else if (sessionData.course_id) {
      const enrollRes = await db.query(
        `SELECT id FROM enrollments WHERE course_id = $1 AND student_id = $2 AND status = 'ACTIVE'`,
        [sessionData.course_id, studentId]
      );

      if (enrollRes.rows.length === 0) {
        diagnostics.enrollmentCheck = { passed: false, message: 'Student is not enrolled in this course.' };
        hardFailure = true;
        rejectionReason = 'STUDENT_NOT_ENROLLED';
        pendingViolations.push({
          violationType: ViolationType.UNENROLLED_STUDENT,
          details: { courseId: sessionData.course_id },
          severity: 'LOW'
        });
      } else {
        diagnostics.enrollmentCheck = { passed: true, message: 'Student actively enrolled.' };
      }
    } else {
      diagnostics.enrollmentCheck = { passed: true, message: 'Open session enrollment verified.' };
    }

    // --- CHECK 2: Session Active State Check ---
    if (sessionData.status !== SessionStatus.ACTIVE || new Date(sessionData.end_time) <= serverTimestamp) {
      diagnostics.sessionStateCheck = { passed: false, message: `Session is ${sessionData.status}, not ACTIVE.` };
      hardFailure = true;
      if (!rejectionReason) rejectionReason = `SESSION_${sessionData.status}`;
    } else {
      diagnostics.sessionStateCheck = { passed: true, message: 'Session is currently active.' };
    }

    // --- CHECK 3: Layer 1 - Cryptographic QR Verification & Nonce Replay Prevention ---
    let verifiedToken: any = null;
    if (policy.requiresQr && !hardFailure) {
      if (!payload.qrPayload) {
        diagnostics.qrVerification = { passed: false, message: 'Missing QR code payload.' };
        hardFailure = true;
        rejectionReason = 'MISSING_QR_PAYLOAD';
      } else {
        const qrResult = QrService.verifyPayload(payload.qrPayload, payload.sessionId, 'SESSION_BROADCAST');
        if (!qrResult.isValid) {
          diagnostics.qrVerification = { passed: false, message: `QR verification failed: ${qrResult.reason}` };
          hardFailure = true;
          rejectionReason = qrResult.reason || 'INVALID_QR';
          const violationType = qrResult.reason?.includes('FORGED')
            ? ViolationType.FORGED_QR_SIGNATURE
            : ViolationType.EXPIRED_QR_TOKEN;
          pendingViolations.push({
            violationType,
            details: { qrPayload: payload.qrPayload, reason: qrResult.reason },
            severity: 'HIGH'
          });
        } else {
          verifiedToken = qrResult.token;
          diagnostics.qrVerification = {
            passed: true,
            message: 'Cryptographic signature and timestamp freshness verified.',
            isExported: verifiedToken.isExported
          };

          // Replay check
          const nonceRes = await QrService.checkAndConsumeNonce(
            verifiedToken.nonce,
            payload.sessionId,
            studentId,
            verifiedToken.exp
          );

          if (!nonceRes.isFresh) {
            diagnostics.replayPrevention = { passed: false, message: 'Duplicate attempt with already used QR nonce.', nonce: verifiedToken.nonce };
            hardFailure = true;
            rejectionReason = 'REPLAY_ATTACK_NONCE_REUSED';
            pendingViolations.push({
              violationType: ViolationType.REPLAY_ATTACK,
              details: { nonce: verifiedToken.nonce },
              severity: 'CRITICAL'
            });
          } else {
            diagnostics.replayPrevention = { passed: true, message: 'QR nonce is fresh and recorded.', nonce: verifiedToken.nonce };
          }
        }
      }
    } else {
      diagnostics.qrVerification = { passed: true, message: 'QR check omitted by policy.' };
      diagnostics.replayPrevention = { passed: true, message: 'Replay check omitted.' };
    }

    // --- CHECK 4: Layer 3 - Anti-Spoofing & Mock Location Detection ---
    if (!hardFailure) {
      const spoofResult = TelemetryService.inspectClientTelemetry(payload.telemetry);
      if (!spoofResult.passed) {
        diagnostics.antiSpoofingCheck = {
          passed: false,
          message: spoofResult.message,
          flagsDetected: spoofResult.flagsDetected
        };
        hardFailure = true;
        rejectionReason = 'MOCK_LOCATION_DETECTED';
        pendingViolations.push({
          violationType: ViolationType.MOCK_LOCATION_DETECTED,
          details: { telemetry: payload.telemetry, flags: spoofResult.flagsDetected },
          severity: 'CRITICAL'
        });
      } else {
        diagnostics.antiSpoofingCheck = { passed: true, message: spoofResult.message };
      }

      // Check velocity anomaly if coordinates provided
      if (policy.requiresGps && !hardFailure && payload.coordinates) {
        const velResult = await TelemetryService.checkVelocityAnomaly(
          studentId,
          payload.coordinates.latitude,
          payload.coordinates.longitude,
          serverTimestamp
        );
        if (!velResult.passed) {
          diagnostics.antiSpoofingCheck = {
            passed: false,
            message: velResult.message,
            flagsDetected: velResult.flagsDetected
          };
          hardFailure = true;
          rejectionReason = 'IMPOSSIBLE_TRAVEL_VELOCITY';
          pendingViolations.push({
            violationType: ViolationType.IMPOSSIBLE_VELOCITY,
            details: { coords: payload.coordinates },
            severity: 'HIGH'
          });
        }
      }
    }

    // --- CHECK 5: Layer 2 - Spatial & Geofence Validation ---
    let calculatedDistance: number | undefined;
    if (policy.requiresGps && !hardFailure) {
      if (payload.coordinates && typeof payload.coordinates.latitude === 'number') {
        const spatialRes = SpatialService.validateGeofence(
          payload.coordinates.latitude,
          payload.coordinates.longitude,
          payload.coordinates.accuracy,
          Number(sessionData.origin_latitude ?? sessionData.latitude),
          Number(sessionData.origin_longitude ?? sessionData.longitude),
          policy.maxDistanceMeters || parseFloat(sessionData.radius_meters),
          policy.maxGpsAccuracyMeters
        );

        calculatedDistance = spatialRes.distanceMeters;

        diagnostics.spatialCheck = {
          passed: spatialRes.passed,
          message: spatialRes.message,
          distanceMeters: spatialRes.distanceMeters,
          maxAllowedMeters: spatialRes.maxAllowedMeters,
          accuracyMeters: spatialRes.accuracyMeters
        };

        if (!spatialRes.passed) {
          // Check if distance is borderline (within 10m buffer above geofence)
          const marginBuffer = 10.0;
          if (
            spatialRes.accuracyAcceptable &&
            spatialRes.distanceMeters <= spatialRes.maxAllowedMeters + marginBuffer
          ) {
            challengeTriggered = true;
            challengeReason = `GPS distance (${spatialRes.distanceMeters}m) slightly exceeds geofence (${spatialRes.maxAllowedMeters}m). Flagged for professor verification.`;
          } else {
            hardFailure = true;
            rejectionReason = spatialRes.message;
          }
        }
      } else {
        // Device lacks GPS coordinates (e.g. desktop/laptop browser)
        const clientIp = payload.telemetry?.clientIp || '';
        const allowedSubnets = sessionData.allowed_ip_subnets as string[] | undefined;

        if (sessionData.origin_radius_meters == null && allowedSubnets && allowedSubnets.length > 0) {
          const ipMatch = SpatialService.isIpInSubnets(clientIp, allowedSubnets);
          diagnostics.networkSubnetCheck = {
            passed: ipMatch,
            message: ipMatch ? 'Connected via approved classroom subnet.' : 'Not connected to classroom subnet.',
            clientIp
          };
          if (!ipMatch) {
            challengeTriggered = true;
            challengeReason = 'Desktop client without GPS not connected to approved classroom subnet.';
          }
        } else {
          // No GPS on device -> Escalate to CHALLENGE for professor 1-click confirmation
          challengeTriggered = true;
          challengeReason = 'Device submitted attempt without hardware GPS. Flagged for professor approval.';
          diagnostics.spatialCheck = {
            passed: false,
            omitted: true,
            message: 'Hardware GPS not available on client device.'
          };
        }
      }
    } else {
      diagnostics.spatialCheck = { passed: true, omitted: true, message: 'GPS geofencing omitted by policy.' };
    }

    // --- CHECK 6: Layer 5 - Multi-Factor Biometric Verification ---
    if (policy.requiresBle && !hardFailure) {
      const expected: string[] = sessionData.ble_beacon_ids || [];
      const detected = Array.isArray(payload.bleBeaconsDetected) ? payload.bleBeaconsDetected : [];
      if (!expected.length || !expected.some(id => detected.includes(id))) {
        challengeTriggered = true;
        challengeReason = 'Required classroom Bluetooth proximity could not be verified. Professor review required.';
      }
    }
    let biometricScore: number | undefined;
    let biometricPassed = false;
    if (policy.requiresBiometric && !hardFailure) {
      const bioRes = BiometricService.verifyFaceEmbedding(
        payload.biometricVector,
        sessionData.face_embedding
      );
      biometricScore = bioRes.similarityScore;
      biometricPassed = bioRes.passed;

      diagnostics.biometricCheck = {
        passed: bioRes.passed,
        omitted: false,
        similarityScore: bioRes.similarityScore,
        threshold: bioRes.threshold,
        message: bioRes.message
      };

      if (!bioRes.passed) {
        hardFailure = true;
        rejectionReason = bioRes.message;
        pendingViolations.push({
          violationType: ViolationType.BIOMETRIC_MISMATCH,
          details: { score: bioRes.similarityScore, threshold: bioRes.threshold },
          severity: 'HIGH'
        });
      }
    }

    // --- DETERMINE FINAL DECISION ---
    let decision: AttendanceDecision = AttendanceDecision.ACCEPT;
    let finalReason = 'All verification requirements successfully satisfied.';

    if (hardFailure) {
      decision = AttendanceDecision.REJECT;
      finalReason = rejectionReason;
    } else if (challengeTriggered) {
      decision = AttendanceDecision.CHALLENGE;
      finalReason = challengeReason;
    }

    // --- INSERT ATTEMPT LOG ---
    await db.query(
      `INSERT INTO attendance_attempts (
        id, session_id, student_id, device_id, client_timestamp, server_timestamp,
        submitted_qr_payload, submitted_latitude, submitted_longitude, submitted_accuracy,
        distance_meters, telemetry_data, ble_beacons_detected, biometric_match_score,
        biometric_verified, validation_results, decision, decision_reason
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
      [
        attemptId,
        payload.sessionId,
        studentId,
        payload.deviceId || null,
        payload.clientTimestamp ? new Date(payload.clientTimestamp) : null,
        serverTimestamp,
        payload.qrPayload || null,
        payload.coordinates?.latitude ?? null,
        payload.coordinates?.longitude ?? null,
        payload.coordinates?.accuracy ?? null,
        calculatedDistance ?? null,
        payload.telemetry ? JSON.stringify(payload.telemetry) : null,
        payload.bleBeaconsDetected || null,
        biometricScore || null,
        biometricPassed,
        JSON.stringify(diagnostics),
        decision,
        finalReason
      ]
    );

    // --- PERSIST RECORDED SECURITY VIOLATIONS (attemptId is now safely persisted in DB) ---
    for (const v of pendingViolations) {
      await TelemetryService.recordViolation(
        studentId,
        payload.sessionId,
        attemptId,
        v.violationType,
        v.details,
        v.severity
      );
    }

    // --- CREATE OFFICIAL ATTENDANCE RECORD IF ACCEPTED OR CHALLENGED ---
    let recordId: string | undefined;
    if (decision === AttendanceDecision.ACCEPT || decision === AttendanceDecision.CHALLENGE) {
      recordId = `rec_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const status = decision === AttendanceDecision.ACCEPT
        ? AttendanceRecordStatus.PRESENT
        : AttendanceRecordStatus.CHALLENGED;

      const persisted = await db.query(
        `INSERT INTO attendance_records (id, session_id, student_id, attempt_id, status, marked_by, notes)
         VALUES ($1, $2, $3, $4, $5, 'SYSTEM', $6)
         ON CONFLICT (session_id, student_id)
         DO UPDATE SET attempt_id = EXCLUDED.attempt_id, status = EXCLUDED.status, notes = EXCLUDED.notes
         WHERE attendance_records.status NOT IN ('PRESENT', 'LATE')
         RETURNING id`,
        [recordId, payload.sessionId, studentId, attemptId, status, finalReason]
      );
      if (persisted.rows[0]) recordId = persisted.rows[0].id;
      else {
        const existing = await db.query('SELECT id FROM attendance_records WHERE session_id = $1 AND student_id = $2', [payload.sessionId, studentId]);
        recordId = existing.rows[0]?.id;
      }
    }

    // --- NOTIFY PROFESSOR VIA WEBSOCKET IN REAL TIME ---
    afterCommit(() => SessionSocketServer.broadcastCheckIn(payload.sessionId, {
      attemptId,
      studentId,
      studentName: sessionData.student_name,
      enrollmentId: sessionData.enrollment_id,
      photoUrl: sessionData.photo_url,
      decision,
      status: decision === AttendanceDecision.ACCEPT ? 'PRESENT' : (decision === AttendanceDecision.CHALLENGE ? 'CHALLENGED' : 'REJECTED'),
      timestamp: serverTimestamp.toISOString(),
      distanceMeters: calculatedDistance,
      decisionReason: finalReason
    }));

    return {
      attemptId,
      decision,
      decisionReason: finalReason,
      diagnostics,
      attendanceRecordId: recordId,
      studentName: sessionData.student_name,
      enrollmentId: sessionData.enrollment_id
    };
  }

  /**
   * Resolves a challenged attendance attempt (Professor or Admin manual review).
   */
  static async resolveChallenge(
    professorId: string,
    attemptId: string,
    decision: 'ACCEPT' | 'REJECT',
    notes?: string
  ): Promise<{ success: boolean; status: string }> {
    return withTransaction(() => this.resolveInTransaction(professorId, attemptId, decision, notes));
  }

  private static async resolveInTransaction(professorId: string, attemptId: string, decision: 'ACCEPT' | 'REJECT', notes?: string): Promise<{ success: boolean; status: string }> {
    const db = await getDb();

    const attemptRes = await db.query(
      `SELECT aa.*, s.professor_id, u.full_name AS student_name, u.enrollment_id
       FROM attendance_attempts aa
       JOIN sessions s ON aa.session_id = s.id
       JOIN users u ON aa.student_id = u.id
       WHERE aa.id = $1 FOR UPDATE OF aa`,
      [attemptId]
    );

    if (attemptRes.rows.length === 0) {
      throw new Error(`Attempt ${attemptId} not found.`);
    }

    const attempt = attemptRes.rows[0];
    const actor = await db.query('SELECT role FROM users WHERE id = $1', [professorId]);
    await requireSessionAccess({ userId: professorId, role: actor.rows[0]?.role, email: '', fullName: '' }, attempt.session_id, true);
    if (attempt.decision !== 'CHALLENGE') throw httpError(409, 'Only pending challenges can be resolved.');
    const current = await db.query('SELECT attempt_id, status FROM attendance_records WHERE session_id = $1 AND student_id = $2 FOR UPDATE', [attempt.session_id, attempt.student_id]);
    if (current.rows[0]?.attempt_id !== attemptId || current.rows[0]?.status !== 'CHALLENGED') throw httpError(409, 'This challenge has been superseded by a newer attendance record.');
    const newStatus = decision === 'ACCEPT' ? AttendanceRecordStatus.PRESENT : AttendanceRecordStatus.ABSENT;

    // Update attendance_records
    await db.query(
      `INSERT INTO attendance_records (id, session_id, student_id, attempt_id, status, marked_by, notes)
       VALUES ($1, $2, $3, $4, $5, 'PROFESSOR', $6)
       ON CONFLICT (session_id, student_id)
       DO UPDATE SET status = EXCLUDED.status, marked_by = 'PROFESSOR', notes = EXCLUDED.notes`,
      [
        `rec_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        attempt.session_id,
        attempt.student_id,
        attempt.id,
        newStatus,
        notes || `Challenge manually resolved as ${newStatus} by professor.`
      ]
    );

    // Update attempt decision
    await db.query(
      `UPDATE attendance_attempts SET decision = $1, decision_reason = $2 WHERE id = $3`,
      [decision === 'ACCEPT' ? 'ACCEPT' : 'REJECT', notes || `Resolved by professor as ${decision}`, attemptId]
    );

    // Notify professor stream
    afterCommit(() => SessionSocketServer.broadcastCheckIn(attempt.session_id, {
      attemptId,
      studentId: attempt.student_id,
      studentName: attempt.student_name,
      enrollmentId: attempt.enrollment_id,
      decision: decision === 'ACCEPT' ? AttendanceDecision.ACCEPT : AttendanceDecision.REJECT,
      status: newStatus,
      timestamp: new Date().toISOString(),
      decisionReason: notes || `Challenge resolved as ${decision}`
    }));

    return { success: true, status: newStatus };
  }

  /**
   * Reverse Roster Scan: Professor directly scans student's personal dynamic QR.
   */
  static async processProfessorScan(
    professorId: string,
    sessionId: string,
    studentQrPayload: string,
    confirmOutsideSchedule = false
  ): Promise<AttemptEvaluationResult> {
    await ScheduleService.sync();
    return withTransaction(() => this.scanInTransaction(professorId, sessionId, studentQrPayload, confirmOutsideSchedule));
  }

  private static async scanInTransaction(professorId: string, sessionId: string, studentQrPayload: string, confirmOutsideSchedule: boolean): Promise<AttemptEvaluationResult> {
    const db = await getDb();
    const serverTimestamp = new Date();

    // Verify student QR payload
    const qrResult = QrService.verifyPayload(studentQrPayload, sessionId, 'STUDENT_PERSONAL');
    if (!qrResult.isValid || !qrResult.token?.studentId) {
      throw new Error(`Invalid student QR code: ${qrResult.reason}`);
    }

    const studentId = qrResult.token.studentId;

    // Verify session and professor ownership
    let sessionRes = await db.query(
      `SELECT s.*, u.full_name AS student_name, u.enrollment_id, u.photo_url
       FROM sessions s
       JOIN users u ON u.id = $1
       WHERE s.id = $2 FOR SHARE OF s`,
      [studentId, sessionId]
    );

    /* Never create a session as a side effect of scanning an arbitrary QR. */
    if (sessionRes.rows.length === 0) throw httpError(404, 'Session or student not found.');
    const sessionData = sessionRes.rows[0];
    const student = await db.query('SELECT role FROM users WHERE id = $1', [studentId]);
    if (student.rows[0]?.role !== UserRole.STUDENT) throw httpError(403, 'QR must belong to a student.');
    await requireSessionAccess({ userId: studentId, role: UserRole.STUDENT, email: '', fullName: '' }, sessionId);
    const actor = await db.query('SELECT role FROM users WHERE id = $1', [professorId]);
    if (![UserRole.PROFESSOR, UserRole.ADMIN].includes(actor.rows[0]?.role)) throw httpError(403, 'Staff access required.');
    if (sessionData.timetable_slot_id) {
      await requireSessionAccess({ userId: professorId, role: actor.rows[0]?.role, email: '', fullName: '' }, sessionId, true);
      if (!ScheduleService.isToday(sessionData)) throw httpError(409, 'This pass is not for today.');
      if (!ScheduleService.inScheduledTime(sessionData) && !confirmOutsideSchedule) throw Object.assign(httpError(409, 'This session has not started or has ended. Continue to mark this student?'), { code: 'OUTSIDE_SCHEDULE' });
    } else if (sessionData.status !== SessionStatus.ACTIVE || new Date(sessionData.end_time) <= serverTimestamp) throw httpError(409, 'Attendance session is not active.');

    // Replay check on student personal QR
    const nonceRes = await QrService.checkAndConsumeNonce(
      qrResult.token.nonce,
      sessionId,
      studentId,
      qrResult.token.exp
    );

    if (!nonceRes.isFresh) {
      throw new Error('This student QR has already been scanned (replay prevention).');
    }

    // Check if scanning professor is assigned to this batch/session
    let isOutOfBatch = false;
    if (sessionData.batch_id) {
      const batchProfRes = await db.query(
        `SELECT 1 FROM batches b
         LEFT JOIN batch_professors bp ON b.id = bp.batch_id
         WHERE b.id = $1 AND (b.professor_id = $2 OR bp.professor_id = $2)`,
        [sessionData.batch_id, professorId]
      );
      if (batchProfRes.rows.length === 0 && sessionData.professor_id !== professorId) {
        isOutOfBatch = true;
      }
    } else if (sessionData.professor_id !== professorId) {
      isOutOfBatch = true;
    }

    const markedBy = isOutOfBatch ? 'PROFESSOR_OUT_OF_BATCH' : 'PROFESSOR';
    const outsideSchedule = sessionData.timetable_slot_id && !ScheduleService.inScheduledTime(sessionData);
    let notes = isOutOfBatch
      ? 'Marked PRESENT by professor (out-of-batch proxy/override).'
      : 'Direct physical scan by professor.';
    if (outsideSchedule) notes += ' Teacher explicitly confirmed marking outside scheduled hours.';
    const decisionReason = isOutOfBatch
      ? 'Direct physical scan by professor (out-of-batch proxy/override).'
      : 'Direct physical scan by professor in classroom.';

    const attemptId = `att_prof_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const recordId = `rec_prof_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const diagnostics: ValidationDiagnostics = {
      enrollmentCheck: {
        passed: true,
        message: isOutOfBatch
          ? 'Verified via out-of-batch professor proxy scan.'
          : 'Verified via professor direct scan.'
      },
      sessionStateCheck: { passed: true, message: 'Session is active.' },
      qrVerification: { passed: true, message: 'Student personal dynamic QR signature valid.' },
      replayPrevention: { passed: true, message: 'Fresh student nonce.' },
      spatialCheck: { passed: true, omitted: true, message: 'Proximity verified by physical professor device scan.' },
      antiSpoofingCheck: { passed: true, message: isOutOfBatch ? 'Direct hardware scan by out-of-batch professor.' : 'Direct hardware scan by professor.' },
      biometricCheck: { passed: true, omitted: true, message: 'Visual identity confirmed by professor.' }
    };

    // Insert attempt
    await db.query(
      `INSERT INTO attendance_attempts (
        id, session_id, student_id, device_id, server_timestamp,
        submitted_qr_payload, validation_results, decision, decision_reason
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        attemptId,
        sessionId,
        studentId,
        `prof_device_${professorId}`,
        serverTimestamp,
        studentQrPayload,
        JSON.stringify(diagnostics),
        AttendanceDecision.ACCEPT,
        decisionReason
      ]
    );

    // Insert finalized record
    await db.query(
      `INSERT INTO attendance_records (id, session_id, student_id, attempt_id, status, marked_by, notes)
       VALUES ($1, $2, $3, $4, 'PRESENT', $5, $6)
       ON CONFLICT (session_id, student_id)
       DO UPDATE SET status = 'PRESENT', marked_by = EXCLUDED.marked_by, notes = EXCLUDED.notes, attempt_id = EXCLUDED.attempt_id`,
      [recordId, sessionId, studentId, attemptId, markedBy, notes]
    );

    // Broadcast check-in
    afterCommit(() => SessionSocketServer.broadcastCheckIn(sessionId, {
      attemptId,
      studentId,
      studentName: sessionData.student_name,
      enrollmentId: sessionData.enrollment_id,
      photoUrl: sessionData.photo_url,
      decision: AttendanceDecision.ACCEPT,
      status: 'PRESENT',
      timestamp: serverTimestamp.toISOString(),
      decisionReason
    }));

    return {
      attemptId,
      decision: AttendanceDecision.ACCEPT,
      decisionReason,
      diagnostics,
      attendanceRecordId: recordId,
      studentName: sessionData.student_name,
      enrollmentId: sessionData.enrollment_id
    };
  }
}
