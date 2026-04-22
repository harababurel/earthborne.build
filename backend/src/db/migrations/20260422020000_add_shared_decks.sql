-- migrate:up

CREATE TABLE shared_deck (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  data TEXT NOT NULL,
  history TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_shared_deck_client_id ON shared_deck(client_id);

-- migrate:down

DROP INDEX IF EXISTS idx_shared_deck_client_id;
DROP TABLE IF EXISTS shared_deck;
