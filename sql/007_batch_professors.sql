-- ==============================================================================
-- 007_batch_professors.sql
-- Enables multiple professors / teachers to be assigned to and mentor a batch
-- ==============================================================================

CREATE TABLE IF NOT EXISTS batch_professors (
    id VARCHAR(64) PRIMARY KEY,
    batch_id VARCHAR(64) REFERENCES batches(id) ON DELETE CASCADE,
    professor_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'INSTRUCTOR', -- 'LEAD_MENTOR', 'CO_INSTRUCTOR', 'LAB_COORDINATOR'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(batch_id, professor_id)
);

CREATE INDEX IF NOT EXISTS idx_batch_professors_batch_id ON batch_professors(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_professors_prof_id ON batch_professors(professor_id);

-- Migrate existing batches.professor_id as LEAD_MENTOR
INSERT INTO batch_professors (id, batch_id, professor_id, role)
SELECT 'bp_' || b.id || '_' || b.professor_id, b.id, b.professor_id, 'LEAD_MENTOR'
FROM batches b
WHERE b.professor_id IS NOT NULL
ON CONFLICT (batch_id, professor_id) DO NOTHING;
