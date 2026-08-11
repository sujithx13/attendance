import { Request, Response, NextFunction } from 'express';
import { TimetableService } from '../services/timetable.service.js';
import { ScheduleType, TargetType } from '../types/timetable.types.js';

export class TimetableController {
  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dayOfWeek = req.query.dayOfWeek !== undefined ? parseInt(req.query.dayOfWeek as string, 10) : undefined;
      const specificDate = typeof req.query.specificDate === 'string' ? req.query.specificDate : undefined;
      const targetType = typeof req.query.targetType === 'string' ? req.query.targetType as TargetType : undefined;
      const professorId = typeof req.query.professorId === 'string' ? req.query.professorId : undefined;
      const scheduleType = typeof req.query.scheduleType === 'string' ? req.query.scheduleType as ScheduleType : undefined;

      const slots = await TimetableService.listSlots({
        dayOfWeek,
        specificDate,
        targetType,
        professorId,
        scheduleType
      });

      res.json({ slots });
    } catch (err) {
      next(err);
    }
  }

  static async createSlot(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        scheduleType,
        dayOfWeek,
        specificDate,
        startTime,
        endTime,
        targetType,
        courseId,
        batchId,
        professorId,
        classroomId,
        effectiveFrom,
        effectiveUntil
      } = req.body;

      if (!scheduleType || !startTime || !endTime || !targetType || !professorId || !classroomId) {
        res.status(400).json({
          error: 'scheduleType, startTime, endTime, targetType, professorId, and classroomId are required.'
        });
        return;
      }

      const slot = await TimetableService.createSlot({
        scheduleType,
        dayOfWeek: dayOfWeek !== undefined ? parseInt(dayOfWeek, 10) : undefined,
        specificDate,
        startTime,
        endTime,
        targetType,
        courseId,
        batchId,
        professorId,
        classroomId,
        effectiveFrom,
        effectiveUntil
      });

      res.status(201).json({ message: 'Timetable slot created successfully.', slot });
    } catch (err) {
      next(err);
    }
  }

  static async deleteSlot(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
      await TimetableService.deleteSlot(id);
      res.json({ message: 'Timetable slot deactivated successfully.' });
    } catch (err) {
      next(err);
    }
  }

  static async generateSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const targetDateStr = req.body.date || new Date().toISOString().slice(0, 10);
      const targetDate = new Date(targetDateStr);

      const result = await TimetableService.generateSessionsForDate(targetDate);
      res.json({
        message: `Successfully generated ${result.createdCount} sessions for ${targetDateStr}.`,
        createdCount: result.createdCount,
        sessions: result.sessions
      });
    } catch (err) {
      next(err);
    }
  }
}
