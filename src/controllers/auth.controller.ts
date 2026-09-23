import { issueMobileSession, userBatches } from '../services/mobile-auth.service.js';
import { randomUUID } from 'node:crypto';
import { withTransaction } from '../database/db.js';
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

    const sessionId = user.role === UserRole.ADMIN ? undefined : await issueMobileSession(user.id);
    if (sessionId === null) { res.status(403).json({ error: 'LOGIN_APPROVAL_REQUIRED', message: 'Login requested. Your batch administrator must approve access. Try signing in again after approval.' }); return; }
    const tokenPayload: UserTokenPayload = {
      sessionId,
      userId: user.id,
      email: user.email,
      role: user.role as UserRole,
      fullName: user.full_name,
      enrollmentId: user.enrollment_id || undefined
    };

    const token = jwt.sign(tokenPayload, ENV.JWT_SECRET, user.role === UserRole.ADMIN ? { expiresIn: '7d' } : {});

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

  static async logout(req: AuthenticatedRequest, res: Response): Promise<void> {
    await withTransaction(async () => {
      const db=await getDb();
      if(req.user?.sessionId) await db.query('UPDATE mobile_sessions SET revoked_at=CURRENT_TIMESTAMP WHERE id=$1 AND user_id=$2',[req.user.sessionId,req.user.userId]);
      for(const batch of await userBatches(req.user!.userId)) await db.query('INSERT INTO batch_account_events(id,batch_id,user_id,event) VALUES($1,$2,$3,$4)',[randomUUID(),batch.id,req.user!.userId,'LOGOUT']);
    });
    res.json({ success:true });
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

    if (role !== UserRole.ADMIN && !/^[A-Za-z0-9._%+-]+@kahedu\.edu\.in$/.test(String(email).trim().toLowerCase())) { res.status(400).json({message:'Use an @kahedu.edu.in email address.'}); return; }
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

    res.status(201).json({ user: { id: userId, email, role, fullName, enrollmentId, photoUrl } });
  }

  static async me(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ error: 'UNAUTHORIZED' });
      return;
    }

    const db = await getDb();
    const userRes = await db.query(
      `SELECT u.id, u.email, u.role, u.phone_number AS "phoneNumber",
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

    res.status(403).json({ error: 'ADMIN_MANAGED_PROFILE', message: 'Your administrator manages account details.' });
  }

  static async updateFaceEmbedding(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { embedding } = req.body;
    if (!Array.isArray(embedding) || embedding.length !== 128 || !embedding.every((n: unknown) => typeof n === 'number' && Number.isFinite(n)) || !embedding.some((n: number) => n !== 0)) {
      res.status(400).json({ error: 'INVALID_EMBEDDING', message: 'embedding must be an array of numbers.' });
      return;
    }

    const targetUserId = req.body.userId;
    if (typeof targetUserId !== 'string') { res.status(400).json({ error: 'Target userId is required for administrator enrollment.' }); return; }
    const db = await getDb();

    await db.query(
      'UPDATE users SET face_embedding = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [JSON.stringify(embedding), targetUserId]
    );

    res.status(200).json({ success: true, message: 'Face embedding updated successfully.' });
  }
}
