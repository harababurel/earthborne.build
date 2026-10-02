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
- `i18n/{de,es,fr,it,ru}/**/*.po` (excluding `taboos` directories)

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
- translations

The ingest is destructive by design: it clears the existing imported data and repopulates the tables from the source checkout in a single transaction.

## Normalization details

Current normalization performed during ingest:

- upstream `core` pack id is remapped to `ebr`
- `short_name`, `type_id`, `size`, and similar optional fields are normalized to `null` when absent
- duplicate token ids from upstream `tokens.json` are deduplicated before insert
- `image_rect` arrays are serialized to JSON strings for SQLite storage
- booleans are stored as SQLite integer flags where needed

## Translation ingest

`backend/src/scripts/card-translations.ts` loads German, Spanish, French, Italian, and Russian PO translations into `translation`, keyed by `(locale, entity, entity_id, field)`. The translation rows are cleared and rebuilt in the same transaction as the English metadata. Ingest also writes `translations_updated_at` to `app_metadata`.

Imported fields:

- cards: name, text, traits, flavor, and sun/mountain/crest challenge text
- packs: name and short name
- sets and subsets: name
- tokens: name and plurals
- types and areas: name
- aspects: name and short name

The parser splits each `msgctxt` into an entity id and field, skips empty translations, and keeps the first duplicate with a warning. Line breaks and `<hr>` variants are normalized to `<hr>`. Pack id `core` is remapped to `ebr`; area ids `play`, `reach`, and `along` are remapped to `in_play`, `within_reach`, and `along_the_way`. Unknown entities and unsupported fields are ignored.

**Outdated-source policy:** after formatting normalization, a translation whose `msgid` differs from the current English source is retained. Ingest logs per-locale translated field/card coverage, outdated-source counts, and ignored-entry counts so upstream translations can be corrected.

Storage, ingest, and locale-aware API responses are implemented. The API applies per-field English fallback while retaining English traits and English-derived rules values. Frontend language-based fetching and trait display translation remain pending. See [card-localization-plan.md](./card-localization-plan.md) and [api.md](./api.md).

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

## Location and path terrain symbols

Location and path terrain SVG symbols used by the frontend live under `frontend/src/assets/symbols/`.

- `locations/` contains extracted location symbols keyed by location name in `frontend/src/assets/symbols/index.ts`
- `path-terrain/` contains extracted path terrain symbols keyed by terrain name in the same registry
- `pathCardSymbolUrlBySetCode` maps path-card `set_code` values to either path terrain symbols or pivotal location symbols
- the General and The Valley set symbols are stored alongside these static SVG assets because they are rendered through the same card-symbol path

These symbols are static frontend assets. They are not currently ingested from `rangers-card-data` or served by the backend. The frontend `/debug` page renders the registered symbol sets for quick visual inspection after adding or adjusting SVGs.
