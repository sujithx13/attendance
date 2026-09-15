import { getDb } from '../database/db.js';
import {
  ServerDrivenFlowConfig,
  FlowStepConfig,
  VerificationPolicy
} from '../types/flow.types.js';
import { DEFAULT_VERIFICATION_POLICY, SessionStatus } from '../config/constants.js';

export interface ClientCapabilities {
  hasHardwareGps?: boolean;
  hasCamera?: boolean;
  hasBle?: boolean;
  platform?: 'android' | 'ios' | 'web_mobile' | 'web_desktop';
}

export class FlowService {
  /**
   * Generates the dynamic Server-Driven UI configuration contract for a student.
   * Seamlessly adapts verification steps based on classroom policy, outdoor sessions,
   * exam requirements, and device hardware capabilities.
   */
  static async generateStudentFlow(
    sessionId: string,
    studentId: string,
    capabilities: ClientCapabilities = { hasHardwareGps: true, hasCamera: true }
  ): Promise<ServerDrivenFlowConfig> {
    const db = await getDb();

    const sessionRes = await db.query(
      `SELECT s.*,
              c.code AS course_code, c.name AS course_name,
              b.code AS batch_code, b.name AS batch_name,
              clr.name AS classroom_name, clr.building, clr.latitude, clr.longitude,
              clr.radius_meters, clr.allowed_ip_subnets, clr.ble_beacon_ids
       FROM sessions s
       LEFT JOIN courses c ON s.course_id = c.id
       LEFT JOIN batches b ON s.batch_id = b.id
       JOIN classrooms clr ON s.classroom_id = clr.id
       WHERE s.id = $1`,
      [sessionId]
    );

    if (sessionRes.rows.length === 0) {
      throw new Error(`Session ${sessionId} not found.`);
    }

    const session = sessionRes.rows[0];
    const policy: VerificationPolicy = {
      ...DEFAULT_VERIFICATION_POLICY,
      ...(session.verification_policy_override || {})
    };
    // GPS attendance checks are temporarily disabled by product request.
    policy.requiresGps = false;

    const steps: FlowStepConfig[] = [];
    let stepOrder = 1;

    // Step 1: Academic Declaration / Honor Code Pledge
    if (policy.declarationRequired) {
      steps.push({
        id: 'step_declaration',
        type: 'DECLARATION',
        title: 'Physical Presence Declaration',
        description: policy.declarationPledgeText || 'I certify that I am physically present in the scheduled classroom.',
        required: true,
        order: stepOrder++
      });
    }

    // Step 2: QR Scanning Step
    if (policy.requiresQr) {
      steps.push({
        id: 'step_qr_scan',
        type: 'QR_SCANNER',
        title: 'Scan Classroom Display',
        description: 'Point your camera at the rotating QR code shown on the professor display.',
        required: true,
        order: stepOrder++,
        metadata: {
          timeoutSeconds: policy.qrExpirationSeconds || 20,
          vibrateOnScan: true,
          beepOnSuccess: true
        }
      });
    }

    // Step 3: Spatial / Geolocation Verification Step
    if (policy.requiresGps) {
      if (capabilities.hasHardwareGps !== false) {
        steps.push({
          id: 'step_gps_check',
          type: 'GEOLOCATION_CHECK',
          title: 'Classroom Proximity Verification',
          description: `Acquiring satellite GPS coordinates. You must be within ${policy.maxDistanceMeters}m of ${session.classroom_name}.`,
          required: true,
          order: stepOrder++,
          metadata: {
            targetLatitude: Number(session.origin_latitude ?? session.latitude),
            targetLongitude: Number(session.origin_longitude ?? session.longitude),
            maxDistanceMeters: policy.maxDistanceMeters,
            maxAllowedAccuracyMeters: policy.maxGpsAccuracyMeters,
            enforceAntiSpoofing: !policy.allowMockLocation
          }
        });
      } else {
        // Desktop / Sensor-constrained device: Adapt flow to subnet or reverse QR
        steps.push({
          id: 'step_reverse_qr',
          type: 'REVERSE_QR_DISPLAY',
          title: 'Desktop Check-In: Reverse QR Display',
          description: 'Your device lacks native GPS. Display this code for your professor to scan directly.',
          required: true,
          order: stepOrder++,
          metadata: {
            refreshIntervalSeconds: 20,
            allowedSubnets: session.allowed_ip_subnets
          }
        });
      }
    }

    // Step 4: Multi-Factor Biometric Verification Step (High-Stakes / Exam Mode)
    if (policy.requiresBiometric) {
      steps.push({
        id: 'step_biometric_face',
        type: 'BIOMETRIC_FACE',
        title: 'Live Identity Verification',
        description: 'Position your face within the frame to verify identity against your student photo.',
        required: true,
        order: stepOrder++,
        metadata: {
          guideOverlay: 'OVAL',
          livenessCheck: true
        }
      });
    }

    // Step 5: BLE Beacon Check (Optional capability)
    if (policy.requiresBle && session.ble_beacon_ids && session.ble_beacon_ids.length > 0) {
      steps.push({
        id: 'step_ble_check',
        type: 'BLE_BEACON_CHECK',
        title: 'Indoor Proximity Beacon Check',
        description: 'Detecting classroom Bluetooth signals for fine-grained indoor presence.',
        required: true,
        order: stepOrder++,
        metadata: {
          beaconIds: session.ble_beacon_ids
        }
      });
    }

    return {
      flowId: `flow_${session.id}_v${stepOrder}`,
      version: '2.0.0',
      sessionId: session.id,
      courseCode: session.course_code || session.batch_code || 'BATCH',
      courseName: session.course_name || session.batch_name || 'Batch Cohort Session',
      classroomName: session.classroom_name,
      building: session.building,
      serverTimestamp: new Date().toISOString(),
      policy,
      steps,
      telemetryRequirements: {
        collectGps: policy.requiresGps && capabilities.hasHardwareGps !== false,
        collectMockIndicators: !policy.allowMockLocation,
        collectNetworkInfo: true,
        collectBle: policy.requiresBle
      },
      allowedSubnets: session.allowed_ip_subnets
    };
  }

  /**
   * Generates dynamic configuration for the professor's projector / dashboard display.
   */
  static async generateProfessorFlow(sessionId: string): Promise<Record<string, any>> {
    const db = await getDb();

    const sessionRes = await db.query(
      `SELECT s.*,
              c.code AS course_code, c.name AS course_name,
              b.code AS batch_code, b.name AS batch_name,
              clr.name AS classroom_name
       FROM sessions s
       LEFT JOIN courses c ON s.course_id = c.id
       LEFT JOIN batches b ON s.batch_id = b.id
       JOIN classrooms clr ON s.classroom_id = clr.id
       WHERE s.id = $1`,
      [sessionId]
    );

    if (sessionRes.rows.length === 0) {
      throw new Error(`Session ${sessionId} not found.`);
    }

    const session = sessionRes.rows[0];

    return {
      sessionId: session.id,
      courseCode: session.course_code || session.batch_code || 'BATCH',
      courseName: session.course_name || session.batch_name || 'Batch Cohort Session',
      classroomName: session.classroom_name,
      status: session.status,
      displaySettings: {
        qrRotationIntervalSeconds: 15,
        qrExpirationSeconds: 20,
        enableSoundOnCheckIn: true,
        showRosterStream: true,
        allowQrExport: true,
        exportPresets: [30, 60, 300, 900]
      },
      policy: {
        ...DEFAULT_VERIFICATION_POLICY,
        ...(session.verification_policy_override || {}),
        requiresGps: false
      }
    };
  }
}
