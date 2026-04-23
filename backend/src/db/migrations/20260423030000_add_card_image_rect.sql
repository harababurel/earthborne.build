-- migrate:up
ALTER TABLE card ADD COLUMN image_rect TEXT;

-- migrate:down
-- SQLite doesn't support DROP COLUMN in all versions, but for ER we can use it if needed.
-- However, standard practice is to leave it if it's not hurting anyone or recreate the table.
-- Since this is a simple addition, we'll just omit the down for now or use a no-op.
