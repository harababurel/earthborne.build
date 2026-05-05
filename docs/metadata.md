# Metadata

This document describes the current Earthborne Rangers data sources and the normalization performed by the local backend.

## Source of truth

Card and pack data are ingested from a local checkout of:

- `https://github.com/harababurel/rangers-card-data`

The ingestion script reads:

- `aspects.json`
- `types.json`
- `set_types.json`
- `sets.json`
- `tokens.json`
- `areas.json`
- `categories.json`
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
- card categories
- packs
- cards

The ingest is destructive by design: it clears the existing imported data and repopulates the tables from the source checkout in a single transaction.

## Normalization details

Current normalization performed during ingest:

- upstream `core` pack id is remapped to `ebr`
- `short_name`, `type_id`, `size`, and similar optional fields are normalized to `null` when absent
- duplicate token ids from upstream `tokens.json` are deduplicated before insert
- `image_rect` arrays are serialized to JSON strings for SQLite storage
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
- challenge text fields (`challenge_sun`, `challenge_mountain`, `challenge_crest`)
- location card back text (`path_deck_assembly`, `arrival_setup`)
- flip card cross-references (`back_card_code`, `double_sided`)

## Pack and set metadata

The public API exposes pack records through `GET /v2/public/packs` and card set records through `GET /v2/public/sets`. The frontend maps those records into its existing metadata shape for compatibility with inherited UI code.

## Images

Card image metadata is not stored separately. Image serving works by:

1. looking up the card's `pack_id` in SQLite
2. resolving `IMAGE_DIR/{pack_id}/{code}.jpg`
3. serving the local file through `GET /images/:code`

See [docs/api.md](./api.md) and [docs/deployment.md](./deployment.md) for operational details.
