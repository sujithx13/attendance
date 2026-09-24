import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';
import { UserRole } from '../config/constants.js';

const router = Router();

router.post('/login', AuthController.login);
router.post('/register', authenticateToken, requireRole(UserRole.ADMIN), AuthController.register);
router.post('/logout', authenticateToken, AuthController.logout);
router.get('/me', authenticateToken, AuthController.me);
router.put('/profile', authenticateToken, AuthController.updateProfile);
router.put('/face-embedding', authenticateToken, requireRole(UserRole.ADMIN), AuthController.updateFaceEmbedding);

export default router;
