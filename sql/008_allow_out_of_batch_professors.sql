-- ==============================================================================
-- 008_allow_out_of_batch_professors.sql
-- Allow professors to mark attendance out-of-batch with dedicated audit tracking
-- ==============================================================================

ALTER TABLE attendance_records DROP CONSTRAINT IF EXISTS attendance_records_marked_by_check;
ALTER TABLE attendance_records ADD CONSTRAINT attendance_records_marked_by_check 
    CHECK (marked_by IN ('SYSTEM', 'PROFESSOR', 'PROFESSOR_OUT_OF_BATCH', 'ADMIN'));
