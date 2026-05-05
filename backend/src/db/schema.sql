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
);
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
  back_imagesrc TEXT,
  back_image_rect TEXT,
  sun_challenge TEXT,
  mountain_challenge TEXT,
  crest_challenge TEXT,
  back_card_id TEXT,
  path_deck_assembly TEXT,
  arrival_setup TEXT
);
CREATE INDEX idx_card_pack_id ON card(pack_id);
CREATE INDEX idx_card_set_id ON card(set_id);
CREATE INDEX idx_card_type_id ON card(type_id);
CREATE INDEX idx_card_aspect_id ON card(aspect_requirement_type);
CREATE INDEX idx_card_code ON card(code);
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
  ('20260505010000');
