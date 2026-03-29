-- Run this to add user authentication tables
CREATE TABLE IF NOT EXISTS sn_users (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  avatar_url    TEXT,
  provider      TEXT DEFAULT 'credentials',
  last_login    TIMESTAMP,
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON sn_users(email);
