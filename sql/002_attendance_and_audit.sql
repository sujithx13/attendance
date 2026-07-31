-- ==============================================================================
-- 002_attendance_and_audit.sql
-- High-Velocity Attendance Attempts, Records, Security Violations, and Nonces
-- ==============================================================================

-- 1. Cryptographic QR Nonces Table (Replay attack mitigation)
CREATE TABLE IF NOT EXISTS used_qr_nonces (
    nonce VARCHAR(64) PRIMARY KEY,
    session_id VARCHAR(36) NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    student_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_qr_nonces_expiry ON used_qr_nonces(expires_at);

-- 2. Attendance Attempts Table (High-velocity attempt audit ledger)
-- Stores full telemetry, spatial calculations, and step-by-step diagnostics
CREATE TABLE IF NOT EXISTS attendance_attempts (
    id VARCHAR(36) PRIMARY KEY,
    session_id VARCHAR(36) NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    student_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id VARCHAR(100),
    client_timestamp TIMESTAMP WITH TIME ZONE,
    server_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    submitted_qr_payload TEXT,
    submitted_latitude DOUBLE PRECISION,
    submitted_longitude DOUBLE PRECISION,
    submitted_accuracy DOUBLE PRECISION,
    distance_meters DOUBLE PRECISION,
    telemetry_data JSONB,
    ble_beacons_detected TEXT[],
    biometric_match_score DOUBLE PRECISION,
    biometric_verified BOOLEAN DEFAULT FALSE,
    validation_results JSONB NOT NULL,
    decision VARCHAR(20) NOT NULL CHECK (decision IN ('ACCEPT', 'CHALLENGE', 'REJECT')),
    decision_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_attempts_session ON attendance_attempts(session_id);
CREATE INDEX IF NOT EXISTS idx_attempts_student ON attendance_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_attempts_decision ON attendance_attempts(decision);
CREATE INDEX IF NOT EXISTS idx_attempts_created_at ON attendance_attempts(created_at);

-- 3. Attendance Records Table (Finalized official ledger)
CREATE TABLE IF NOT EXISTS attendance_records (
    id VARCHAR(36) PRIMARY KEY,
    session_id VARCHAR(36) NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    student_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    attempt_id VARCHAR(36) REFERENCES attendance_attempts(id),
    status VARCHAR(20) NOT NULL CHECK (status IN ('PRESENT', 'LATE', 'CHALLENGED', 'EXCUSED', 'ABSENT')),
    marked_by VARCHAR(20) DEFAULT 'SYSTEM' CHECK (marked_by IN ('SYSTEM', 'PROFESSOR', 'ADMIN')),
    verified_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(session_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_records_session ON attendance_records(session_id);
CREATE INDEX IF NOT EXISTS idx_records_student ON attendance_records(student_id);
CREATE INDEX IF NOT EXISTS idx_records_status ON attendance_records(status);

-- 4. Security Violations Table (GPS Spoofing, Mock Providers, Nonce Replay, Signature Forgery)
CREATE TABLE IF NOT EXISTS security_violations (
    id VARCHAR(36) PRIMARY KEY,
    student_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
    session_id VARCHAR(36) REFERENCES sessions(id) ON DELETE SET NULL,
    attempt_id VARCHAR(36) REFERENCES attendance_attempts(id) ON DELETE SET NULL,
    violation_type VARCHAR(50) NOT NULL,
    details JSONB NOT NULL,
    severity VARCHAR(20) DEFAULT 'HIGH' CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_violations_student ON security_violations(student_id);
CREATE INDEX IF NOT EXISTS idx_violations_type ON security_violations(violation_type);
CREATE INDEX IF NOT EXISTS idx_violations_created_at ON security_violations(created_at);
