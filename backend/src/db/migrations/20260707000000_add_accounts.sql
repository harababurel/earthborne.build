-- migrate:up

CREATE TABLE account (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL CHECK (length(name) <= 64),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  profile_completed_at TEXT,
  last_activity_at TEXT NOT NULL
);
CREATE UNIQUE INDEX idx_account_name_lower ON account (lower(name));
CREATE INDEX idx_account_last_activity_at ON account (last_activity_at);

CREATE TABLE account_identity (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES account(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  email TEXT CHECK (email IS NULL OR length(email) <= 255),
  password_hash TEXT,
  pending_email TEXT CHECK (pending_email IS NULL OR length(pending_email) <= 255),
  verified_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_account_identity_account_id ON account_identity (account_id);
CREATE UNIQUE INDEX idx_account_identity_provider_email
  ON account_identity (provider, email) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX idx_account_identity_provider_pending_email
  ON account_identity (provider, pending_email) WHERE pending_email IS NOT NULL;

CREATE TABLE session (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES account(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  last_activity_at TEXT NOT NULL
);
CREATE INDEX idx_session_account_id ON session (account_id);
CREATE INDEX idx_session_expires_at ON session (expires_at);

CREATE TABLE verification_token (
  id TEXT PRIMARY KEY,
  account_identity_id TEXT REFERENCES account_identity(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  token_type TEXT NOT NULL CHECK (token_type IN ('email_verification', 'password_reset')),
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  UNIQUE (token_type, token_hash)
);
CREATE INDEX idx_verification_token_email ON verification_token (email);
CREATE INDEX idx_verification_token_expires_at ON verification_token (expires_at);

CREATE TABLE account_deck (
  id TEXT PRIMARY KEY CHECK (length(id) <= 64),
  account_id TEXT NOT NULL REFERENCES account(id) ON DELETE CASCADE,
  revision TEXT NOT NULL,
  data TEXT NOT NULL CHECK (length(data) <= 2097152),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_account_deck_account_id ON account_deck (account_id);

CREATE TABLE account_campaign (
  id TEXT PRIMARY KEY CHECK (length(id) <= 64),
  account_id TEXT NOT NULL REFERENCES account(id) ON DELETE CASCADE,
  revision TEXT NOT NULL,
  data TEXT NOT NULL CHECK (length(data) <= 2097152),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_account_campaign_account_id ON account_campaign (account_id);

CREATE TABLE account_folder (
  account_id TEXT PRIMARY KEY REFERENCES account(id) ON DELETE CASCADE,
  revision TEXT NOT NULL,
  state TEXT NOT NULL CHECK (length(state) <= 65536)
);

CREATE TABLE account_settings (
  account_id TEXT PRIMARY KEY REFERENCES account(id) ON DELETE CASCADE,
  revision TEXT NOT NULL,
  settings TEXT NOT NULL CHECK (length(settings) <= 65536)
);

CREATE TABLE account_achievements (
  account_id TEXT PRIMARY KEY REFERENCES account(id) ON DELETE CASCADE,
  revision TEXT NOT NULL,
  state TEXT NOT NULL CHECK (length(state) <= 65536)
);

ALTER TABLE shared_deck ADD COLUMN account_id TEXT REFERENCES account(id) ON DELETE SET NULL;
CREATE INDEX idx_shared_deck_account_id ON shared_deck (account_id);

-- migrate:down

DROP INDEX IF EXISTS idx_shared_deck_account_id;
ALTER TABLE shared_deck DROP COLUMN account_id;
DROP TABLE IF EXISTS account_achievements;
DROP TABLE IF EXISTS account_settings;
DROP TABLE IF EXISTS account_folder;
DROP TABLE IF EXISTS account_campaign;
DROP TABLE IF EXISTS account_deck;
DROP TABLE IF EXISTS verification_token;
DROP TABLE IF EXISTS session;
DROP TABLE IF EXISTS account_identity;
DROP TABLE IF EXISTS account;
