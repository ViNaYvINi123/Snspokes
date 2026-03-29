-- snspokes v15 migrations

-- Teams
CREATE TABLE IF NOT EXISTS sn_teams (
  id         SERIAL PRIMARY KEY,
  owner_id   INTEGER REFERENCES sn_users(id) ON DELETE CASCADE,
  name       VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sn_team_members (
  id         SERIAL PRIMARY KEY,
  team_id    INTEGER REFERENCES sn_teams(id) ON DELETE CASCADE,
  user_id    INTEGER REFERENCES sn_users(id) ON DELETE CASCADE,
  role       VARCHAR(20) DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

CREATE TABLE IF NOT EXISTS sn_team_invites (
  id         SERIAL PRIMARY KEY,
  team_id    INTEGER REFERENCES sn_teams(id) ON DELETE CASCADE,
  email      VARCHAR(255) NOT NULL,
  token      VARCHAR(255) UNIQUE NOT NULL,
  accepted   BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, email)
);

-- Spoke source field (community submissions)
ALTER TABLE sn_spokes ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'official';

-- User provider fields (for OAuth)
ALTER TABLE sn_users ADD COLUMN IF NOT EXISTS provider VARCHAR(50);
ALTER TABLE sn_users ADD COLUMN IF NOT EXISTS provider_id VARCHAR(255);
-- Allow null password for OAuth users
ALTER TABLE sn_users ALTER COLUMN password_hash DROP NOT NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_teams_owner ON sn_teams(owner_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team ON sn_team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_invites_token ON sn_team_invites(token);

COMMENT ON TABLE sn_teams IS 'Enterprise team accounts';
COMMENT ON TABLE sn_team_members IS 'Team membership';
COMMENT ON TABLE sn_team_invites IS 'Pending team invitations';
