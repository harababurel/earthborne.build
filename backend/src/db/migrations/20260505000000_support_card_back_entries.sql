-- migrate:up
ALTER TABLE card RENAME TO card_old;

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
);

INSERT INTO card (
  id, code, pack_id, category_id, set_id, set_position, position, quantity, deck_limit, type_id, aspect_requirement_type, aspect_requirement_value, energy_cost, equip, presence, harm, progress, approach_conflict, approach_reason, approach_exploration, approach_connection, aspect_awareness, aspect_fitness, aspect_focus, aspect_spirit, token_id, token_count, area_id, guide_entry, illustrator, name, traits, text, flavor, image_rect, sun_challenge, mountain_challenge, crest_challenge
)
SELECT
  id, code, pack_id, category_id, set_id, set_position, position, quantity, deck_limit, type_id, aspect_requirement_type, aspect_requirement_value, energy_cost, equip, presence, harm, progress, approach_conflict, approach_reason, approach_exploration, approach_connection, aspect_awareness, aspect_fitness, aspect_focus, aspect_spirit, token_id, token_count, area_id, guide_entry, illustrator, name, traits, text, flavor, image_rect, sun_challenge, mountain_challenge, crest_challenge
FROM card_old;

DROP TABLE card_old;

CREATE INDEX idx_card_pack_id ON card(pack_id);
CREATE INDEX idx_card_set_id ON card(set_id);
CREATE INDEX idx_card_type_id ON card(type_id);
CREATE INDEX idx_card_aspect_id ON card(aspect_requirement_type);
CREATE INDEX idx_card_code ON card(code);

-- migrate:down
ALTER TABLE card RENAME TO card_old;

CREATE TABLE card (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  pack_id TEXT NOT NULL REFERENCES pack(id),
  category_id TEXT REFERENCES category(id),
  set_id TEXT REFERENCES card_set(id),
  set_position TEXT,
  position INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
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
  crest_challenge TEXT
);

INSERT INTO card (
  id, code, pack_id, category_id, set_id, set_position, position, quantity, deck_limit, type_id, aspect_requirement_type, aspect_requirement_value, energy_cost, equip, presence, harm, progress, approach_conflict, approach_reason, approach_exploration, approach_connection, aspect_awareness, aspect_fitness, aspect_focus, aspect_spirit, token_id, token_count, area_id, guide_entry, illustrator, name, traits, text, flavor, image_rect, sun_challenge, mountain_challenge, crest_challenge
)
SELECT
  id, code, pack_id, category_id, set_id, set_position, COALESCE(position, 0), COALESCE(quantity, 1), deck_limit, type_id, aspect_requirement_type, aspect_requirement_value, energy_cost, equip, presence, harm, progress, approach_conflict, approach_reason, approach_exploration, approach_connection, aspect_awareness, aspect_fitness, aspect_focus, aspect_spirit, token_id, token_count, area_id, guide_entry, illustrator, name, traits, text, flavor, image_rect, sun_challenge, mountain_challenge, crest_challenge
FROM card_old;

DROP TABLE card_old;

CREATE INDEX idx_card_pack_id ON card(pack_id);
CREATE INDEX idx_card_set_id ON card(set_id);
CREATE INDEX idx_card_type_id ON card(type_id);
CREATE INDEX idx_card_aspect_id ON card(aspect_requirement_type);
CREATE INDEX idx_card_code ON card(code);
