CREATE TABLE "schema_migrations" (version varchar(128) primary key);
CREATE TABLE pack (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  short_name TEXT,
  position INTEGER NOT NULL
);
CREATE TABLE aspect (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL
);
CREATE TABLE card_type (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
);
CREATE TABLE set_type (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
);
CREATE TABLE card_set (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type_id TEXT REFERENCES set_type(id),
  size INTEGER
);
CREATE TABLE token (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  plurals TEXT
);
CREATE TABLE area (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
);
CREATE TABLE fan_made_project_info (
  id TEXT PRIMARY KEY,
  bucket_path TEXT NOT NULL,
  meta TEXT NOT NULL
);
CREATE TABLE app_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
CREATE TABLE shared_deck (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  data TEXT NOT NULL,
  history TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
, account_id TEXT REFERENCES account(id) ON DELETE SET NULL);
CREATE INDEX idx_shared_deck_client_id ON shared_deck(client_id);
CREATE TABLE category (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
);
CREATE TABLE card_subset (
  id TEXT PRIMARY KEY,
  set_id TEXT NOT NULL REFERENCES card_set(id),
  pack_id TEXT NOT NULL REFERENCES pack(id),
  size INTEGER NOT NULL
);
CREATE INDEX idx_card_subset_set_pack ON card_subset(set_id, pack_id);
CREATE TABLE card (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  pack_id TEXT NOT NULL REFERENCES pack(id),
  category_id TEXT REFERENCES category(id),
  set_id TEXT REFERENCES card_set(id),
  set_position TEXT,
  position INTEGER,
  quantity INTEGER,
  deck_limit INTEGER,
  type_id TEXT NOT NULL REFERENCES card_type(id),
  aspect_requirement_type TEXT REFERENCES aspect(id),
  aspect_requirement_value INTEGER,
  energy_cost INTEGER,
  equip INTEGER,
  presence INTEGER,
  harm TEXT,
  progress TEXT,
  approach_conflict INTEGER,
  approach_reason INTEGER,
  approach_exploration INTEGER,
  approach_connection INTEGER,
  aspect_awareness INTEGER,
  aspect_fitness INTEGER,
  aspect_focus INTEGER,
  aspect_spirit INTEGER,
  token_id TEXT REFERENCES token(id),
  token_count TEXT,
  area_id TEXT REFERENCES area(id),
  guide_entry TEXT,
  illustrator TEXT,
  name TEXT NOT NULL,
  traits TEXT,
  text TEXT,
  flavor TEXT,
  image_rect TEXT,
  sun_challenge TEXT,
  mountain_challenge TEXT,
  crest_challenge TEXT,
  back_card_id TEXT,
  path_deck_assembly TEXT,
  arrival_setup TEXT
, back_imagesrc TEXT, back_image_rect TEXT, alt_imagesrc TEXT, alt_image_rect TEXT, alt_illustrator TEXT, approach_icons TEXT);
CREATE INDEX idx_card_pack_id ON card(pack_id);
CREATE INDEX idx_card_set_id ON card(set_id);
CREATE INDEX idx_card_type_id ON card(type_id);
CREATE INDEX idx_card_aspect_id ON card(aspect_requirement_type);
CREATE INDEX idx_card_code ON card(code);
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
CREATE INDEX idx_shared_deck_account_id ON shared_deck (account_id);
-- Dbmate schema migrations
INSERT INTO "schema_migrations" (version) VALUES
  ('20260413000000'),
  ('20260416000000'),
  ('20260420000000'),
  ('20260422000000'),
  ('20260422010000'),
  ('20260422020000'),
  ('20260423030000'),
  ('20260423040000'),
  ('20260423050000'),
  ('20260423060000'),
  ('20260424000000'),
  ('20260430000000'),
  ('20260505000000'),
  ('20260505010000'),
  ('20260520000000'),
  ('20260521000000'),
  ('20260707000000');
