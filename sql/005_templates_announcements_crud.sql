-- ==============================================================================
-- 005_templates_announcements_crud.sql
-- Adds Timetable Templates, Template Slots, and Cohort Announcements
-- ==============================================================================

-- 1. Timetable Templates Table
CREATE TABLE IF NOT EXISTS timetable_templates (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    target_type VARCHAR(20) CHECK (target_type IN ('CLASS', 'BATCH')),
    target_id VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Timetable Template Slots Table
CREATE TABLE IF NOT EXISTS timetable_template_slots (
    id VARCHAR(64) PRIMARY KEY,
    template_id VARCHAR(64) NOT NULL REFERENCES timetable_templates(id) ON DELETE CASCADE,
    day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    subject_name VARCHAR(255) NOT NULL,
    classroom_id VARCHAR(64) REFERENCES classrooms(id) ON DELETE SET NULL,
    professor_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_template_slots_template_id ON timetable_template_slots(template_id);

-- 3. Announcements Table
CREATE TABLE IF NOT EXISTS announcements (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'GENERAL' CHECK (priority IN ('GENERAL', 'ACADEMIC', 'URGENT')),
    scope_type VARCHAR(20) NOT NULL CHECK (scope_type IN ('CAMPUS', 'DEPARTMENT', 'CLASS', 'BATCH')),
    scope_id VARCHAR(64),
    author_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_announcements_scope ON announcements(scope_type, scope_id);
CREATE INDEX IF NOT EXISTS idx_announcements_priority ON announcements(priority);
