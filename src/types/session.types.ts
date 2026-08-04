import { SessionStatus } from '../config/constants.js';
import { VerificationPolicy } from './flow.types.js';

export interface Classroom {
  id: string;
  name: string;
  building: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  wifiBssidWhitelist?: string[];
  bleBeaconIds?: string[];
  allowedIpSubnets?: string[];
  createdAt: string;
}

export interface Session {
  id: string;
  courseId: string;
  professorId: string;
  classroomId: string;
  startTime: string;
  endTime: string;
  status: SessionStatus;
  verificationPolicyOverride?: Partial<VerificationPolicy>;
  createdAt: string;
}
