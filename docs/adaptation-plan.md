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

### Phase 1: Card schema (start here)

Everything else depends on knowing what an Earthborne Rangers card looks like as a data type. Before touching any UI or validation logic:

1. Define the ER card schema in `shared/src/schemas/card.schema.ts`
   - Ranger stats (what are the equivalent of AH's willpower/intellect/combat/agility?)
   - Card types (aspect cards, skills, events, assets — map these to ER equivalents)
   - Aspect/faction system (ER uses Aspects instead of AH classes)
   - Deck configuration fields on Ranger cards
2. Update `shared/src/schemas/` for decklists and other dependent schemas
3. Update DTOs in `shared/src/dtos/`

### Phase 2: Strip ArkhamDB integration

Remove the parts that actively pull from an external Arkham service:
- Delete/gut `backend/src/routes/arkhamdb-decklists.ts`
- Delete/gut `backend/src/scripts/ingest-arkhamdb-decklists.ts`
- Remove ArkhamDB-specific DB tables from migrations
- Remove `frontend/src/utils/arkhamdb.ts` and `arkhamdb-json-format.ts`

This gives a clean backend to build the ER card data pipeline on top of.

### Phase 3: Card data pipeline

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

## Open questions (answer before starting Phase 1)

- What are the Earthborne Rangers card types? (equivalent of AH's asset/event/skill/enemy/location/etc.)
- What stats do Rangers have? (equivalent of willpower/intellect/combat/agility/health/sanity)
- What is the Aspect system? How many aspects are there, and how do they restrict deckbuilding?
- What are the deck size rules?
- Are there signature cards / required cards per Ranger?
- What are the equivalent of weaknesses?
- What card set / pack release structure exists?
