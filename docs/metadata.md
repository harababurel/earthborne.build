# Metadata

This document describes the current Earthborne Rangers data sources and the normalization performed by the local backend.

## Source of truth

Card and pack data are ingested from a local checkout of:

- `https://github.com/zzorba/rangers-card-data`

The ingestion script reads:

- `aspects.json`
- `types.json`
- `set_types.json`
- `sets.json`
- `tokens.json`
- `areas.json`
- `packs.json`
- `packs/<pack_id>/<pack_id>.json`

## Ingestion model

`backend/src/scripts/ingest-cards.ts` loads the upstream JSON files and writes normalized rows into SQLite tables for:

- aspects
- card types
- set types
- card sets
- tokens
- areas
- packs
- cards

The ingest is destructive by design: it clears the existing imported data and repopulates the tables from the source checkout in a single transaction.

## Normalization details

Current normalization performed during ingest:

- upstream `core` pack id is remapped to `ebr`
- `short_name`, `type_id`, `size`, and similar optional fields are normalized to `null` when absent
- duplicate token ids from upstream `tokens.json` are deduplicated before insert
- array-valued `locations` are stored in SQLite as JSON strings
- booleans are stored as SQLite integer flags where needed

## Card schema

The shared runtime card schema lives in [shared/src/schemas/card.schema.ts](../shared/src/schemas/card.schema.ts).

It models Earthborne Rangers concepts such as:

- energy cost and energy aspect
- aspect requirements
- approach icons
- presence, harm, and progress thresholds
- named tokens
- area and campaign guide references
- background and specialty classification
- challenge text fields

## Pack metadata

The public API currently exposes pack records only. The frontend maps those records into its existing metadata shape and uses the pack code as a placeholder `cycle_code` for compatibility with inherited UI code.

## Images

Card image metadata is not stored separately. Image serving works by:

1. looking up the card's `pack_id` in SQLite
2. resolving `IMAGE_DIR/{pack_id}/{code}.jpg`
3. serving the local file through `GET /images/:code`

See [docs/api.md](./api.md) and [docs/deployment.md](./deployment.md) for operational details.
