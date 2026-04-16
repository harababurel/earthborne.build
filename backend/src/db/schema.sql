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
CREATE TABLE card (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  pack_id TEXT NOT NULL REFERENCES pack(id),
  set_id TEXT REFERENCES card_set(id),
  set_position INTEGER,
  position INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  deck_limit INTEGER,
  type_id TEXT NOT NULL REFERENCES card_type(id),
  aspect_id TEXT REFERENCES aspect(id),
  level INTEGER,
  cost INTEGER,
  equip INTEGER,
  presence INTEGER,
  harm INTEGER,
  progress INTEGER,
  progress_fixed INTEGER,
  approach_conflict INTEGER,
  approach_reason INTEGER,
  approach_exploration INTEGER,
  approach_connection INTEGER,
  token_id TEXT REFERENCES token(id),
  token_count INTEGER,
  area_id TEXT REFERENCES area(id),
  guide_entry TEXT,
  locations TEXT,
  back_card_id TEXT REFERENCES card(id),
  illustrator TEXT,
  spoiler INTEGER,
  name TEXT NOT NULL,
  traits TEXT,
  text TEXT,
  flavor TEXT,
  objective TEXT,
  imagesrc TEXT,
  sun_challenge TEXT,
  mountain_challenge TEXT,
  crest_challenge TEXT
);
CREATE INDEX idx_card_pack_id ON card(pack_id);
CREATE INDEX idx_card_set_id ON card(set_id);
CREATE INDEX idx_card_type_id ON card(type_id);
CREATE INDEX idx_card_aspect_id ON card(aspect_id);
CREATE INDEX idx_card_code ON card(code);
CREATE TABLE fan_made_project_info (
  id TEXT PRIMARY KEY,
  bucket_path TEXT NOT NULL,
  meta TEXT NOT NULL
);
CREATE TABLE "schema_migrations" (version varchar(128) primary key);
-- Dbmate schema migrations
INSERT INTO "schema_migrations" (version) VALUES
  ('20260413000000'),
  ('20260416000000');
