-- migrate:up
ALTER TABLE card ADD COLUMN back_imagesrc TEXT;
ALTER TABLE card ADD COLUMN back_image_rect TEXT;

-- migrate:down
ALTER TABLE card DROP COLUMN back_image_rect;
ALTER TABLE card DROP COLUMN back_imagesrc;
