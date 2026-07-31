-- ==============================================================================
-- 004_departments_batches_timetables.sql
-- Academic Hierarchy, Batches, and Timetable Scheduling Engine
-- ==============================================================================

-- 1. Departments Table
CREATE TABLE IF NOT EXISTS departments (
    id VARCHAR(36) PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,       -- e.g. 'CSE', 'MECH', 'ECE', 'IT'
    name VARCHAR(150) NOT NULL,              -- e.g. 'Computer Science & Engineering'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_departments_code ON departments(code);

-- 2. Alter Users Table to add Department and Year of Study
ALTER TABLE users ADD COLUMN IF NOT EXISTS department_id VARCHAR(36) REFERENCES departments(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS year_of_study INT CHECK (year_of_study BETWEEN 1 AND 5);

CREATE INDEX IF NOT EXISTS idx_users_department ON users(department_id);
CREATE INDEX IF NOT EXISTS idx_users_year ON users(year_of_study);

-- 3. Batches Table (Flexible Multi-Department / Multi-Year Cohorts)
CREATE TABLE IF NOT EXISTS batches (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,              -- e.g. 'Robotics & AI Honors Batch'
    code VARCHAR(50) UNIQUE NOT NULL,        -- e.g. 'BATCH-AI-2026'
    department_id VARCHAR(36) REFERENCES departments(id) ON DELETE SET NULL, -- Primary department (optional if cross-dept)
    professor_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,       -- Assigned Faculty
    allow_cross_department BOOLEAN DEFAULT FALSE,
    allow_multiple_years BOOLEAN DEFAULT FALSE,
    allowed_years INT[],                                 -- e.g. ARRAY[3, 4]
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_batches_department ON batches(department_id);
CREATE INDEX IF NOT EXISTS idx_batches_professor ON batches(professor_id);

-- 4. Batch Members Join Table
CREATE TABLE IF NOT EXISTS batch_members (
    id VARCHAR(64) PRIMARY KEY,
    batch_id VARCHAR(64) NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    student_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(batch_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_batch_members_batch ON batch_members(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_members_student ON batch_members(student_id);

-- 5. Timetable Slots (Master Weekly Repeating Schedule & Daily Custom Schedules)
CREATE TABLE IF NOT EXISTS timetable_slots (
    id VARCHAR(64) PRIMARY KEY,
    schedule_type VARCHAR(20) NOT NULL CHECK (schedule_type IN ('RECURRING_WEEKLY', 'SPECIFIC_DATE')),
    day_of_week INT CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
    specific_date DATE,                                  -- Set when schedule_type = 'SPECIFIC_DATE'
    start_time TIME NOT NULL,                            -- e.g. '09:00:00'
    end_time TIME NOT NULL,                              -- e.g. '10:00:00'
    target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('CLASS', 'BATCH')),
    course_id VARCHAR(36) REFERENCES courses(id) ON DELETE CASCADE,
    batch_id VARCHAR(64) REFERENCES batches(id) ON DELETE CASCADE,
    professor_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    classroom_id VARCHAR(36) NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,
    effective_from DATE DEFAULT CURRENT_DATE,
    effective_until DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_timetable_day ON timetable_slots(day_of_week);
CREATE INDEX IF NOT EXISTS idx_timetable_date ON timetable_slots(specific_date);
CREATE INDEX IF NOT EXISTS idx_timetable_professor ON timetable_slots(professor_id);
CREATE INDEX IF NOT EXISTS idx_timetable_classroom ON timetable_slots(classroom_id);

-- 6. Link Sessions to either Course (Class) OR Batch
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS batch_id VARCHAR(64) REFERENCES batches(id) ON DELETE CASCADE;
ALTER TABLE sessions ALTER COLUMN course_id DROP NOT NULL;

-- 7. Ensure column length upgrades if tables were created with VARCHAR(36)
ALTER TABLE batches ALTER COLUMN id TYPE VARCHAR(64);
ALTER TABLE batch_members ALTER COLUMN id TYPE VARCHAR(64);
ALTER TABLE batch_members ALTER COLUMN batch_id TYPE VARCHAR(64);
ALTER TABLE timetable_slots ALTER COLUMN id TYPE VARCHAR(64);
ALTER TABLE timetable_slots ALTER COLUMN batch_id TYPE VARCHAR(64);
ALTER TABLE sessions ALTER COLUMN batch_id TYPE VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_sessions_batch ON sessions(batch_id);
