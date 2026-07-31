-- ==============================================================================
-- 003_materialized_views.sql
-- High-Performance Materialized Views for Lightning-Fast Analytics
-- Enables sub-millisecond attendance percentage queries across millions of rows
-- ==============================================================================

-- Drop existing views if refreshing schema
DROP MATERIALIZED VIEW IF EXISTS mv_student_course_attendance CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_session_attendance_stats CASCADE;

-- 1. Student Course Attendance Summary Materialized View
CREATE MATERIALIZED VIEW mv_student_course_attendance AS
SELECT
    e.student_id,
    u.full_name AS student_name,
    u.enrollment_id,
    c.id AS course_id,
    c.code AS course_code,
    c.name AS course_name,
    c.semester,
    c.academic_year,
    COUNT(DISTINCT s.id) FILTER (WHERE s.status IN ('ACTIVE', 'COMPLETED')) AS total_sessions_held,
    COUNT(DISTINCT ar.id) FILTER (WHERE ar.status IN ('PRESENT', 'LATE')) AS attended_sessions,
    COUNT(DISTINCT ar.id) FILTER (WHERE ar.status = 'CHALLENGED') AS challenged_sessions,
    COUNT(DISTINCT ar.id) FILTER (WHERE ar.status = 'ABSENT') AS absent_sessions,
    COALESCE(
        ROUND(
            (COUNT(DISTINCT ar.id) FILTER (WHERE ar.status IN ('PRESENT', 'LATE'))::NUMERIC /
             NULLIF(COUNT(DISTINCT s.id) FILTER (WHERE s.status IN ('ACTIVE', 'COMPLETED')), 0)::NUMERIC) * 100,
            2
        ),
        0.00
    ) AS attendance_percentage,
    MAX(ar.verified_at) AS last_attended_at,
    CURRENT_TIMESTAMP AS last_calculated_at
FROM enrollments e
JOIN users u ON e.student_id = u.id
JOIN courses c ON e.course_id = c.id
LEFT JOIN sessions s ON s.course_id = c.id
LEFT JOIN attendance_records ar ON ar.session_id = s.id AND ar.student_id = e.student_id
WHERE e.status = 'ACTIVE'
GROUP BY e.student_id, u.full_name, u.enrollment_id, c.id, c.code, c.name, c.semester, c.academic_year;

-- Unique composite index is strictly required for CONCURRENT refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_student_course ON mv_student_course_attendance(student_id, course_id);
CREATE INDEX IF NOT EXISTS idx_mv_student_id ON mv_student_course_attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_mv_course_id ON mv_student_course_attendance(course_id);
CREATE INDEX IF NOT EXISTS idx_mv_percentage ON mv_student_course_attendance(attendance_percentage);

-- 2. Session Attendance Statistics Materialized View
CREATE MATERIALIZED VIEW mv_session_attendance_stats AS
SELECT
    s.id AS session_id,
    s.course_id,
    c.code AS course_code,
    s.professor_id,
    u.full_name AS professor_name,
    s.classroom_id,
    clr.name AS classroom_name,
    s.start_time,
    s.end_time,
    s.status AS session_status,
    COUNT(DISTINCT e.student_id) AS total_enrolled,
    COUNT(DISTINCT aa.id) AS total_attempts,
    COUNT(DISTINCT ar.id) FILTER (WHERE ar.status IN ('PRESENT', 'LATE')) AS present_count,
    COUNT(DISTINCT ar.id) FILTER (WHERE ar.status = 'CHALLENGED') AS challenged_count,
    COUNT(DISTINCT ar.id) FILTER (WHERE ar.status = 'ABSENT') AS absent_count,
    COALESCE(
        ROUND(
            (COUNT(DISTINCT ar.id) FILTER (WHERE ar.status IN ('PRESENT', 'LATE'))::NUMERIC /
             NULLIF(COUNT(DISTINCT e.student_id), 0)::NUMERIC) * 100,
            2
        ),
        0.00
    ) AS session_attendance_percentage,
    CURRENT_TIMESTAMP AS last_calculated_at
FROM sessions s
JOIN courses c ON s.course_id = c.id
JOIN users u ON s.professor_id = u.id
JOIN classrooms clr ON s.classroom_id = clr.id
LEFT JOIN enrollments e ON e.course_id = s.course_id AND e.status = 'ACTIVE'
LEFT JOIN attendance_attempts aa ON aa.session_id = s.id
LEFT JOIN attendance_records ar ON ar.session_id = s.id
GROUP BY s.id, s.course_id, c.code, s.professor_id, u.full_name, s.classroom_id, clr.name, s.start_time, s.end_time, s.status;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_session_id ON mv_session_attendance_stats(session_id);
CREATE INDEX IF NOT EXISTS idx_mv_session_course ON mv_session_attendance_stats(course_id);
