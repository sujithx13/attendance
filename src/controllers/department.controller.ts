import { Request, Response, NextFunction } from 'express';
import { DepartmentService } from '../services/department.service.js';

export class DepartmentController {
  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const departments = await DepartmentService.listDepartments();
      res.json({ departments });
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { code, name } = req.body;
      if (!code || !name) {
        res.status(400).json({ error: 'code and name are required.' });
        return;
      }

      const department = await DepartmentService.createDepartment(code, name);
      res.status(201).json({ message: 'Department created successfully.', department });
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
      const { code, name } = req.body;
      const updated = await DepartmentService.updateDepartment(id, code, name);
      if (!updated) {
        res.status(404).json({ error: 'Department not found.' });
        return;
      }
      res.json({ message: 'Department updated successfully.', department: updated });
    } catch (err) {
      next(err);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
      const success = await DepartmentService.deleteDepartment(id);
      if (!success) {
        res.status(404).json({ error: 'Department not found.' });
        return;
      }
      res.json({ message: 'Department deleted successfully.', deletedId: id });
    } catch (err) {
      next(err);
    }
  }
}
