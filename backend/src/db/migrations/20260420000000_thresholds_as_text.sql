-- migrate:up
ALTER TABLE card RENAME TO card_old;

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
  harm TEXT,
  progress TEXT,
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

INSERT INTO card SELECT * FROM card_old;

DROP TABLE card_old;

CREATE INDEX idx_card_pack_id ON card(pack_id);
CREATE INDEX idx_card_set_id ON card(set_id);
CREATE INDEX idx_card_type_id ON card(type_id);
CREATE INDEX idx_card_aspect_id ON card(aspect_id);
CREATE INDEX idx_card_code ON card(code);

-- migrate:down
-- No easy way to go back from TEXT to INTEGER if there are string values,
-- but for the sake of completeness:
ALTER TABLE card RENAME TO card_old;

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

INSERT INTO card SELECT * FROM card_old;

DROP TABLE card_old;

CREATE INDEX idx_card_pack_id ON card(pack_id);
CREATE INDEX idx_card_set_id ON card(set_id);
CREATE INDEX idx_card_type_id ON card(type_id);
CREATE INDEX idx_card_aspect_id ON card(aspect_id);
CREATE INDEX idx_card_code ON card(code);
