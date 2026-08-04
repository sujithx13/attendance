export type FlowStepType =
  | 'DECLARATION'
  | 'QR_SCANNER'
  | 'GEOLOCATION_CHECK'
  | 'BIOMETRIC_FACE'
  | 'BLE_BEACON_CHECK'
  | 'REVERSE_QR_DISPLAY'
  | 'CHALLENGE_REVIEW';

export interface FlowStepConfig {
  id: string;
  type: FlowStepType;
  title: string;
  description?: string;
  required: boolean;
  order: number;
  metadata?: Record<string, any>;
}

export interface VerificationPolicy {
  requiresQr: boolean;
  requiresGps: boolean;
  requiresBiometric: boolean;
  requiresBle: boolean;
  allowMockLocation: boolean;
  maxDistanceMeters: number;
  maxGpsAccuracyMeters: number;
  qrExpirationSeconds: number;
  allowOfflineSync: boolean;
  declarationRequired: boolean;
  declarationPledgeText?: string;
  isOutdoorSession?: boolean;
}

export interface ServerDrivenFlowConfig {
  flowId: string;
  version: string;
  sessionId: string;
  courseCode: string;
  courseName: string;
  classroomName: string;
  building: string;
  serverTimestamp: string;
  policy: VerificationPolicy;
  steps: FlowStepConfig[];
  telemetryRequirements: {
    collectGps: boolean;
    collectMockIndicators: boolean;
    collectNetworkInfo: boolean;
    collectBle: boolean;
  };
  allowedSubnets?: string[];
}
