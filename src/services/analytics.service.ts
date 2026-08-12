import { getDb } from '../database/db.js';
import { refreshMaterializedViews } from '../database/materialized-views.js';

export interface StudentAttendanceSummary {
  studentId: string;
  studentName: string;
  enrollmentId: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  totalSessionsHeld: number;
  attendedSessions: number;
  challengedSessions: number;
  absentSessions: number;
  attendancePercentage: number;
  lastAttendedAt?: string;
  isEligibleForExam: boolean; // Institutional requirement: percentage >= 75%
}

export class AnalyticsService {
  /**
   * Retrieves high-performance attendance percentage for a student across courses.
   * Utilizes PostgreSQL Materialized Views for sub-millisecond query execution.
   */
  static async getStudentAttendanceSummary(studentId: string): Promise<StudentAttendanceSummary[]> {
    const db = await getDb();

    try {
      const res = await db.query(
        `SELECT * FROM mv_student_course_attendance WHERE student_id = $1 ORDER BY course_code ASC`,
        [studentId]
      );

      return res.rows.map((row) => {
        const pct = parseFloat(row.attendance_percentage || '0');
        return {
          studentId: row.student_id,
          studentName: row.student_name,
          enrollmentId: row.enrollment_id,
          courseId: row.course_id,
          courseCode: row.course_code,
          courseName: row.course_name,
          totalSessionsHeld: parseInt(row.total_sessions_held || '0', 10),
          attendedSessions: parseInt(row.attended_sessions || '0', 10),
          challengedSessions: parseInt(row.challenged_sessions || '0', 10),
          absentSessions: parseInt(row.absent_sessions || '0', 10),
          attendancePercentage: pct,
          lastAttendedAt: row.last_attended_at,
          isEligibleForExam: pct >= 75.0
        };
      });
    } catch (err: any) {
      console.warn('[Analytics] Materialized view query failed, falling back to direct table join:', err.message);
      // Fallback direct join
      const res = await db.query(
        `SELECT
            e.student_id, u.full_name AS student_name, u.enrollment_id,
            c.id AS course_id, c.code AS course_code, c.name AS course_name,
            COUNT(DISTINCT s.id) FILTER (WHERE s.status IN ('ACTIVE', 'COMPLETED')) AS total_sessions_held,
            COUNT(DISTINCT ar.id) FILTER (WHERE ar.status IN ('PRESENT', 'LATE')) AS attended_sessions,
            COUNT(DISTINCT ar.id) FILTER (WHERE ar.status = 'CHALLENGED') AS challenged_sessions,
            COUNT(DISTINCT ar.id) FILTER (WHERE ar.status = 'ABSENT') AS absent_sessions
         FROM enrollments e
         JOIN users u ON e.student_id = u.id
         JOIN courses c ON e.course_id = c.id
         LEFT JOIN sessions s ON s.course_id = c.id
         LEFT JOIN attendance_records ar ON ar.session_id = s.id AND ar.student_id = e.student_id
         WHERE e.student_id = $1 AND e.status = 'ACTIVE'
         GROUP BY e.student_id, u.full_name, u.enrollment_id, c.id, c.code, c.name`,
        [studentId]
      );

      return res.rows.map((row) => {
        const total = parseInt(row.total_sessions_held || '0', 10);
        const attended = parseInt(row.attended_sessions || '0', 10);
        const pct = total > 0 ? Math.round((attended / total) * 10000) / 100 : 0.0;
        return {
          studentId: row.student_id,
          studentName: row.student_name,
          enrollmentId: row.enrollment_id,
          courseId: row.course_id,
          courseCode: row.course_code,
          courseName: row.course_name,
          totalSessionsHeld: total,
          attendedSessions: attended,
          challengedSessions: parseInt(row.challenged_sessions || '0', 10),
          absentSessions: parseInt(row.absent_sessions || '0', 10),
          attendancePercentage: pct,
          isEligibleForExam: pct >= 75.0
        };
      });
    }
  }

  /**
   * Retrieves summary analytics for an individual session (for professor view).
   */
  static async getSessionStats(sessionId: string): Promise<any> {
    const db = await getDb();

    try {
      const res = await db.query(
        `SELECT * FROM mv_session_attendance_stats WHERE session_id = $1`,
        [sessionId]
      );
      if (res.rows.length > 0) return res.rows[0];
    } catch {
      // Fallback
    }

    const fallbackRes = await db.query(
      `SELECT
          s.id AS session_id, s.course_id, c.code AS course_code,
          COUNT(DISTINCT e.student_id) AS total_enrolled,
          COUNT(DISTINCT aa.id) AS total_attempts,
          COUNT(DISTINCT ar.id) FILTER (WHERE ar.status IN ('PRESENT', 'LATE')) AS present_count,
          COUNT(DISTINCT ar.id) FILTER (WHERE ar.status = 'CHALLENGED') AS challenged_count,
          COUNT(DISTINCT ar.id) FILTER (WHERE ar.status = 'ABSENT') AS absent_count
       FROM sessions s
       JOIN courses c ON s.course_id = c.id
       LEFT JOIN enrollments e ON e.course_id = s.course_id AND e.status = 'ACTIVE'
       LEFT JOIN attendance_attempts aa ON aa.session_id = s.id
       LEFT JOIN attendance_records ar ON ar.session_id = s.id
       WHERE s.id = $1
       GROUP BY s.id, s.course_id, c.code`,
      [sessionId]
    );

    return fallbackRes.rows[0] || null;
  }

  /**
   * Triggers background or on-demand refresh of PostgreSQL Materialized Views.
   */
  static async refreshViews(): Promise<void> {
    await refreshMaterializedViews(true);
  }
}
