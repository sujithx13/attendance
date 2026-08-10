import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDb } from '../database/db.js';
import { ENV } from '../config/env.js';
import { UserRole } from '../config/constants.js';
import { UserTokenPayload, AuthResponse } from '../types/auth.types.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';

export class AuthController {
  static async login(req: Request, res: Response): Promise<void> {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'MISSING_CREDENTIALS', message: 'Email and password are required.' });
      return;
    }

    const db = await getDb();
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]);

    if (result.rows.length === 0) {
      res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' });
      return;
    }

    const user = result.rows[0];
    const passwordValid = await bcrypt.compare(password, user.password_hash);

    if (!passwordValid) {
      res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' });
      return;
    }

    const tokenPayload: UserTokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role as UserRole,
      fullName: user.full_name,
      enrollmentId: user.enrollment_id || undefined
    };

    const token = jwt.sign(tokenPayload, ENV.JWT_SECRET, { expiresIn: '7d' });

    const response: AuthResponse = {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role as UserRole,
        fullName: user.full_name,
        enrollmentId: user.enrollment_id || undefined,
        photoUrl: user.photo_url || undefined
      }
    };

    res.status(200).json(response);
  }

  static async register(req: Request, res: Response): Promise<void> {
    const { email, password, role, fullName, enrollmentId, photoUrl, faceEmbedding } = req.body;

    if (!email || !password || !role || !fullName) {
      res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Email, password, role, and fullName are required.' });
      return;
    }

    if (![UserRole.STUDENT, UserRole.PROFESSOR, UserRole.ADMIN].includes(role)) {
      res.status(400).json({ error: 'INVALID_ROLE', message: 'Role must be STUDENT, PROFESSOR, or ADMIN.' });
      return;
    }

    const db = await getDb();
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (existing.rows.length > 0) {
      res.status(409).json({ error: 'USER_EXISTS', message: 'A user with this email already exists.' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    await db.query(
      `INSERT INTO users (id, email, password_hash, role, full_name, enrollment_id, photo_url, face_embedding)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        userId,
        email.toLowerCase().trim(),
        passwordHash,
        role,
        fullName,
        enrollmentId || null,
        photoUrl || null,
        faceEmbedding ? (typeof faceEmbedding === 'string' ? faceEmbedding : JSON.stringify(faceEmbedding)) : null
      ]
    );

    const token = jwt.sign(
      { userId, email, role, fullName, enrollmentId },
      ENV.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: { id: userId, email, role, fullName, enrollmentId, photoUrl }
    });
  }

  static async me(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ error: 'UNAUTHORIZED' });
      return;
    }

    const db = await getDb();
    const userRes = await db.query(
      `SELECT u.id, u.email, u.role,
              u.full_name AS "fullName", u.full_name,
              u.enrollment_id AS "enrollmentId", u.enrollment_id,
              u.photo_url AS "photoUrl",
              u.department_id AS "departmentId", u.department_id,
              u.year_of_study AS "yearOfStudy", u.year_of_study,
              u.created_at AS "createdAt",
              d.code AS "departmentCode", d.code AS department_code,
              d.name AS "departmentName", d.name AS department_name
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE u.id = $1`,
      [req.user.userId]
    );

    if (userRes.rows.length === 0) {
      res.status(404).json({ error: 'USER_NOT_FOUND' });
      return;
    }

    res.status(200).json({ user: userRes.rows[0] });
  }

  static async updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ error: 'UNAUTHORIZED' });
      return;
    }

    const { fullName, departmentId, yearOfStudy } = req.body;
    const db = await getDb();

    // If departmentId is supplied, verify it exists
    if (departmentId) {
      const deptCheck = await db.query('SELECT id FROM departments WHERE id = $1', [departmentId]);
      if (deptCheck.rows.length === 0) {
        res.status(404).json({ error: 'Department not found.' });
        return;
      }
    }

    if (yearOfStudy !== undefined && (yearOfStudy < 1 || yearOfStudy > 5)) {
      res.status(400).json({ error: 'yearOfStudy must be an integer between 1 and 5.' });
      return;
    }

    await db.query(
      `UPDATE users
       SET full_name = COALESCE($1, full_name),
           department_id = COALESCE($2, department_id),
           year_of_study = COALESCE($3, year_of_study),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [fullName || null, departmentId || null, yearOfStudy || null, req.user.userId]
    );

    const updated = await db.query(
      `SELECT u.id, u.email, u.role,
              u.full_name AS "fullName", u.full_name,
              u.enrollment_id AS "enrollmentId", u.enrollment_id,
              u.department_id AS "departmentId", u.department_id,
              u.year_of_study AS "yearOfStudy", u.year_of_study,
              d.code AS "departmentCode", d.code AS department_code,
              d.name AS "departmentName", d.name AS department_name
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE u.id = $1`,
      [req.user.userId]
    );

    res.json({ message: 'Profile updated successfully.', user: updated.rows[0] });
  }

  static async updateFaceEmbedding(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { embedding } = req.body;
    if (!embedding || !Array.isArray(embedding)) {
      res.status(400).json({ error: 'INVALID_EMBEDDING', message: 'embedding must be an array of numbers.' });
      return;
    }

    const targetUserId = req.params.userId || req.user?.userId;
    const db = await getDb();

    await db.query(
      'UPDATE users SET face_embedding = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [JSON.stringify(embedding), targetUserId]
    );

    res.status(200).json({ success: true, message: 'Face embedding updated successfully.' });
  }
}
