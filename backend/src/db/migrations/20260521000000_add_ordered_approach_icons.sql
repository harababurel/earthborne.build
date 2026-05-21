-- migrate:up
ALTER TABLE card ADD COLUMN approach_icons TEXT;

-- migrate:down
ALTER TABLE card DROP COLUMN approach_icons;
