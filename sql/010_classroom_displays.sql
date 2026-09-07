CREATE TABLE IF NOT EXISTS classroom_displays (
  id TEXT PRIMARY KEY,
  code_hash TEXT NOT NULL UNIQUE,
  secret_hash TEXT NOT NULL UNIQUE,
  session_id VARCHAR(36) REFERENCES sessions(id) ON DELETE CASCADE,
  owner_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_classroom_displays_session ON classroom_displays(session_id);
