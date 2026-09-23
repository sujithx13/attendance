import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';
import { UserTokenPayload } from '../types/auth.types.js';
import { getDb } from '../database/db.js';

export interface AuthenticatedRequest extends Request {
  user?: UserTokenPayload;
}

export async function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.substring(7)
    : null;

  if (!token) {
    res.status(401).json({ error: 'AUTHENTICATION_REQUIRED', message: 'Bearer token missing or malformed.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, ENV.JWT_SECRET) as UserTokenPayload;
    const db = await getDb();
    if(decoded.sessionId) { const session=await db.query('SELECT id FROM mobile_sessions WHERE id=$1 AND user_id=$2 AND revoked_at IS NULL',[decoded.sessionId,decoded.userId]); if(!session.rows.length) throw new Error('Session ended.'); }
    const current = await db.query('SELECT id, role, email, full_name FROM users WHERE id = $1', [decoded.userId]);
    if (!current.rows[0]) throw new Error('User no longer exists.');
    req.user = { ...decoded, role: current.rows[0].role, email: current.rows[0].email, fullName: current.rows[0].full_name };
    next();
  } catch (err: any) {
    res.status(403).json({ error: 'INVALID_TOKEN', message: 'Token is invalid or expired.' });
  }
}
