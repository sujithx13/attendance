import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';
import { UserTokenPayload } from '../types/auth.types.js';

export interface AuthenticatedRequest extends Request {
  user?: UserTokenPayload;
}

export function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
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
    req.user = decoded;
    next();
  } catch (err: any) {
    res.status(403).json({ error: 'INVALID_TOKEN', message: 'Token is invalid or expired.' });
  }
}
