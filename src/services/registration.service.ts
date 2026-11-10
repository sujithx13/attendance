import bcrypt from 'bcryptjs';
import { UserRole } from '../config/constants.js';
import { getDb, withTransaction } from '../database/db.js';
import { httpError } from './access.service.js';
import { BatchService } from './batch.service.js';

const REGISTRATION_SETTING_KEY = 'student_self_registration_enabled';
const KAHEDU_EMAIL_PATTERN = /^[a-z0-9._%+-]+@kahedu\.edu\.in$/;

export interface RegisterStudentInput {
  email: unknown;
  fullName: unknown;
  enrollmentId: unknown;
  departmentId: unknown;
  yearOfStudy: unknown;
  phoneNumber?: unknown;
  batchId?: unknown;
}

export interface RegisteredStudent {
  id: string;
  email: string;
  role: UserRole.STUDENT;
  fullName: string;
  enrollmentId: string;
  departmentId: string;
  yearOfStudy: number;
  phoneNumber: string | null;
  batchId: string | null;
}

/**
 * Manages temporary public student self-registration settings and atomic student account creation.
 */
export class RegistrationService {
  static async isStudentSelfRegistrationEnabled(): Promise<boolean> {
    const db = await getDb();
    const res = await db.query<{ value: string }>(
      'SELECT value FROM app_settings WHERE key = $1',
      [REGISTRATION_SETTING_KEY]
    );
    return res.rows[0]?.value === 'true';
  }

  static async setStudentSelfRegistrationEnabled(enabled: boolean): Promise<boolean> {
    const db = await getDb();
    await db.query(
      `INSERT INTO app_settings (key, value, updated_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`,
      [REGISTRATION_SETTING_KEY, enabled ? 'true' : 'false']
    );
    return enabled;
  }

  static async getPublicOptions() {
    const open = await this.isStudentSelfRegistrationEnabled();
    if (!open) {
      return { open: false, departments: [], batches: [] };
    }

    const db = await getDb();
    const [departmentsRes, batchesRes] = await Promise.all([
      db.query('SELECT id, code, name FROM departments ORDER BY code ASC'),
      db.query(
        `SELECT id, name, code,
                department_id AS "departmentId",
                allow_cross_department AS "allowCrossDepartment",
                allow_multiple_years AS "allowMultipleYears",
                allowed_years AS "allowedYears"
         FROM batches
         ORDER BY name ASC`
      )
    ]);

    return {
      open: true,
      departments: departmentsRes.rows,
      batches: batchesRes.rows
    };
  }

  static async registerStudentAccount(input: RegisterStudentInput): Promise<RegisteredStudent> {
    const fullName = typeof input.fullName === 'string' ? input.fullName.trim() : '';
    const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
    const enrollmentId = typeof input.enrollmentId === 'string' ? input.enrollmentId.trim().toUpperCase() : '';
    const departmentId = typeof input.departmentId === 'string' ? input.departmentId.trim() : '';
    const yearOfStudy = Number(input.yearOfStudy);
    const phoneNumber = typeof input.phoneNumber === 'string' && input.phoneNumber.trim()
      ? input.phoneNumber.trim()
      : null;
    const batchId = typeof input.batchId === 'string' && input.batchId.trim()
      ? input.batchId.trim()
      : null;

    if (fullName.length < 2 || fullName.length > 255) {
      throw httpError(400, 'Enter your full name (at least 2 characters).');
    }
    if (!KAHEDU_EMAIL_PATTERN.test(email)) {
      throw httpError(400, 'Use an @kahedu.edu.in email address.');
    }
    if (enrollmentId.length < 4 || enrollmentId.length > 50 || /\s/.test(enrollmentId)) {
      throw httpError(400, 'Enter a valid register number (at least 4 characters, no spaces).');
    }
    if (!departmentId) {
      throw httpError(400, 'Select a department.');
    }
    if (!Number.isInteger(yearOfStudy) || yearOfStudy < 1 || yearOfStudy > 5) {
      throw httpError(400, 'Year of study must be between 1 and 5.');
    }
    if (phoneNumber && phoneNumber.length > 30) {
      throw httpError(400, 'Phone number is too long.');
    }

    // Standard student credential rule: uppercase register number is the account password.
    const passwordHash = await bcrypt.hash(enrollmentId, 10);
    const userId = `usr_student_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

    await withTransaction(async () => {
      const db = await getDb();

      const existingEmail = await db.query('SELECT id FROM users WHERE email = $1', [email]);
      if (existingEmail.rows.length > 0) {
        throw httpError(409, 'An account with this email already exists.');
      }

      const existingEnrollment = await db.query(
        'SELECT id FROM users WHERE LOWER(enrollment_id) = LOWER($1)',
        [enrollmentId]
      );
      if (existingEnrollment.rows.length > 0) {
        throw httpError(409, 'This register number is already registered.');
      }

      const deptRes = await db.query('SELECT id FROM departments WHERE id = $1', [departmentId]);
      if (deptRes.rows.length === 0) {
        throw httpError(400, 'Selected department does not exist.');
      }

      await db.query(
        `INSERT INTO users (id, email, password_hash, role, full_name, enrollment_id, department_id, year_of_study, phone_number)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [userId, email, passwordHash, UserRole.STUDENT, fullName, enrollmentId, departmentId, yearOfStudy, phoneNumber]
      );

      if (batchId) {
        try {
          await BatchService.addStudentToBatch(batchId, userId);
        } catch (err: any) {
          throw httpError(400, err?.message || 'Unable to assign student to the selected batch.');
        }
      }
    });

    return {
      id: userId,
      email,
      role: UserRole.STUDENT,
      fullName,
      enrollmentId,
      departmentId,
      yearOfStudy,
      phoneNumber,
      batchId
    };
  }
}

