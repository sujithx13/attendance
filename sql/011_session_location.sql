ALTER TABLE sessions ADD COLUMN IF NOT EXISTS origin_latitude DOUBLE PRECISION;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS origin_longitude DOUBLE PRECISION;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS origin_accuracy_meters DOUBLE PRECISION;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS origin_radius_meters DOUBLE PRECISION;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS origin_captured_at TIMESTAMPTZ;
ALTER TABLE sessions ADD CONSTRAINT session_origin_valid CHECK (
  (origin_latitude IS NULL AND origin_longitude IS NULL AND origin_accuracy_meters IS NULL AND origin_radius_meters IS NULL AND origin_captured_at IS NULL)
  OR (origin_latitude IS NOT NULL AND origin_longitude IS NOT NULL AND origin_accuracy_meters IS NOT NULL AND origin_radius_meters IS NOT NULL
      AND origin_latitude BETWEEN -90 AND 90 AND origin_longitude BETWEEN -180 AND 180
      AND origin_accuracy_meters BETWEEN 0 AND 50 AND origin_radius_meters BETWEEN 25 AND 300 AND origin_captured_at IS NOT NULL)
);
