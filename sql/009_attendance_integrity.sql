-- A classroom broadcast is shared; each student may consume it once.
ALTER TABLE used_qr_nonces DROP CONSTRAINT IF EXISTS used_qr_nonces_pkey;
ALTER TABLE used_qr_nonces ADD PRIMARY KEY (nonce, student_id);
ALTER TABLE attendance_records ALTER COLUMN marked_by TYPE VARCHAR(32);
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS timetable_slot_id VARCHAR(64) REFERENCES timetable_slots(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_slot ON sessions(timetable_slot_id, start_time);
