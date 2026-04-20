# Adaptation Plan: arkham.build → earthborne.build

## Overview

This document captures the full analysis of the arkham.build codebase and the plan for adapting it to Earthborne Rangers. Use it to orient new Claude Code sessions and track progress.

---

## What's reusable vs. what needs rebuilding

### Reusable with minimal changes (~50%)

| Area | Notes |
|---|---|
| Build/infra (Vite, TypeScript, Cloudflare, Kamal) | Fully reusable, just rename env vars and project references |
| Storage/persistence layer | IndexedDB deck storage is game-agnostic; provider abstraction (`"local" \| "shared"`) works as-is |
| BuildQL search language | Custom DSL with lexer/parser/interpreter — game-agnostic core, only field definitions need replacing |
| Metadata infrastructure | Pack/cycle/set management works for any LCG with similar release structure |
| Deck I/O serialization | Slot-based format is generic |
| UI component primitives | Modals, lists, tooltips, filter UI primitives — presentation layer is reusable |
| Backend API structure | Hono routes are generic; just swap endpoint implementations |
| Test infrastructure | Vitest + Playwright + Testcontainers setup is fully reusable |

### Needs significant rework (~50%)

| Area | Difficulty | Detail |
|---|---|---|
| **Card schema** | High | All Arkham fields (`skill_willpower`, `skill_agility`, `sanity`, `doom`, `shroud`, `enemy_*`, etc.) need replacing with ER equivalents. File: `shared/src/schemas/card.schema.ts` |
| **Deck validation** | Very High | 600+ lines of Arkham-specific rules (deck size, side deck, signatures, exile, bonded cards, parallel investigators). File: `frontend/src/store/lib/deck-validation.ts` |
| **Card filtering / access control** | Very High | 1300+ lines of faction/class-based restriction logic. File: `frontend/src/store/lib/filtering.ts` |
| **BuildQL field definitions** | Medium | ~50 fields need remapping to ER card properties. File: `frontend/src/store/lib/buildql/fields.ts` |
| **Investigator → Ranger model** | High | Different stats, different deck configuration fields |
| **ArkhamDB integration** | Medium | Routes + scripts that sync from ArkhamDB need replacing with ER card data pipeline. Files: `backend/src/routes/arkhamdb-decklists.ts`, `backend/src/scripts/ingest-arkhamdb-decklists.ts` |
| **Game-specific constants** | Medium | 20+ hardcoded special card codes (ADAPTABLE, PARALLEL_JIM, etc.). File: `frontend/src/utils/constants.ts` |
| **Terminology throughout** | Medium | 875+ uses of "investigator", 131+ faction names, 93+ Arkham skill names |
| **i18n strings** | Medium | All game-specific translated strings need updating |
| **Card image pipeline** | Low | Already env-var based (`VITE_CARD_IMAGE_URL`); just point to ER image host |

---

## Recommended order of work

### Phase 1: Card schema — DONE

ER card schema defined based on rulebook analysis. Key changes:

- `shared/src/lib/constants.ts` — Replaced AH factions/skills/player types with ER aspects (AWA/FIT/FOC/SPI), approaches (conflict/reason/exploration/connection), card types (moment/attachment/gear/being/feature/attribute/path/location/weather/mission/challenge/aspect/role), ranger card categories, background/specialty types, terrain types, keywords, and deck construction constants.
- `shared/src/schemas/card.schema.ts` — Complete rewrite with ER card model: energy costs, equip values, approach icons, aspect requirements, presence, harm/progress thresholds, named tokens, challenge effects.
- `shared/src/schemas/decklist.schema.ts` — New ER decklist schema (30 cards = 15 unique x 2 copies, aspect card, role card, background/specialty choices, rewards/maladies/displaced tracking).
- `shared/src/lib/card-utils.ts` — Replaced AH XP/taboo/myriad functions with ER energy cost, aspect requirement, and approach icon utilities.
- `shared/src/dtos/` — Updated all DTOs to use ER fields instead of AH (removed investigator_factions, xp, side_decks, taboo; added aspect_code, background, specialty).
- `shared/src/index.ts` — Updated barrel exports.
- Shared and backend packages compile clean. Frontend has ~138 files with expected type errors from the schema change.

### Phase 2: Strip ArkhamDB integration — DONE

Removed all ArkhamDB-specific code:
- Deleted `backend/src/routes/arkhamdb-decklists.ts`, `arkhamdb-decklists.helpers.ts`, `recommendations.ts`
- Deleted `backend/src/scripts/ingest-arkhamdb-decklists.ts`
- Deleted `frontend/src/utils/arkhamdb.ts`, `arkhamdb-json-format.ts`
- Deleted `shared/src/schemas/arkhamdb-decklist.schema.ts`, `shared/src/lib/card-utils.spec.ts`
- Updated `backend/src/app.ts` (removed arkhamdb/recommendations routes)
- Updated `backend/package.json` (removed ingest:arkhamdb-decklists script)
- Cleaned `frontend/src/utils/constants.ts` (removed all AH card codes, regexes, slot constants, arkhamdb storage provider)

### Phase 3: Card data pipeline — DONE

#### Data source decision (researched 2026-04-13)

**Primary source: `github.com/zzorba/rangers-card-data`**

This is the canonical JSON card data repository that backs RangersDB (rangersdb.com). It is open source (maintained by zzorba / Daniel Salinas). The data is structured as flat JSON files — exactly the format we need to ingest.

Repository structure:
```
rangers-card-data/
  packs/
    core/core.json      # Core set: 241 cards
    loa/                # Land of Adventure
    sib/                # Stewards in the Black (?)
    sos/                # Shores of Sovereignty (?)
    sotv/               # Stewards of the Valley
  aspects.json          # AWA, FIT, FOC, SPI
  types.json            # 13 card types
  sets.json             # Card sets / release groupings
  set_types.json
  subsets.json
  tokens.json
  areas.json
  packs.json
  taboos/               # Taboo list variants
  i18n/                 # Translations (de, fr, es, it, ru)
  schema.ts             # TypeScript interfaces for all JSON shapes
```

Card JSON fields (from `core.json` — 38 unique fields):
`id`, `position`, `quantity`, `deck_limit`, `set_id`, `set_position`, `aspect_id`, `cost`, `level`, `name`, `type_id`, `traits`, `text`, `flavor`, `illustrator`, `approach_conflict`, `approach_exploration`, `approach_connection`, `approach_reason`, `equip`, `presence`, `harm`, `token_id`, `token_count`, `cost_type`, `cost_count`, `spoiler`

Field mapping to our schema: near 1:1. `harm` → `harm_threshold`, `progress` → `progress_threshold`, `cost` → `energy_cost`, `equip` → `equip_value`, etc.

**Secondary source: `eb_rangers_cards.json`** (TTS sprite sheet extract in repo root)
- 788 entries, 681 with names, zero game-mechanical data
- Useful only as a supplementary image source (sprite sheets require cropping to extract individual card images)
- Do not use as primary data

**Considered and rejected:**
- *decksmith.app* — no public API, would require fragile scraping
- *RangersDB GraphQL API* — data is in Hasura behind an admin secret; the static JSON data repo is the better path

#### Completed (2026-04-13)

- Switched backend from PostgreSQL to **SQLite** (`better-sqlite3` + Kysely `SqliteDialect`)
- New SQLite migration: `backend/src/db/migrations/20260413000000_er_schema.sql`
  - Tables: `pack`, `aspect`, `card_type`, `set_type`, `card_set`, `token`, `area`, `card`, `fan_made_project_info`
- New schema types: `backend/src/db/schema.types.ts` (hand-written for ER schema)
- Ingestion script: `backend/src/scripts/ingest-cards.ts`
  - Usage: `CARD_DATA_DIR=/path/to/rangers-card-data npm run ingest:cards`
  - Local clone at `/home/sergiu/work/rangers-card-data`
  - Ingests **260 cards** across 5 packs (core, loa, sib, sos, sotv) in ~40ms
- API endpoints: `GET /v2/public/cards`, `GET /v2/public/cards/:code`
- Tests use in-memory SQLite — no Docker/Testcontainers required
- Config simplified: `SQLITE_PATH` replaces all `POSTGRES_*` vars

### Phase 4: Rebuild game logic — DONE (2026-04-13)

#### Completed

- **`frontend/src/store/lib/buildql/fields.ts`** — Replaced all AH fields with ER equivalents: approach icons (conflict/reason/exploration/connection), aspect stats (awareness/fitness/focus/spirit), energy cost/aspect, background/specialty/category, equip, presence/harm/progress thresholds, traits/keywords, pack/set, deck meta. Removed AH imports (filterInvestigatorAccess, filterTag, etc.).
- **`frontend/src/store/lib/deck-validation.ts`** — Full rewrite for ER rules: deck size (30), card copy limits (deck_limit), category-based access (personality = all, background = matching background_type, specialty = matching specialty_type), category pick counts (4 personality, 5 background, 5 specialty, 1 outside interest). Error type structure preserved for UI compatibility.
- **`frontend/src/store/lib/filtering.ts`** — Full rewrite: `filterInvestigatorAccess` now checks ER categories; `filterType`/`filterTraits`/`filterCost`/`filterPackCode`/`filterIllustrator` updated for ER fields; AH-specific filters (factions, level, skill icons, subtypes, taboo, properties) stubbed with matching signatures.
- **`frontend/src/store/schemas/deck.schema.ts`** — Added ER fields: `background`, `specialty`, `aspect_code`, `role_code` (all optional, backward-compatible).
- **`frontend/src/store/lib/types.ts`** — Added ER fields to `ResolvedDeck` type.
- **`shared/src/lib/card-utils.ts`** + **`shared/src/index.ts`** — Added stubs for removed AH exports (`countExperience`, `cardLevel`, `SKILL_KEYS`, `FACTION_ORDER`, etc.) so callers compile without changes.
- **`frontend/src/utils/constants.ts`** — Stubbed missing AH constants (`REGEX_BONDED`, `CYCLES_WITH_STANDALONE_PACKS`, etc.) to keep the build clean.
- **`frontend/src/utils/card-utils.ts`** — Removed AH imports; stubbed `hasSkillIcons`, `sideways`, `cycleOrPack`, `cardUses`.
- Frontend build: **0 MISSING_EXPORT errors**. TypeScript type errors remain in Phase-5 targets (UI components referencing AH card properties).

### Phase 5: Data pipeline — DONE (2026-04-13)

#### Completed

- **`shared/src/schemas/card.schema.ts`** — Added `pack_code` field; made `set_code`/`set_position` optional.
- **`shared/src/lib/constants.ts`** — Added 5th background (`talespinner`) and 5th specialty (`spirit_speaker`) from the actual `rangers-card-data/sets.json`.
- **`backend/src/db/queries/card.ts`** — Rewrote `getAllCards`/`getCardByCode` to JOIN `card_set` and `token` tables, returning the frontend `Card` shape (`type_code`, `energy_aspect`, `set_code`, `harm_threshold`, etc.) with category/background_type/specialty_type derived from set data.
- **`backend/src/db/queries/pack.ts`** + **`backend/src/routes/packs.ts`** — New `GET /v2/public/packs` endpoint.
- **`backend/src/app.ts`** — Registered packs route.
- **`frontend/src/store/services/queries.ts`** — Replaced `queryCards` (→ `GET /v2/public/cards`), `queryMetadata` (→ `GET /v2/public/packs`), `queryDataVersion` (→ `GET /version`). Removed ArkhamDB `request()` helper and all AH-specific API types.
- **`frontend/src/store/slices/app.ts`** — Replaced 60-line AH card processing loop with simple `metadata.cards[card.code] = card` loop. Removed unused AH imports.
- **`frontend/src/store/slices/metadata.types.ts`** — Simplified: live fields are `cards`, `packs`, `dataVersion`; AH fields kept as `Record<string, any>` stubs so 16 callers compile unchanged.
- **`frontend/src/store/slices/metadata.ts`** — Updated `getInitialMetadata()` to match.
- **`frontend/src/store/lib/local-data.ts`** — No-op: ER data comes from backend, no local patches.
- **`frontend/src/store/lib/lookup-tables.ts`** — Rewrote for ER: dropped AH-specific indexes (xp, encounter, bonded, duplicates, parallel, restrictions); kept `typeCode`, `traits`, `packsByCycle`.

### Phase 6: Adapt UI components — **Done (2026-04-14)**

Eliminated all 327 TypeScript errors across 126 frontend files. Key changes:
- Replaced `type_code === "investigator"` → `"role"` throughout
- Replaced `card.faction_code` → `card.energy_aspect`, `card.position` → `card.set_position`
- Replaced Arkham-specific icons (e.g., `icon-elder_sign`) with Earthborne Rangers equivalents (e.g., `core-ranger`)
- Removed/stubbed AH-only card fields: `parallel`, `xp`, `encounter_code`, `taboo_set_id`, `real_name/subname/traits`, `permanent`, `exile`, `hidden`, `chapter`, `back_link_id`, `alternate_of_code`, `subtype_code`, `faction2_code`
- Stubbed AH-only systems: taboo schema, limited-slots, deck options, FAQ, customization upgrades, XP range filter, analyze-side-decks, description-length filters
- Fixed imports: `Attachments`, `DeckOptionSelectType`, `FactionName`, `SkillKey`, `JsonDataCard`, `ApiCardSchema` → ER equivalents or local stubs
- Infrastructure: `StorageProvider` includes `"arkhamdb"`, `DecklistsFiltersState` extended with optional AH filter fields, recommendations API uses `aspect_code`

Frontend: `npm run build` clean, `tsc --noEmit` = 0 errors.

### Phase 7: Terminology and i18n — **Done (2026-04-14)**

#### Completed

- **`frontend/src/locales/en.json`** — Full rewrite for ER terminology:
  - `common.factions`: replaced AH faction keys (guardian/mystic/…) with ER aspect codes (awa/fit/foc/spi)
  - `common.skill`: replaced AH skill names (agility/combat/intellect/willpower) with ER approach names (conflict/reason/exploration/connection)
  - `common.type`: replaced AH card types with ER types (gear/attachment/moment/role/aspect/attribute/being/feature/stat/malady/mission/location/challenge); kept `investigator`/`investigator_one`/`investigator_other` keys pointing to "Ranger" for backward compat with code
  - `common.traits`: replaced ~300 AH traits with 48 ER traits from `rangers-card-data`
  - `common.uses`: replaced AH uses tokens (charges/ammo/secrets/…) with 60 ER named tokens (alarm/herb/charge/vision/…)
  - Deleted all AH-only sections: taboo, XP, ArkhamDB, deck options/constraints, AH faction names, AH slot names, AH symbols, exile, bonded/extra/side slots, parallel, doom, sanity, XP upgrade modal, suzi_standalone_setup, sealed deck, campaign environments, shroud, skill boost, skill icons filter, etc.
  - Updated terminology throughout: investigator → ranger, faction → aspect, "player cards" → "ranger cards", "ArkhamDB-flavoured markdown" → "markdown"
  - `about.description`: rewritten for earthborne.build / Earthborne Rangers
  - `deck_create.default_name`: ER aspect-based names (awa/fit/foc/spi)
- **`frontend/index.html`** — Updated `<meta description>`, `application-name`, `apple-mobile-web-app-title`, OG url/title/description/image, opensearch link → all reference earthborne.build / Earthborne Rangers
- **`frontend/public/site.webmanifest`** — Updated description, id, name, short_name → earthborne.build
- **`frontend/src/app.tsx`** — Removed AH blog page routes (`/blog/core-2026-reveal`, `/blog/investigator-2026-reveal`) and their lazy imports
- **`frontend/src/store/hooks/use-sync.ts`** — Removed hardcoded `"ArkhamDB"` provider display name
- **`frontend/src/store/lib/errors.ts`** — Removed hardcoded `"ArkhamDB"` from `UnsupportedPublishError`
- Non-English locales left untouched (will be updated when proper translations are contributed)

### Phase 9: Rules glossary — **Done (2026-04-17)**

Replaced the Arkham Horror rules reference HTML with the full EBR rules glossary scraped from [thelivingvalley.earthbornegames.com](https://thelivingvalley.earthbornegames.com/docs/rules_glossary/).

- **`frontend/src/assets/rules.html`** — Replaced with 148 EBR glossary entries grouped alphabetically (A–Y) with a nested TOC. Generated by `scripts/scrape-rules.mjs`.
- **`frontend/src/assets/campaign-guides.html`, `one-day-missions.html`, `updates.html`, `faq.html`** — Added embedded Living Valley reference sections with crawled internal document pages and nested TOCs. Generated by `scripts/scrape-reference-sections.mjs`.
- **`frontend/src/pages/rules-reference/rules-reference.tsx`** — Removed the AH-specific Grimoire tab. Rules page now mirrors the Living Valley navigation with Campaign Guides, Rules Glossary, One-Day Missions, Updates, and FAQ sections.
- **`frontend/src/locales/en.json`** — Updated `/rules` labels for "Rules & Reference", section names, and reference search.
- **`scripts/scrape-rules.mjs`** — New script: re-run `node scripts/scrape-rules.mjs` to regenerate `rules.html` when the official glossary updates.
- **`scripts/scrape-reference-sections.mjs`** — New crawler script: re-run `node scripts/scrape-reference-sections.mjs` to refresh the other Living Valley reference section assets.

---

### Phase 8: Branding and deployment — **Done (2026-04-14)**

#### Completed

- **Removed** Cloudflare/Kamal deployment artefacts: `wrangler.toml`, `backend/config/deploy.yml`, `backend/config/ansible/`, `backend/config/crontab`, `functions/` (Cloudflare Pages Functions)
- **`frontend/.env.example`** — updated for ER: removed `VITE_ARKHAMDB_BASE_URL` and `VITE_SOUVENIR_API_URL`; set `VITE_API_URL` / `VITE_API_LEGACY_URL` to `localhost:8686`; `VITE_CARD_IMAGE_URL` left as empty placeholder (TODO)
- **`backend/.env.example`** — cleaned up comments; kept SQLite path, dbmate config, card data dir, admin key
- **`backend/Dockerfile`** — stripped Postgres/cron/Kamal references; updated for SQLite-only ER backend
- **`docs/nginx.conf.example`** — nginx server block: serves `frontend/dist` as SPA, proxies `/v2`, `/version`, `/admin`, `/up` to backend port 8686; includes cache headers for hashed assets
- **`docs/earthborne.service`** — systemd unit for running the backend as a managed service

#### Card image serving — Done (2026-04-14)

- **`backend/src/scripts/download-images.ts`** — downloads card images from `static.rangersdb.com` sequentially into `IMAGE_DIR/{pack_id}/{code}.jpg`. 260/260 cards downloaded successfully (rangersdb has images for all card types). Re-run-safe.
- **`backend/src/routes/images.ts`** — `GET /images/:code`: looks up `pack_id` from DB, serves file with 1-year immutable cache header.
- **`frontend/src/utils/card-utils.ts`** — `imageUrl()`/`thumbnailUrl()` produce `${VITE_CARD_IMAGE_URL}/${code}` (plain JPG).
- **`frontend/.env.example`** — `VITE_CARD_IMAGE_URL=http://localhost:8686/images` for local dev.
- **`docs/nginx.conf.example`** — `/images/` proxy block added.
- Images stored at `/home/sergiu/work/earthborne.images/cards/` (outside repo — copyright art).

---

## Key files reference

| File | Purpose | Status |
|---|---|---|
| `shared/src/schemas/card.schema.ts` | Card data model | Done (Phase 1) |
| `backend/src/db/migrations/20260413000000_er_schema.sql` | SQLite DB schema | Done (Phase 3) |
| `backend/src/db/schema.types.ts` | Kysely DB types | Done (Phase 3) |
| `backend/src/scripts/ingest-cards.ts` | Card ingestion from rangers-card-data | Done (Phase 3) |
| `backend/src/routes/cards.ts` | Cards API endpoints | Done (Phase 3) |
| `frontend/src/store/lib/deck-validation.ts` | Deckbuilding rules | Needs full rewrite (Phase 4) |
| `frontend/src/store/lib/filtering.ts` | Card access filtering | Needs full rewrite (Phase 4) |
| `frontend/src/store/lib/buildql/fields.ts` | Search field definitions | Needs remapping (Phase 4) |
| `frontend/src/utils/constants.ts` | Game constants + special card codes | Needs cleanup (Phase 4) |
| `frontend/src/utils/card-utils.ts` | Image URL construction | Minimal change — env var (Phase 7) |
| `frontend/src/assets/rules.html` | Rules glossary content | Done (Phase 9) — regenerate with `node scripts/scrape-rules.mjs` |

---

## AGPL-3.0 compliance notes

- Source must remain publicly available (the GitHub repo satisfies this)
- Retain original copyright notices in modified files
- Note prominently that this is a modified version of arkham.build
- Your modifications are also AGPL-3.0

---

## Open questions — ANSWERED (from rulebook analysis)

All answered during Phase 1 via rulebook at `docs/rulebook.pdf`:

- **Card types**: moment, attachment, gear, being, feature, attribute (ranger cards); path, location, weather, mission, challenge, aspect, role (game cards)
- **Ranger stats**: 4 aspects — Awareness (AWA), Fitness (FIT), Focus (FOC), Spirit (SPI), values 1-3 from aspect card
- **Aspect system**: 4 aspects, 12 aspect cards with different spreads. Cards have aspect requirements (min value to include in deck)
- **Deck size**: exactly 30 cards (15 unique x 2 copies) + role card + aspect card outside deck
- **Signature/required cards**: no signatures per se, but deck is built from personality (4 picks) + background (5 of 9) + specialty (5 of 14) + outside interest (1 from any set)
- **Weaknesses equivalent**: maladies (e.g. Lingering Injury), added during campaign, cannot be removed normally
- **Release structure**: ranger card sets (Artificer, Artisan, Conciliator, Explorer, Forager, Maladies, Personalities, Rewards, Shaper, Shepherd, Traveler) and path card sets (terrain-based: Grassland, Lakeshore, etc. + location-based: Branch, Spire, etc.)

### Phase 9: Filters — **Done**

Cards are now visible in the browse page. The filter sidebar has been stripped to a blank slate — all AH-specific filters removed, ready to be rebuilt for ER one at a time.

Root cause of the previous 0-cards bug: `filterPreviews` was returning `true` (meaning "this IS a preview card") for all cards. Since the system filter applies `not(filterPreviews)` when `settings.showPreviews` is off, every card was excluded. Fixed to return `false` (no ER cards are previews).

Other fixes made during debugging:
- `getInitialList()` was returning `"browse"` but no such list key exists in `makeLists`; fixed to return `"index"`.
- `filterEncounterCards` corrected to return `false` (no ER cards are encounter cards); previously returned `true`, which would have caused `not(filterEncounterCards)` to exclude all cards on the player card view.
- `vite.config.ts`: added `allowedHosts: ["dev.harababurel.com"]` for remote dev access.

The ER filters have been fully implemented. Added: type, aspect requirement, energy cost, trait, pack/set, category (background/specialty/personality), approach icons, equip value, and card properties.

### Phase 10: Collection Settings — **Done**

- **Refactored Collection UI:** Stripped Arkham-specific ownership concepts (like copies and partial pack ownership).
- **Boolean Toggles:** Migrated to simple boolean toggles per expansion.
- **MediaCard Banners:** Enhanced the UI to use high-quality, responsive 2.36:1 image banners for Core, Valley Expansions, and Path Expansions.
- **Fallback Rendering:** Added `FALLBACK_PACK_NAMES` so expansions without ingested card data (e.g., Moments on the Path, Moments in the Valley) can still have ownership tracked.
- **Auto-Hide Unreleased Packs:** Added `TEMPORARILY_HIDDEN_PACKS` to easily filter out unreleased or non-relevant packs (`itm`, `sas`, `rcd`) without deleting them from the core config.

---

## Current state

- **Shared package**: compiles clean.
- **Backend package**: compiles clean. SQLite DB with 260 cards. APIs: `GET /v2/public/cards`, `GET /v2/public/packs`, `GET /version`.
- **Frontend package**: Vite build clean. `tsc --noEmit` = 0 errors.
- **Deployment**: nginx + systemd, no Docker/Cloudflare/Kamal. See `docs/nginx.conf.example` and `docs/earthborne.service`.
- **Card data**: 260 cards ingested from `rangers-card-data` (5 packs: core, loa, sib, sos, sotv). Local clone at `/home/sergiu/work/rangers-card-data`.
- **Card images**: 260 JPGs at `/home/sergiu/work/earthborne.images/cards/` (outside repo). Backend serves via `GET /images/:code`.
- **Rulebook**: downloaded to `docs/rulebook.pdf` (21MB), text extracted to `docs/rulebook.txt` (5024 lines, not committed).
- **Browse page**: all 260 cards visible. Filter sidebar has been successfully rebuilt for Earthborne Rangers.
- **Collection settings**: Successfully transitioned to an Earthborne Rangers-specific presentation using visual banners and simplified boolean toggles.
