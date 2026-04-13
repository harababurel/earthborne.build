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

### Phase 3: Card data pipeline — BLOCKED (waiting on card metadata source)

Since there's no ArkhamDB equivalent for Earthborne Rangers, build your own:
- Define the JSON format for ER card data (card objects, ranger objects, pack/cycle metadata)
- Write an ingestion script to load card data into the DB (or serve as static JSON)
- Populate with real card data

### Phase 4: Rebuild game logic

With the schema settled and data flowing:
1. Rebuild `frontend/src/store/lib/buildql/fields.ts` — map BuildQL fields to ER card properties
2. Rewrite `frontend/src/store/lib/deck-validation.ts` — ER deckbuilding rules
3. Rewrite `frontend/src/store/lib/filtering.ts` — ER aspect/access restrictions

### Phase 5: Adapt UI components

Work through components systematically, starting with the most game-logic-heavy:
- Ranger selector (replaces investigator selector)
- Card display components (replace Arkham stat icons with ER equivalents)
- Deck stats/summary view
- Search/filter UI (update field labels)

### Phase 6: Terminology and i18n

- Global rename: investigator → ranger, faction → aspect, etc.
- Update all `locales/` translation files
- Update page titles, meta tags, OG preview templates

### Phase 7: Branding and deployment

- Update env vars, project name, URLs
- Update Cloudflare Pages config
- Update Kamal deploy config
- Point `VITE_CARD_IMAGE_URL` to ER image host

---

## Key files reference

| File | Purpose | Status |
|---|---|---|
| `shared/src/schemas/card.schema.ts` | Card data model | Needs full rewrite |
| `frontend/src/store/lib/deck-validation.ts` | Deckbuilding rules | Needs full rewrite |
| `frontend/src/store/lib/filtering.ts` | Card access filtering | Needs full rewrite |
| `frontend/src/store/lib/buildql/fields.ts` | Search field definitions | Needs remapping |
| `frontend/src/utils/constants.ts` | Game constants + special card codes | Needs cleanup |
| `backend/src/routes/arkhamdb-decklists.ts` | ArkhamDB sync | Delete/replace |
| `backend/src/scripts/ingest-arkhamdb-decklists.ts` | ArkhamDB data ingestion | Delete/replace |
| `frontend/src/utils/arkhamdb.ts` | ArkhamDB URL helpers | Delete |
| `frontend/src/utils/card-utils.ts` | Image URL construction | Minimal change (env var) |

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

## Current state

- **Shared package**: compiles clean with new ER schemas
- **Backend package**: compiles clean, ArkhamDB routes removed
- **Frontend package**: ~138 files have type errors — all expected downstream breakage from the schema change. These reference old AH `Card` type fields (`faction_code`, `skill_willpower`, `xp`, `health`, `sanity`, etc.) and will be fixed in Phases 4-6.
- **Card data**: schema is ready but no card data exists yet. Waiting on external metadata source.
- **Rulebook**: downloaded to `docs/rulebook.pdf` (21MB), text extracted to `docs/rulebook.txt` (5024 lines, not committed)
