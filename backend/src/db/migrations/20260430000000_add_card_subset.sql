-- migrate:up
CREATE TABLE card_subset (
  id TEXT PRIMARY KEY,
  set_id TEXT NOT NULL REFERENCES card_set(id),
  pack_id TEXT NOT NULL REFERENCES pack(id),
  size INTEGER NOT NULL
);
CREATE INDEX idx_card_subset_set_pack ON card_subset(set_id, pack_id);

-- migrate:down
DROP TABLE card_subset;
