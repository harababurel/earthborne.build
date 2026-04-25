-- migrate:up
ALTER TABLE card DROP COLUMN imagesrc;
ALTER TABLE card DROP COLUMN back_card_id;
ALTER TABLE card DROP COLUMN locations;
ALTER TABLE card DROP COLUMN objective;
ALTER TABLE card DROP COLUMN spoiler;
ALTER TABLE card DROP COLUMN progress_fixed;

ALTER TABLE card RENAME COLUMN cost TO energy_cost;
ALTER TABLE card RENAME COLUMN level TO aspect_requirement_value;
ALTER TABLE card RENAME COLUMN aspect_id TO aspect_requirement_type;

-- migrate:down
ALTER TABLE card ADD COLUMN imagesrc TEXT;
ALTER TABLE card ADD COLUMN back_card_id TEXT;
ALTER TABLE card ADD COLUMN locations TEXT;
ALTER TABLE card ADD COLUMN objective TEXT;
ALTER TABLE card ADD COLUMN spoiler INTEGER;
ALTER TABLE card ADD COLUMN progress_fixed INTEGER;

ALTER TABLE card RENAME COLUMN energy_cost TO cost;
ALTER TABLE card RENAME COLUMN aspect_requirement_value TO level;
ALTER TABLE card RENAME COLUMN aspect_requirement_type TO aspect_id;
