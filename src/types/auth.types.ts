import { UserRole } from '../config/constants.js';

export interface UserTokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  fullName: string;
  enrollmentId?: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    role: UserRole;
    fullName: string;
    enrollmentId?: string;
    photoUrl?: string;
  };
}
