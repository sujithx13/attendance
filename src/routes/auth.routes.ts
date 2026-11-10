import { Router, type RequestHandler } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';
import { UserRole } from '../config/constants.js';
import { httpError } from '../services/access.service.js';

const router = Router();
const registrationAttempts = new Map<string, { count: number; until: number }>();

const registrationRateLimit: RequestHandler = (req, _res, next) => {
  const now = Date.now();
  for (const [key, value] of registrationAttempts) {
    if (value.until < now) registrationAttempts.delete(key);
  }
  const key = req.socket.remoteAddress || 'unknown';
  const bucket = registrationAttempts.get(key) || { count: 0, until: now + 60000 };
  registrationAttempts.set(key, bucket);
  if (++bucket.count > 25) {
    return next(httpError(429, 'Too many registration attempts. Please wait a minute and try again.'));
  }
  next();
};

router.post('/login', AuthController.login);
router.post('/register', authenticateToken, requireRole(UserRole.ADMIN), AuthController.register);
router.get('/student-register/options', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
}, AuthController.studentRegisterOptions);
router.post('/student-register', registrationRateLimit, AuthController.studentRegister);
router.post('/staff-register-student', authenticateToken, requireRole(UserRole.ADMIN, UserRole.PROFESSOR), AuthController.staffRegisterStudent);
router.get('/student-register/settings', authenticateToken, requireRole(UserRole.ADMIN), AuthController.getStudentRegistrationSettings);
router.put('/student-register/settings', authenticateToken, requireRole(UserRole.ADMIN), AuthController.setStudentRegistrationSettings);
router.post('/logout', authenticateToken, AuthController.logout);
router.get('/me', authenticateToken, AuthController.me);
router.put('/profile', authenticateToken, AuthController.updateProfile);
router.put('/face-embedding', authenticateToken, requireRole(UserRole.ADMIN), AuthController.updateFaceEmbedding);

export default router;
