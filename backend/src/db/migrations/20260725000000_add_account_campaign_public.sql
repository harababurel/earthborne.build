-- migrate:up

ALTER TABLE account_campaign ADD COLUMN public INTEGER NOT NULL DEFAULT 0;

-- migrate:down

ALTER TABLE account_campaign DROP COLUMN public;
