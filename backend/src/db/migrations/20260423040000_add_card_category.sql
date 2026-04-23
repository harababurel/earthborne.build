-- migrate:up
CREATE TABLE category (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

ALTER TABLE card ADD COLUMN category_id TEXT REFERENCES category(id);

-- migrate:down
ALTER TABLE card DROP COLUMN category_id;
DROP TABLE category;
