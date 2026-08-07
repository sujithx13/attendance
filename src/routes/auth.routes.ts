import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/login', AuthController.login);
router.post('/register', AuthController.register);
router.get('/me', authenticateToken, AuthController.me);
router.put('/profile', authenticateToken, AuthController.updateProfile);
router.put('/face-embedding', authenticateToken, AuthController.updateFaceEmbedding);

export default router;
