import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { getDb } from '../database/db.js';
import { SessionStatus } from '../config/constants.js';
import { QrService } from '../services/qr.service.js';
import { refreshMaterializedViews } from '../database/materialized-views.js';

export class SessionController {
  static async listSessions(req: AuthenticatedRequest, res: Response): Promise<void> {
    const db = await getDb();
    const status = req.query.status as string;
    const courseId = req.query.courseId as string;

    let query = `
      SELECT s.*, c.code AS course_code, c.name AS course_name,
             u.full_name AS professor_name, clr.name AS classroom_name, clr.building,
             clr.latitude, clr.longitude, clr.radius_meters
      FROM sessions s
      JOIN courses c ON s.course_id = c.id
      JOIN users u ON s.professor_id = u.id
      JOIN classrooms clr ON s.classroom_id = clr.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status) {
      params.push(status);
      query += ` AND s.status = $${params.length}`;
    }

    if (courseId) {
      params.push(courseId);
      query += ` AND s.course_id = $${params.length}`;
    }

    query += ` ORDER BY s.start_time DESC`;

    const result = await db.query(query, params);
    res.status(200).json({ sessions: result.rows });
  }

  static async getSessionById(req: AuthenticatedRequest, res: Response): Promise<void> {
    const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
    const db = await getDb();

    const result = await db.query(
      `SELECT s.*, c.code AS course_code, c.name AS course_name,
              u.full_name AS professor_name, clr.name AS classroom_name, clr.building,
              clr.latitude, clr.longitude, clr.radius_meters, clr.allowed_ip_subnets, clr.ble_beacon_ids
       FROM sessions s
       JOIN courses c ON s.course_id = c.id
       JOIN users u ON s.professor_id = u.id
       JOIN classrooms clr ON s.classroom_id = clr.id
       WHERE s.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'SESSION_NOT_FOUND' });
      return;
    }

    res.status(200).json({ session: result.rows[0] });
  }

  static async createSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { courseId, classroomId, startTime, endTime, policyOverride } = req.body;
    const professorId = req.body.professorId || req.user?.userId;

    if (!courseId || !classroomId || !startTime || !endTime) {
      res.status(400).json({ error: 'VALIDATION_ERROR', message: 'courseId, classroomId, startTime, and endTime are required.' });
      return;
    }

    const db = await getDb();
    const id = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    await db.query(
      `INSERT INTO sessions (id, course_id, professor_id, classroom_id, start_time, end_time, status, verification_policy_override)
       VALUES ($1, $2, $3, $4, $5, $6, 'SCHEDULED', $7)`,
      [id, courseId, professorId, classroomId, new Date(startTime), new Date(endTime), policyOverride ? JSON.stringify(policyOverride) : null]
    );

    res.status(201).json({ id, message: 'Session created successfully.' });
  }

  static async startSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
    const db = await getDb();

    await db.query(
      `UPDATE sessions SET status = 'ACTIVE' WHERE id = $1`,
      [id]
    );

    res.status(200).json({ success: true, message: `Session ${id} is now ACTIVE.` });
  }

  static async endSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
    const db = await getDb();

    await db.query(
      `UPDATE sessions SET status = 'COMPLETED' WHERE id = $1`,
      [id]
    );

    // Refresh materialized views in the background
    refreshMaterializedViews(false).catch((err) => {
      console.warn('[Analytics] Background view refresh failed:', err.message);
    });

    res.status(200).json({ success: true, message: `Session ${id} is COMPLETED.` });
  }

  /**
   * Generates exportable QR code (PNG, SVG, or Data URL) with custom expiration window.
   */
  static async exportQr(req: AuthenticatedRequest, res: Response): Promise<void> {
    const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
    const format = (req.query.format as 'png' | 'svg' | 'dataUrl') || 'dataUrl';
    const expiresInSeconds = parseInt(req.query.expiresInSeconds as string || '300', 10);

    const db = await getDb();
    const sessionRes = await db.query('SELECT id, status FROM sessions WHERE id = $1', [id]);

    if (sessionRes.rows.length === 0) {
      res.status(404).json({ error: 'SESSION_NOT_FOUND' });
      return;
    }

    const { payload, tokenObj } = QrService.generateSessionBroadcastPayload(id, expiresInSeconds, true);
    const rendered = await QrService.renderQrCode(payload, format);

    if (format === 'png') {
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Disposition', `inline; filename="session-${id}-qr.png"`);
      res.send(rendered);
    } else if (format === 'svg') {
      res.setHeader('Content-Type', 'image/svg+xml');
      res.send(rendered);
    } else {
      res.status(200).json({
        sessionId: id,
        qrPayload: payload,
        dataUrl: rendered,
        expiresAt: tokenObj.exp,
        expiresInSeconds,
        timestamp: tokenObj.timestamp
      });
    }
  }

  /**
   * Returns current active QR code payload for a session.
   */
  static async getActiveQr(req: AuthenticatedRequest, res: Response): Promise<void> {
    const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
    const { payload, tokenObj } = QrService.generateSessionBroadcastPayload(id);
    const dataUrl = await QrService.renderQrCode(payload, 'dataUrl');

    res.status(200).json({
      sessionId: id,
      qrPayload: payload,
      dataUrl,
      timestamp: tokenObj.timestamp,
      expiresAt: tokenObj.exp,
      expiresInSeconds: tokenObj.exp - tokenObj.timestamp
    });
  }
}
