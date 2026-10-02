-- migrate:up
CREATE TABLE translation (
  locale TEXT NOT NULL,
  entity TEXT NOT NULL CHECK (entity IN ('card', 'pack', 'set', 'subset', 'token', 'type', 'aspect', 'area')),
  entity_id TEXT NOT NULL,
  field TEXT NOT NULL,
  value TEXT NOT NULL,
  PRIMARY KEY (locale, entity, entity_id, field)
);

-- migrate:down
DROP TABLE translation;
