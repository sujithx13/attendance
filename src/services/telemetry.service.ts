import { ClientTelemetry } from '../types/attempt.types.js';
import { ViolationType } from '../config/constants.js';
import { getDb } from '../database/db.js';
import { SpatialService } from './spatial.service.js';
import { ENV } from '../config/env.js';

export interface AntiSpoofingResult {
  passed: boolean;
  flagsDetected: string[];
  message: string;
  violationType?: ViolationType;
}

export class TelemetryService {
  /**
   * Inspects client telemetry flags to detect mock providers, fake GPS apps, or developer overrides.
   */
  static inspectClientTelemetry(telemetry?: ClientTelemetry): AntiSpoofingResult {
    if (!telemetry) {
      return {
        passed: true,
        flagsDetected: [],
        message: 'No client telemetry reported.'
      };
    }

    const flags: string[] = [];

    if (telemetry.isFromMockProvider === true || telemetry.isMock === true) {
      flags.push('ANDROID_MOCK_LOCATION_PROVIDER');
    }

    if (telemetry.mockAppDetected === true) {
      flags.push(`MOCK_APP_RUNNING_${(telemetry.mockAppNames || []).join('_')}`);
    }

    if (telemetry.developerOptionsEnabled && telemetry.isFromMockProvider) {
      flags.push('DEV_OPTIONS_MOCK_LOCATION_ENABLED');
    }

    if (flags.length > 0) {
      return {
        passed: false,
        flagsDetected: flags,
        message: `Security violation detected: Mock location / GPS spoofing flags: ${flags.join(', ')}`,
        violationType: ViolationType.MOCK_LOCATION_DETECTED
      };
    }

    return {
      passed: true,
      flagsDetected: [],
      message: 'Client telemetry validated. No mock indicators detected.'
    };
  }

  /**
   * Checks for physical teleportation / impossible travel speeds between consecutive attempts.
   */
  static async checkVelocityAnomaly(
    studentId: string,
    currentLat: number,
    currentLng: number,
    currentTimestamp: Date
  ): Promise<AntiSpoofingResult> {
    const db = await getDb();

    // Query most recent prior attempt with coordinates within the past 10 minutes
    const res = await db.query(
      `SELECT submitted_latitude, submitted_longitude, created_at
       FROM attendance_attempts
       WHERE student_id = $1
         AND submitted_latitude IS NOT NULL
         AND submitted_longitude IS NOT NULL
         AND created_at < $2
         AND created_at > ($2::timestamp - interval '10 minutes')
       ORDER BY created_at DESC
       LIMIT 1`,
      [studentId, currentTimestamp]
    );

    if (res.rows.length === 0) {
      return { passed: true, flagsDetected: [], message: 'No recent attempts for velocity comparison.' };
    }

    const prev = res.rows[0];
    const prevLat = parseFloat(prev.submitted_latitude);
    const prevLng = parseFloat(prev.submitted_longitude);
    const prevTime = new Date(prev.created_at).getTime();
    const currTime = currentTimestamp.getTime();

    const timeDiffSeconds = Math.max(1, (currTime - prevTime) / 1000);
    const distanceMeters = SpatialService.calculateDistanceMeters(prevLat, prevLng, currentLat, currentLng);
    const speedMetersPerSec = distanceMeters / timeDiffSeconds;

    if (speedMetersPerSec > ENV.MAX_REALISTIC_SPEED_METERS_PER_SEC && distanceMeters > 100) {
      return {
        passed: false,
        flagsDetected: ['IMPOSSIBLE_TRAVEL_VELOCITY'],
        message: `Impossible velocity detected: ${Math.round(speedMetersPerSec)} m/s (${Math.round(speedMetersPerSec * 3.6)} km/h) across ${Math.round(distanceMeters)}m in ${Math.round(timeDiffSeconds)}s`,
        violationType: ViolationType.IMPOSSIBLE_VELOCITY
      };
    }

    return { passed: true, flagsDetected: [], message: 'Velocity checks passed.' };
  }

  /**
   * Logs a security violation in the database for auditing and disciplinary records.
   */
  static async recordViolation(
    studentId: string | undefined,
    sessionId: string | undefined,
    attemptId: string | undefined,
    violationType: ViolationType,
    details: Record<string, any>,
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'HIGH'
  ): Promise<void> {
    const db = await getDb();
    const id = `viol_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    await db.query(
      `INSERT INTO security_violations (id, student_id, session_id, attempt_id, violation_type, details, severity)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, studentId || null, sessionId || null, attemptId || null, violationType, JSON.stringify(details), severity]
    );

    console.warn(`[Security Alert] Recorded violation ${violationType} for student ${studentId || 'unknown'}.`);
  }
}
