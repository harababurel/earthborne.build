-- migrate:up
ALTER TABLE card ADD COLUMN alt_imagesrc TEXT;
ALTER TABLE card ADD COLUMN alt_image_rect TEXT;
ALTER TABLE card ADD COLUMN alt_illustrator TEXT;

-- migrate:down
ALTER TABLE card DROP COLUMN alt_illustrator;
ALTER TABLE card DROP COLUMN alt_image_rect;
ALTER TABLE card DROP COLUMN alt_imagesrc;
