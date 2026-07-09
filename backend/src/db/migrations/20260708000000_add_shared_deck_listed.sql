-- migrate:up

ALTER TABLE shared_deck ADD COLUMN listed INTEGER NOT NULL DEFAULT 0;
UPDATE shared_deck SET listed = 1;
CREATE INDEX idx_shared_deck_listed ON shared_deck (listed);

-- migrate:down

DROP INDEX idx_shared_deck_listed;
ALTER TABLE shared_deck DROP COLUMN listed;
