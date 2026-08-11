import { Request, Response } from 'express';
import { getDb } from '../database/db.js';

export class CourseController {
  static async list(req: Request, res: Response): Promise<void> {
    const { departmentId } = req.query;
    const db = await getDb();

    let query = `
      SELECT c.id, c.code,
             COALESCE(c.title, c.name) AS title,
             COALESCE(c.name, c.title) AS name,
             c.department_id, c.professor_id,
             COALESCE(c.credits, 4) AS credits,
             c.description, c.prerequisites, c.syllabus, c.learning_outcomes,
             d.code AS department_code, d.name AS department_name,
             u.full_name AS professor_name, u.email AS professor_email,
             COUNT(DISTINCT e.student_id)::int AS student_count
      FROM courses c
      LEFT JOIN departments d ON c.department_id = d.id
      LEFT JOIN users u ON c.professor_id = u.id
      LEFT JOIN enrollments e ON c.id = e.course_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (departmentId) {
      params.push(departmentId);
      query += ` AND c.department_id = $${params.length}`;
    }

    query += ` GROUP BY c.id, c.code, c.title, c.name, c.department_id, c.professor_id, c.credits, c.description, c.prerequisites, c.syllabus, c.learning_outcomes, d.code, d.name, u.full_name, u.email
               ORDER BY c.code ASC`;

    const result = await db.query(query, params);
    res.json({ courses: result.rows });
  }

  static async create(req: Request, res: Response): Promise<void> {
    const { code, title, departmentId, professorId, credits, description, prerequisites, syllabus, learningOutcomes } = req.body;

    if (!code || !title || !professorId) {
      res.status(400).json({ error: 'MISSING_FIELDS', message: 'Course code, title, and professorId are required.' });
      return;
    }

    const db = await getDb();
    const courseId = `crs_${code.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now().toString(36)}`;
    const cleanTitle = title.trim();

    await db.query(
      `INSERT INTO courses (id, code, name, title, department, semester, academic_year, department_id, professor_id, credits, description, prerequisites, syllabus, learning_outcomes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        courseId,
        code.toUpperCase().trim(),
        cleanTitle,
        cleanTitle,
        'Computer Science',
        'Fall',
        '2026',
        departmentId || null,
        professorId,
        credits ? Number(credits) : 4,
        description || 'Comprehensive university curriculum course.',
        prerequisites || 'Prerequisites as specified by department curriculum committee.',
        syllabus || 'Standard Course Syllabus.',
        learningOutcomes || 'Rigorous theoretical mastery and empirical validation.'
      ]
    );

    res.status(201).json({ message: 'Course created successfully.', courseId });
  }

  static async update(req: Request, res: Response): Promise<void> {
    const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
    const { code, title, departmentId, professorId, credits, description, prerequisites, syllabus, learningOutcomes } = req.body;
    const db = await getDb();

    await db.query(
      `UPDATE courses
       SET code = COALESCE($1, code),
           title = COALESCE($2, title),
           name = COALESCE($2, name),
           department_id = COALESCE($3, department_id),
           professor_id = COALESCE($4, professor_id),
           credits = COALESCE($5, credits),
           description = COALESCE($6, description),
           prerequisites = COALESCE($7, prerequisites),
           syllabus = COALESCE($8, syllabus),
           learning_outcomes = COALESCE($9, learning_outcomes)
       WHERE id = $10`,
      [
        code ? code.toUpperCase().trim() : null,
        title ? title.trim() : null,
        departmentId || null,
        professorId || null,
        credits ? Number(credits) : null,
        description || null,
        prerequisites || null,
        syllabus || null,
        learningOutcomes || null,
        id
      ]
    );

    res.json({ message: 'Course updated successfully.' });
  }

  static async delete(req: Request, res: Response): Promise<void> {
    const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
    const db = await getDb();

    await db.query('DELETE FROM timetable_slots WHERE course_id = $1', [id]);
    await db.query('DELETE FROM enrollments WHERE course_id = $1', [id]);
    await db.query('DELETE FROM courses WHERE id = $1', [id]);

    res.json({ message: 'Course deleted successfully.', deletedId: id });
  }

  static async getStudents(req: Request, res: Response): Promise<void> {
    const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
    const db = await getDb();

    const result = await db.query(
      `SELECT u.id, u.full_name AS "fullName", u.email, u.enrollment_id AS "enrollmentId",
              u.year_of_study AS "yearOfStudy", d.code AS "departmentCode"
       FROM enrollments e
       JOIN users u ON e.student_id = u.id
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE e.course_id = $1
       ORDER BY u.full_name ASC`,
      [id]
    );

    res.json({ students: result.rows });
  }

  static async enrollStudent(req: Request, res: Response): Promise<void> {
    const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
    const { studentId } = req.body;
    const db = await getDb();

    const enrollmentId = `enr_${id}_${studentId}`.slice(0, 36);
    await db.query(
      `INSERT INTO enrollments (id, course_id, student_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (course_id, student_id) DO NOTHING`,
      [enrollmentId, id, studentId]
    );

    res.status(201).json({ message: 'Student enrolled in course successfully.' });
  }

  static async removeStudent(req: Request, res: Response): Promise<void> {
    const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
    const studentId = (Array.isArray(req.params.studentId) ? req.params.studentId[0] : req.params.studentId) as string;
    const db = await getDb();

    await db.query('DELETE FROM enrollments WHERE course_id = $1 AND student_id = $2', [id, studentId]);

    res.json({ message: 'Student removed from course successfully.' });
  }
}
