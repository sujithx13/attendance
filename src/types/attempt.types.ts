import { AttendanceDecision } from '../config/constants.js';

export interface ClientTelemetry {
  isFromMockProvider?: boolean;
  isMock?: boolean;
  developerOptionsEnabled?: boolean;
  mockAppDetected?: boolean;
  mockAppNames?: string[];
  osPlatform?: string;
  osVersion?: string;
  deviceModel?: string;
  networkType?: string;
  clientIp?: string;
  clientUserAgent?: string;
}

export interface AttendanceAttemptPayload {
  sessionId: string;
  studentId?: string; // Optional if derived from JWT
  deviceId?: string;
  clientTimestamp: string;
  qrPayload?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
    accuracy: number;
    altitude?: number;
    speed?: number;
  };
  telemetry?: ClientTelemetry;
  bleBeaconsDetected?: string[];
  biometricImageBase64?: string;
  biometricVector?: number[];
  declarationAccepted?: boolean;
}

export interface ValidationDiagnostics {
  enrollmentCheck: { passed: boolean; message: string };
  sessionStateCheck: { passed: boolean; message: string };
  qrVerification: { passed: boolean; message: string; elapsedSeconds?: number; isExported?: boolean };
  replayPrevention: { passed: boolean; message: string; nonce?: string };
  spatialCheck: {
    passed: boolean;
    omitted?: boolean;
    message: string;
    distanceMeters?: number;
    maxAllowedMeters?: number;
    accuracyMeters?: number;
  };
  antiSpoofingCheck: { passed: boolean; message: string; flagsDetected?: string[] };
  biometricCheck: {
    passed: boolean;
    omitted?: boolean;
    message: string;
    similarityScore?: number;
    threshold?: number;
  };
  networkSubnetCheck?: { passed: boolean; omitted?: boolean; message: string; clientIp?: string };
}

export interface AttemptEvaluationResult {
  attemptId: string;
  decision: AttendanceDecision;
  decisionReason: string;
  diagnostics: ValidationDiagnostics;
  attendanceRecordId?: string;
  studentName?: string;
  enrollmentId?: string;
}
