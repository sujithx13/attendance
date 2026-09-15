import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { PolicyService } from '../services/policy.service.js';
import { QrService } from '../services/qr.service.js';
import { getDb } from '../database/db.js';
import { AttendanceAttemptPayload } from '../types/attempt.types.js';
import { AttendanceDecision } from '../config/constants.js';
import { UserRole } from '../config/constants.js';
import { professorScope, requireSessionAccess, httpError } from '../services/access.service.js';
import { SessionContextService } from '../services/session-context.service.js';
import { ScheduleService } from '../services/schedule.service.js';

export class AttendanceController {
  /**
   * Student submits an Attendance Attempt.
   * Runs the 5-layer verification pipeline and returns instant decision.
   */
  static async submitAttempt(req: AuthenticatedRequest, res: Response): Promise<void> {
    const studentId = req.user?.userId;
    if (!studentId) {
      res.status(401).json({ error: 'AUTHENTICATION_REQUIRED' });
      return;
    }

    const payload: AttendanceAttemptPayload = req.body;

    if (!payload.sessionId) {
      res.status(400).json({ error: 'VALIDATION_ERROR', message: 'sessionId is required.' });
      return;
    }

    // Attach client IP if telemetry does not have it
    if (!payload.telemetry) payload.telemetry = {};
    payload.telemetry.clientIp = req.socket.remoteAddress || '';

    try {
      const evaluation = await PolicyService.evaluateAttempt(studentId, payload);

      const statusCode = evaluation.decision === AttendanceDecision.ACCEPT
        ? 200
        : (evaluation.decision === AttendanceDecision.CHALLENGE ? 202 : 403);

      res.status(statusCode).json(evaluation);
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: 'EVALUATION_ERROR', message: err.message });
    }
  }

  /**
   * Reverse Roster Scan: Student generates their personal time-bound dynamic QR code.
   */
  static async getStudentDynamicQr(req: AuthenticatedRequest, res: Response): Promise<void> {
    const studentId = req.user?.userId;
    const sessionId = req.query.sessionId as string;

    if (!studentId) {
      res.status(401).json({ error: 'AUTHENTICATION_REQUIRED' });
      return;
    }

    if (!sessionId) {
      res.status(400).json({ error: 'MISSING_SESSION_ID' });
      return;
    }

    try {
      const db = await getDb();
      let resolvedId = sessionId;
      const slot = await db.query('SELECT id FROM timetable_slots WHERE id = $1', [sessionId]);
      if (slot.rows.length) {
        const context = await SessionContextService.forSlot(req.user!, sessionId);
        if (!context?.sessionId) throw httpError(409, 'Personal QR passes are available for today’s classes only.');
        resolvedId = context.sessionId;
      }
      const session = await requireSessionAccess(req.user!, resolvedId);
      if (!ScheduleService.isToday(session)) throw httpError(409, 'Personal QR passes are available for today’s classes only.');
      const { payload, tokenObj } = QrService.generateStudentPersonalPayload(resolvedId, studentId, 30);
      const dataUrl = await QrService.renderQrCode(payload, 'dataUrl');

      res.status(200).json({
        sessionId: resolvedId,
        studentId,
        qrPayload: payload,
        dataUrl,
        timestamp: tokenObj.timestamp,
        expiresAt: tokenObj.exp,
        expiresInSeconds: tokenObj.exp - tokenObj.timestamp
      });
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: 'QR_GENERATION_FAILED', message: err.message });
    }
  }

  /**
   * Reverse Roster Scan: Professor device scans student personal QR.
   */
  static async professorScanStudent(req: AuthenticatedRequest, res: Response): Promise<void> {
    const professorId = req.user?.userId;
    let { sessionId, studentQrPayload } = req.body;

    if (!professorId) {
      res.status(401).json({ error: 'AUTHENTICATION_REQUIRED' });
      return;
    }

    if (!sessionId && studentQrPayload) {
      try {
        const decoded = JSON.parse(Buffer.from(studentQrPayload, 'base64url').toString('utf-8'));
        sessionId = decoded.sessionId;
      } catch {}
    }

    if (!sessionId || !studentQrPayload) {
      res.status(400).json({ error: 'VALIDATION_ERROR', message: 'sessionId and studentQrPayload are required.' });
      return;
    }

    try {
      const result = await PolicyService.processProfessorScan(professorId, sessionId, studentQrPayload, req.body.confirmOutsideSchedule === true);
      res.status(200).json(result);
    } catch (err: any) {
      res.status(err.statusCode || 400).json({ error: err.code || 'SCAN_FAILED', message: err.message });
    }
  }

  /**
   * Lists pending challenged attempts for a session (Professor review queue).
   */
  static async getChallenges(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { sessionId } = req.query;
    const db = await getDb();

    let query = `
      SELECT aa.*, u.full_name AS student_name, u.enrollment_id, u.photo_url
      FROM attendance_attempts aa
      JOIN users u ON aa.student_id = u.id
      WHERE aa.decision = 'CHALLENGE'
    `;
    const params: any[] = [];

    if (req.user!.role === UserRole.PROFESSOR) {
      params.push(req.user!.userId);
      query += ` AND EXISTS (SELECT 1 FROM sessions s WHERE s.id = aa.session_id AND ${professorScope('s', '$1')})`;
    }

    if (sessionId) {
      params.push(sessionId);
      query += ` AND aa.session_id = $${params.length}`;
    }

    query += ` ORDER BY aa.created_at DESC`;

    const result = await db.query(query, params);
    res.status(200).json({ challenges: result.rows });
  }

  /**
   * Resolves a challenged attempt (Approve or Reject).
   */
  static async resolveChallenge(req: AuthenticatedRequest, res: Response): Promise<void> {
    const professorId = req.user?.userId;
    const { attemptId, decision, notes } = req.body;

    if (!professorId) {
      res.status(401).json({ error: 'AUTHENTICATION_REQUIRED' });
      return;
    }

    if (!attemptId || !['ACCEPT', 'REJECT'].includes(decision)) {
      res.status(400).json({ error: 'VALIDATION_ERROR', message: 'attemptId and decision (ACCEPT | REJECT) are required.' });
      return;
    }

    try {
      const outcome = await PolicyService.resolveChallenge(professorId, attemptId, decision, notes);
      res.status(200).json(outcome);
    } catch (err: any) {
      res.status(err.statusCode || 400).json({ error: 'RESOLUTION_FAILED', message: err.message });
    }
  }

  /**
   * Detailed Audit Log of all Attendance Attempts.
   */
  static async getAuditAttempts(req: AuthenticatedRequest, res: Response): Promise<void> {
    const db = await getDb();
    const sessionId = req.query.sessionId as string;
    const studentId = req.query.studentId as string;
    const decision = req.query.decision as string;

    let query = `
      SELECT aa.*, u.full_name AS student_name, u.enrollment_id
      FROM attendance_attempts aa
      JOIN users u ON aa.student_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (req.user!.role === UserRole.STUDENT) {
      params.push(req.user!.userId);
      query += ' AND aa.student_id = $1';
    } else if (req.user!.role === UserRole.PROFESSOR) {
      params.push(req.user!.userId);
      query += ` AND EXISTS (SELECT 1 FROM sessions s WHERE s.id = aa.session_id AND ${professorScope('s', '$1')})`;
    }

    if (sessionId) {
      params.push(sessionId);
      query += ` AND aa.session_id = $${params.length}`;
    }

    if (studentId) {
      params.push(studentId);
      query += ` AND aa.student_id = $${params.length}`;
    }

    if (decision) {
      params.push(decision);
      query += ` AND aa.decision = $${params.length}`;
    }

    query += ` ORDER BY aa.created_at DESC LIMIT 100`;

    const result = await db.query(query, params);
    res.status(200).json({ attempts: result.rows });
  }

  /**
   * Finalized Attendance Records for a session or student.
   */
  static async getAttendanceRecords(req: AuthenticatedRequest, res: Response): Promise<void> {
    const db = await getDb();
    const sessionId = req.query.sessionId as string;
    const studentId = req.query.studentId as string;

    let query = `
      SELECT ar.*, u.full_name AS student_name, u.enrollment_id, u.photo_url,
             s.course_id, c.code AS course_code, c.name AS course_name
      FROM attendance_records ar
      JOIN users u ON ar.student_id = u.id
      JOIN sessions s ON ar.session_id = s.id
      LEFT JOIN courses c ON s.course_id = c.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (req.user!.role === UserRole.STUDENT) {
      params.push(req.user!.userId);
      query += ' AND ar.student_id = $1';
    } else if (req.user!.role === UserRole.PROFESSOR) {
      params.push(req.user!.userId);
      query += ` AND ${professorScope('s', '$1')}`;
    }

    if (sessionId) {
      params.push(sessionId);
      query += ` AND ar.session_id = $${params.length}`;
    }

    if (studentId) {
      params.push(studentId);
      query += ` AND ar.student_id = $${params.length}`;
    }

    query += ` ORDER BY ar.created_at DESC`;

    const result = await db.query(query, params);
    res.status(200).json({ records: result.rows });
  }
}
