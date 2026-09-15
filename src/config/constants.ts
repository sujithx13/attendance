export enum UserRole {
  STUDENT = 'STUDENT',
  PROFESSOR = 'PROFESSOR',
  ADMIN = 'ADMIN'
}

export enum SessionStatus {
  SCHEDULED = 'SCHEDULED',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export enum AttendanceDecision {
  ACCEPT = 'ACCEPT',
  CHALLENGE = 'CHALLENGE',
  REJECT = 'REJECT'
}

export enum AttendanceRecordStatus {
  PRESENT = 'PRESENT',
  LATE = 'LATE',
  CHALLENGED = 'CHALLENGED',
  EXCUSED = 'EXCUSED',
  ABSENT = 'ABSENT'
}

export enum ViolationType {
  MOCK_LOCATION_DETECTED = 'MOCK_LOCATION_DETECTED',
  FORGED_QR_SIGNATURE = 'FORGED_QR_SIGNATURE',
  EXPIRED_QR_TOKEN = 'EXPIRED_QR_TOKEN',
  REPLAY_ATTACK = 'REPLAY_ATTACK',
  IMPOSSIBLE_VELOCITY = 'IMPOSSIBLE_VELOCITY',
  UNENROLLED_STUDENT = 'UNENROLLED_STUDENT',
  BIOMETRIC_MISMATCH = 'BIOMETRIC_MISMATCH'
}

export const DEFAULT_VERIFICATION_POLICY = {
  requiresQr: true,
  requiresGps: false,
  requiresBiometric: false,
  requiresBle: false,
  allowMockLocation: false,
  maxDistanceMeters: 25.0,
  maxGpsAccuracyMeters: 35.0,
  qrExpirationSeconds: 20,
  allowOfflineSync: true,
  declarationRequired: true,
  declarationPledgeText: 'I hereby confirm that I am physically present in the scheduled classroom.'
};
