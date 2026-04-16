-- migrate:up

-- Rename the core set pack to match the game's actual name.
-- SQLite FK enforcement is off by default so direct UPDATE is safe here.
UPDATE card SET pack_id = 'ebr' WHERE pack_id = 'core';
UPDATE pack SET id = 'ebr', name = 'Earthborne Rangers' WHERE id = 'core';

-- migrate:down

UPDATE card SET pack_id = 'core' WHERE pack_id = 'ebr';
UPDATE pack SET id = 'core', name = 'Core set' WHERE id = 'ebr';
