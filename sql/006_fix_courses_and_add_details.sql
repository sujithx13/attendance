-- ==============================================================================
-- 006_fix_courses_and_add_details.sql
-- Fixes courses table by adding department_id, professor_id, and academic details
-- ==============================================================================

-- 1. Add missing relational columns to courses
ALTER TABLE courses ADD COLUMN IF NOT EXISTS department_id VARCHAR(64) REFERENCES departments(id) ON DELETE SET NULL;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS professor_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS title VARCHAR(255);
ALTER TABLE courses ADD COLUMN IF NOT EXISTS credits INT DEFAULT 4;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS prerequisites TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS syllabus TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS learning_outcomes TEXT;

-- 2. Populate title from name if title is null
UPDATE courses SET title = name WHERE title IS NULL;

-- 3. Link existing seeded courses to CSE department and Prof. Alan Turing
UPDATE courses
SET department_id = (SELECT id FROM departments WHERE code = 'CSE' LIMIT 1),
    professor_id = (SELECT id FROM users WHERE email = 'prof.alan@university.edu' OR id = 'usr_prof_alan' LIMIT 1),
    credits = 4,
    description = 'Comprehensive core curriculum course covering fundamental computational structures, theoretical foundations, and modern software engineering paradigms.',
    prerequisites = 'Basic Mathematics & Fundamentals of Computing',
    syllabus = 'Unit I: Core Constructs & Architecture\nUnit II: Advanced Data Structures & Dynamic Allocation\nUnit III: Optimization & Complexity Analysis\nUnit IV: Applied Laboratory Practicums',
    learning_outcomes = 'Mastery of algorithmic complexity, rigorous design patterns, and hands-on system verification.'
WHERE department_id IS NULL;

-- 4. Create index for fast departmental and faculty queries
CREATE INDEX IF NOT EXISTS idx_courses_dept_id ON courses(department_id);
CREATE INDEX IF NOT EXISTS idx_courses_prof_id ON courses(professor_id);
