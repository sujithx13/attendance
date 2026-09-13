-- One occurrence per timetable slot and campus day. Existing sessions are adopted lazily.
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS attendance_date DATE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS scheduled_start_at TIMESTAMPTZ;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS scheduled_end_at TIMESTAMPTZ;
CREATE UNIQUE INDEX IF NOT EXISTS idx_session_daily_occurrence ON sessions(timetable_slot_id, attendance_date) WHERE attendance_date IS NOT NULL;
