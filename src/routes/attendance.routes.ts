import { Router } from 'express';
import { AttendanceController } from '../controllers/attendance.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';
import { UserRole } from '../config/constants.js';

const router = Router();

// Student marks attendance via attempt pipeline
router.post('/attempt', authenticateToken, requireRole(UserRole.STUDENT), AttendanceController.submitAttempt);

// Student generates reverse dynamic QR for professor scanning
router.get('/student-qr', authenticateToken, requireRole(UserRole.STUDENT), AttendanceController.getStudentDynamicQr);

// Professor scans student's dynamic QR code
router.post('/professor-scan', authenticateToken, requireRole(UserRole.PROFESSOR, UserRole.ADMIN), AttendanceController.professorScanStudent);

// Challenge review & resolution queue
router.get('/challenges', authenticateToken, requireRole(UserRole.PROFESSOR, UserRole.ADMIN), AttendanceController.getChallenges);
router.post('/resolve-challenge', authenticateToken, requireRole(UserRole.PROFESSOR, UserRole.ADMIN), AttendanceController.resolveChallenge);

// Detailed attempt logs & finalized records
router.get('/attempts', authenticateToken, AttendanceController.getAuditAttempts);
router.get('/records', authenticateToken, AttendanceController.getAttendanceRecords);

export default router;
