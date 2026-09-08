import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { FlowService } from '../services/flow.service.js';
import { getDb } from '../database/db.js';
import { requireSessionAccess } from '../services/access.service.js';

export class FlowController {
  static async getStudentFlow(req: AuthenticatedRequest, res: Response): Promise<void> {
    const sessionId = req.query.sessionId as string;
    const studentId = req.user?.userId;

    if (!sessionId) {
      res.status(400).json({ error: 'MISSING_SESSION_ID', message: 'sessionId query parameter is required.' });
      return;
    }

    if (!studentId) {
      res.status(401).json({ error: 'AUTHENTICATION_REQUIRED' });
      return;
    }

    // Hardware capabilities declared by client device
    const capabilities = {
      hasHardwareGps: req.query.hasGps !== 'false',
      hasCamera: req.query.hasCamera !== 'false',
      hasBle: req.query.hasBle === 'true',
      platform: (req.query.platform as any) || 'android'
    };

    try {
      await requireSessionAccess(req.user!, sessionId);
      const flowConfig = await FlowService.generateStudentFlow(sessionId, studentId, capabilities);
      res.status(200).json(flowConfig);
    } catch (err: any) {
      res.status(err.statusCode || 400).json({ error: 'FLOW_GENERATION_FAILED', message: err.message });
    }
  }

  static async getProfessorFlow(req: AuthenticatedRequest, res: Response): Promise<void> {
    const sessionId = req.query.sessionId as string;

    if (!sessionId) {
      res.status(400).json({ error: 'MISSING_SESSION_ID', message: 'sessionId query parameter is required.' });
      return;
    }

    try {
      await requireSessionAccess(req.user!, sessionId, true);
      const professorFlow = await FlowService.generateProfessorFlow(sessionId);
      res.status(200).json(professorFlow);
    } catch (err: any) {
      res.status(err.statusCode || 400).json({ error: 'FLOW_GENERATION_FAILED', message: err.message });
    }
  }

  static async updateSessionPolicy(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { sessionId } = req.params;
    const policyOverride = req.body;

    if (!sessionId) {
      res.status(400).json({ error: 'MISSING_SESSION_ID' });
      return;
    }

    const db = await getDb();
    await requireSessionAccess(req.user!, String(sessionId), true);
    await db.query(
      `UPDATE sessions SET verification_policy_override = $1 WHERE id = $2`,
      [JSON.stringify(policyOverride), sessionId]
    );

    res.status(200).json({
      success: true,
      message: `Verification policy updated for session ${sessionId}. Changes propagate immediately to all student clients.`,
      updatedPolicy: policyOverride
    });
  }
}
