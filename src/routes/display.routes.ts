import { Router } from 'express';
import { DisplayService } from '../services/display.service.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';
import { UserRole } from '../config/constants.js';
import { httpError } from '../services/access.service.js';

const router = Router();
const attempts = new Map<string, { count: number; until: number }>();
router.use((_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
const rateLimit: import('express').RequestHandler = (req, _res, next) => {
  const now = Date.now();
  for (const [key, value] of attempts) if (value.until < now) attempts.delete(key);
  const key = req.socket.remoteAddress || 'unknown';
  const bucket = attempts.get(key) || { count: 0, until: now + 60000 };
  attempts.set(key, bucket);
  if (++bucket.count > 30) return next(httpError(429, 'Too many pairing attempts. Please wait a minute.'));
  next();
};

router.post('/pairing', rateLimit, async (_req, res) => { res.status(201).json(await DisplayService.createPairing()); });
router.get('/state', async (req, res) => {
  const secret = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : '';
  if (!/^[A-Za-z0-9_-]{43}$/.test(secret)) throw httpError(401, 'Display authorization required.');
  res.json(await DisplayService.state(secret));
});
router.delete('/state', async (req, res) => {
  const secret = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : '';
  if (!/^[A-Za-z0-9_-]{43}$/.test(secret)) throw httpError(401, 'Display authorization required.');
  await DisplayService.disconnectDevice(secret);
  res.json({ message: 'Display disconnected.' });
});
router.post('/sessions/:id/pair', authenticateToken, requireRole(UserRole.PROFESSOR, UserRole.ADMIN), rateLimit, async (req, res) => {
  res.json(await DisplayService.claim((req as import('../middleware/auth.middleware.js').AuthenticatedRequest).user!, String(req.params.id), req.body.code));
});
router.delete('/sessions/:id/pair', authenticateToken, requireRole(UserRole.PROFESSOR, UserRole.ADMIN), async (req, res) => {
  await DisplayService.revoke((req as import('../middleware/auth.middleware.js').AuthenticatedRequest).user!, String(req.params.id));
  res.json({ message: 'Big screens disconnected.' });
});

export default router;
