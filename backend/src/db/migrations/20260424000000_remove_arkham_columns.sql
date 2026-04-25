ALTER TABLE card DROP COLUMN imagesrc;
ALTER TABLE card DROP COLUMN back_card_id;
ALTER TABLE card DROP COLUMN locations;
ALTER TABLE card DROP COLUMN objective;
ALTER TABLE card DROP COLUMN spoiler;
ALTER TABLE card DROP COLUMN progress_fixed;

ALTER TABLE card RENAME COLUMN cost TO energy_cost;
ALTER TABLE card RENAME COLUMN level TO aspect_requirement_value;
ALTER TABLE card RENAME COLUMN aspect_id TO aspect_requirement_type;
