-- migrate:up
CREATE TABLE app_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT INTO app_metadata (key, value)
VALUES ('cards_updated_at', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

-- migrate:down
DROP TABLE app_metadata;
