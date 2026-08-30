import { Request, Response, NextFunction } from 'express';
import { BatchService } from '../services/batch.service.js';

export class BatchController {
  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        name,
        code,
        departmentId,
        professorId,
        allowCrossDepartment,
        allowMultipleYears,
        allowedYears,
        description
      } = req.body;

      if (!name || !code) {
        res.status(400).json({ error: 'name and code are required to create a batch.' });
        return;
      }

      const batch = await BatchService.createBatch({
        name,
        code,
        departmentId,
        professorId,
        allowCrossDepartment: Boolean(allowCrossDepartment),
        allowMultipleYears: Boolean(allowMultipleYears),
        allowedYears: Array.isArray(allowedYears) ? allowedYears : undefined,
        description
      });

      res.status(201).json({ message: 'Batch created successfully.', batch });
    } catch (err: any) {
      if (err.message && err.message.includes('unique constraint')) {
        res.status(409).json({ error: 'A batch with this code already exists.' });
        return;
      }
      next(err);
    }
  }

  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const departmentId = typeof req.query.departmentId === 'string' ? req.query.departmentId : undefined;
      const professorId = typeof req.query.professorId === 'string' ? req.query.professorId : undefined;

      const batches = await BatchService.listBatches(departmentId, professorId);
      res.json({ batches });
    } catch (err) {
      next(err);
    }
  }

  static async getMyBatches(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      const role = req.user?.role;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized.' });
        return;
      }

      let batches: any[] = [];
      if (role === 'STUDENT') {
        batches = await BatchService.getStudentBatches(userId);
      } else {
        batches = await BatchService.getProfessorBatches(userId);
      }

      res.json({ batches });
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
      const batch = await BatchService.getBatchById(id);

      if (!batch) {
        res.status(404).json({ error: 'Batch not found.' });
        return;
      }

      const members = await BatchService.getBatchMembers(id);
      res.json({ batch, members });
    } catch (err) {
      next(err);
    }
  }

  static async addStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const batchId = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
      const { studentId } = req.body;

      if (!studentId) {
        res.status(400).json({ error: 'studentId is required.' });
        return;
      }

      await BatchService.addStudentToBatch(batchId, studentId);
      res.json({ message: 'Student successfully enrolled in batch.' });
    } catch (err: any) {
      if (err.message && (err.message.includes('mismatch') || err.message.includes('restricted') || err.message.includes('permits'))) {
        res.status(422).json({ error: err.message });
        return;
      }
      next(err);
    }
  }

  static async getMembers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const batchId = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
      const members = await BatchService.getBatchMembers(batchId);
      res.json({ members });
    } catch (err) {
      next(err);
    }
  }

  static async removeStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const batchId = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
      const studentId = (Array.isArray(req.params.studentId) ? req.params.studentId[0] : req.params.studentId) as string;
      const removed = await BatchService.removeStudentFromBatch(batchId, studentId);
      res.json({ message: 'Student removed from batch successfully.', removed });
    } catch (err) {
      next(err);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
      const success = await BatchService.deleteBatch(id);
      if (!success) {
        res.status(404).json({ error: 'Batch not found.' });
        return;
      }
      res.json({ message: 'Batch deleted successfully.', deletedId: id });
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
      const {
        name,
        code,
        departmentId,
        professorId,
        allowCrossDepartment,
        allowMultipleYears,
        allowedYears,
        description
      } = req.body;

      const updated = await BatchService.updateBatch(id, {
        name,
        code,
        departmentId,
        professorId,
        allowCrossDepartment,
        allowMultipleYears,
        allowedYears,
        description
      });

      if (!updated) {
        res.status(404).json({ error: 'Batch not found.' });
        return;
      }

      res.json({ message: 'Batch updated successfully.', batch: updated });
    } catch (err) {
      next(err);
    }
  }

  static async getProfessors(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const batchId = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
      const professors = await BatchService.getBatchProfessors(batchId);
      res.json({ professors });
    } catch (err) {
      next(err);
    }
  }

  static async addProfessor(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const batchId = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
      const { professorId, role } = req.body;

      if (!professorId) {
        res.status(400).json({ error: 'MISSING_PROFESSOR_ID', message: 'Professor ID is required.' });
        return;
      }

      const professor = await BatchService.addProfessorToBatch(batchId, professorId, role);
      res.status(201).json({ message: 'Professor assigned to batch successfully.', professor });
    } catch (err) {
      next(err);
    }
  }

  static async removeProfessor(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const batchId = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
      const professorId = (Array.isArray(req.params.professorId) ? req.params.professorId[0] : req.params.professorId) as string;

      const removed = await BatchService.removeProfessorFromBatch(batchId, professorId);
      res.json({ message: 'Professor removed from batch successfully.', removed });
    } catch (err) {
      next(err);
    }
  }
}
