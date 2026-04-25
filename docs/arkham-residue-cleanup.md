# Arkham residue cleanup — comprehensive audit

Comprehensive audit of remaining arkham.build dead code in the earthborne.build codebase, post-adaptation phases 1–11. Use this as the canonical reference for all future residue-removal sessions.

Items are grouped by category and ordered by recommended execution sequence. Each phase stands alone and can ship independently.

---

## Phase A — Data model / schema (highest leverage)

Cleaning these unlocks cascading deletes across the rest of the codebase.

### `frontend/src/store/schemas/deck.schema.ts`
Arkham-only fields still on the `Deck` type:
- `investigator_code` (required) — ER stores role under `role_code`
- `investigator_name`
- `xp`, `xp_spent`, `xp_adjustment` — no XP system in ER
- `sideSlots` — arkham side deck; ER has none
- `exile_string` — arkham exile mechanic
- `ignoreDeckLimitSlots` — Charisma etc.; ER always respects deck limit
- `next_deck`, `previous_deck` — campaign upgrade chain
- `version` — ArkhamDB sync field
- `DeckProblem` enum values `"investigator"` and `"deck_options_limit"`

### `frontend/src/store/lib/types.ts`
- `Attachments` type — stub-typed but still imported
- `OptionSelect` / `isOptionSelect` — arkham deck options
- `Customization` / `Customizations` — TCU customizable cards
- `DeckMeta` — arkham-only fields: `faction_1/2`, `deck_size_selected`, `extra_deck`, `sealed_deck`, `hidden_slots`, `card_pool`, `option_selected`, `transform_into`, `sealed_deck_name`, plus `cus_*` / `attachments_*` / `card_pool_extension_*` template-string keys
- `Selection` union — three variants, all arkham (`deckSize`, `faction`, `option`)
- `DeckCharts.skillIcons` and `DeckCharts.factions` — should be `approachIcons` and `aspects`
- `ResolvedDeck` — arkham-only fields: `bondedSlots`, `sideSlots`, `extraSlots`, `exileSlots`, `customizations`, `investigatorFront`, `investigatorBack`, `sealedDeck`, `selections`, `cardPool`, `hasParallel`, `hasReplacements`, `otherInvestigatorVersion`, plus inner `cards.{bondedSlots,exileSlots,extraSlots,sideSlots}`

### `frontend/src/store/lib/slots.ts`
Three full code paths to remove:
- bonded card resolution (~lines 43–51, 84–99, 153–167)
- `sideSlots` decoding (~lines 103–117)
- `exileSlots` via `decodeExileSlots` (~lines 119–133)
- `extraSlots` (~lines 135–151)
- `xpRequired` accumulation via `countExperience`

### `frontend/src/store/lib/resolve-card.ts`
- Arkham relation resolutions: `bonded`, `parallel`, `parallelCards`, `restrictedTo`, `sideDeckRequiredCards`

### `frontend/src/store/lib/resolve-deck.ts`
- `hasParallel` logic and related derived state

### `frontend/src/store/lib/deck-charts.ts`
- `skillIcons` → replace with `approachIcons`
- `factions` → replace with `aspects`

### `frontend/src/store/lib/lookup-tables.types.ts`
All of the following relation tables are declared but never populated (ER has none of these mechanics):
- `advanced`, `base`, `bonded`, `parallelCards`, `parallel`, `sideDeckRequiredCards`, `replacement`, `restrictedTo`

---

## Phase B — Null-stub components and pages (pure deletes)

These already return `null` or are empty files. Zero replacement work needed — just delete.

| Path | Note |
|---|---|
| `frontend/src/components/customizable-sheet.tsx` | null stub |
| `frontend/src/components/deck-investigator/` (3 files) | null stubs; dir → `deck-role/` if ER role display is ever added |
| `frontend/src/components/customizations/` (8 files) | all null stubs |
| `frontend/src/components/card-recommender/card-recommender.tsx` | null stub |
| `frontend/src/pages/deck-edit/editor/investigator-listcard.tsx` + `.module.css` | null stub |
| `frontend/src/pages/deck-edit/editor/move-to-side-deck.tsx` | null stub |

---

## Phase C — Card patches directory (entire directory is dead)

`frontend/src/store/services/data/card-patches/` contains 12 arkham card data patch files, all actively imported through `index.ts`. None of the patch data has any ER equivalent. The whole directory should be deleted along with any caller that applies them to cards.

Files to delete:
- `index.ts`
- `attachments.json`
- `card-back-types.json`
- `game-begin-attributes.json`
- `hidden-fixes.json`
- `investigator-duplicates.json`
- `missing-tags.json`
- `per-investigator-attributes.json`
- `player-card-deck-options.json`
- `previews.json`
- `rbw.json`
- `reprints.json`

Also check and delete if present: `frontend/src/store/services/data/factions.json`

---

## Phase D — Utility stubs and dead selectors

Remove only after Phase A clears the call sites.

### `shared/src/lib/card-utils.ts`
All of these are no-op stubs:
- `countExperience()`, `cardLevel()`, `realCardLevel()`, `DECKLIST_SEARCH_MAX_XP` — XP system
- `SKILL_KEYS` — arkham skill icon keys (empty array)
- `ASSET_SLOT_ORDER`, `FACTION_ORDER`, `PLAYER_TYPE_ORDER` — empty arrays

### `frontend/src/utils/card-utils.ts`
Stub functions (all return `false`/`{}`/pass-through):
- `hasSkillIcons`, `sideways`, `reversed`, `decodeExileSlots`, `isRandomBasicWeaknessLike`, `isStaticInvestigator`, `cardUses`, `cycleOrPack`, `canShowCardPoolExtension`

### `frontend/src/utils/constants.ts`
- `ISSUE_URL` points at `fspoettel/arkham.build` → change to `harababurel/earthborne.build`
- Stub constants: `SPECIAL_CARD_CODES`, `PREVIEW_PACKS`, `RETURN_TO_CYCLES`, `SIDEWAYS_TYPE_CODES`, `ORIENTATION_CHANGED_CARDS`, `REGEX_BONDED`, `REGEX_SKILL_BOOST`, `TAG_REGEX_FALLBACKS`, `ACTION_TEXT_ENTRIES`, `CARD_SET_ORDER`

### `frontend/src/store/lib/filtering.ts`
Stub filters that always return `undefined` or `false`:
- `filterDuplicates`, `filterAlternates`, `filterMythosCards`, `filterBacksides`
- `filterActions`, `filterAssets`, `filterCycleCode`, `filterLevel`
- `filterSkillIcons`, `filterInvestigatorSkills`, `filterSubtypes`
- `filterInvestigatorWeaknessAccess`, `makeOptionFilter`

### Other stubs
- `frontend/src/store/lib/deck-validation.ts` — `getAdditionalDeckOptions` (always returns `[]`)
- `frontend/src/store/lib/card-edits.ts` — `applyCardChanges` (always returns card unchanged)
- `frontend/src/store/slices/metadata.types.ts` — `cycles`, `factions`, `subtypes`, `types` typed as `Record<string, any>` stubs
- `frontend/src/store/selectors/lists.ts` — `SKILL_KEYS` iteration loops (always empty), `selectSkillIconsMinMax`, `selectAvailableUpgrades`, `selectResolvedUpgrades`
- `frontend/src/store/selectors/deck-collection.ts` — `parallel` property filter (always `false`)
- `frontend/src/store/slices/deck-collection.types.ts` — `DeckPropertyName = "parallel"` (the only property, always false)

---

## Phase E — Active arkham components needing ER replacements

These are still rendered. Removing them requires deciding whether to build an ER replacement or drop the feature entirely.

| Component | Where used | What it does | ER action |
|---|---|---|---|
| `components/faction-toggle.tsx` + `.module.css` | `deck-collection-filters.tsx` | Arkham faction toggle | Replace with aspect toggle or remove |
| `components/filters/faction-filter.tsx` | `filters.tsx` | Faction filter sidebar | Remove (ER has aspect filter already) |
| `components/filters/investigator-filter.tsx` | `filters.tsx` | Investigator list filter | Evaluate — ER may want a ranger/role filter |
| `components/filters/investigator-skills-filter.tsx` + `.module.css` | `filters.tsx` | Skill icon filter | Remove (ER has approach filter) |
| `components/icons/faction-icon.tsx` | various | Faction icon | Remove once consumers are gone |
| `components/icons/faction-icon-fancy.tsx` | faction-toggle, deck-collection-filters | Renders `.icon-class_guardian` etc. | Remove once consumers are gone |
| `components/icons/skill-icon.tsx` | various | Renders `.icon-skill_*` | Remove |
| `components/icons/skill-icon-fancy.tsx` | active | Renders arkham skill icons (line 21) | Remove |
| `pages/settings/show-move-to-side-deck.tsx` | settings page | Active toggle for side-deck feature | Remove (ER has no side deck) |

---

## Phase F — CSS dead code

### `frontend/src/styles/main.css`
- Lines ~179–195: CSS custom properties `--guardian`, `--mystic`, `--rogue`, `--seeker`, `--survivor`, `--mythos`, `--neutral` and `*-dark` variants
- Lines ~596–1056: `.color-taboo`, `.border-taboo`, `.color-guardian/mystic/rogue/seeker/survivor`, `.bg-guardian/…`, `.border-guardian/…`, `.fg-guardian/mystic/rogue/seeker/survivor`, faction decoration classes — none referenced in ER code

### `frontend/src/styles/icons-icon.css`
- Lines ~169–174: `.icon-sanity`, `.icon-sanity_inverted`
- Lines ~181–195: `.icon-guardian`, `.icon-seeker`, `.icon-mystic`, `.icon-rogue`, `.icon-survivor`
- Lines ~235–258: `.icon-weakness`, `.icon-curse`, `.icon-bless`
- Lines ~262–285: `.icon-skill_willpower`, `_intellect`, `_combat`, `_agility` (+ `_inverted` variants)
- Lines ~304–338: `.icon-class_guardian/seeker/rogue/mystic/survivor/multiclass/neutral`, `.icon-taboo`
- Note: `.icon-per_investigator` **is** actively used — leave it for now (rename to `per_ranger` in Phase I)

### `frontend/src/styles/icons-encounters.css`
All 449 entries are arkham encounter set icons. **Zero ER-specific entries exist.** The file is imported in `main.tsx`. Options: replace with an ER-specific version if encounter set icons are needed, or remove the import if they are not used in the current UI.

---

## Phase G — Static assets

Verify each with a `grep -r` before deleting.

### `frontend/public/assets/rules/` — delete all (all arkham)
`09021-upgradesheet.jpg`, `anatomy_encounter.jpg`, `anatomy_player.jpg`, `ChaosToken_Bless.png`, `ChaosToken_Curse.png`, `ChaosToken_Frost.png`, `keyword_move.png`, `keyword_victory.png`, `keyword_weakness.png`, `overlay-tarot-slot.png`, `parallel_investigators.jpg`

### `frontend/public/assets/cycles/` — delete arkham-only entries
ER cycles to **keep**: `ebr.avif`, `loa.avif`, `sib.avif`, `sos.avif`, `sotv.avif`, `motp.avif`, `mitv.avif`, `core.avif`

Delete: `core_ch2.avif`, `dwl.avif`, `eoe.avif`, `fhv.avif`, `investigator.avif`, `investigator_decks_ch2.avif`, `parallel.avif`, `promotional.avif`, `ptc.avif`, `return.avif`, `side_stories.avif`, `sos_mobile.avif`

### `frontend/public/assets/blog/` — verify and delete arkham blog content
`investigator_2026_og.jpg`, `reveal_arcane_initiate.avif`, `reveal_bloodstone.avif`, `reveal_cosmic_guidance.avif`, `reveal_offering_bowl.avif`, `tillinghast_esoterica.jpg`, `core_2026_full.avif`, `core_2026_full.png`, `core_2026_og.jpg`

### `frontend/src/assets/patterns/` — delete all (arkham faction SVGs, ~284 KB)
`guardian.svg`, `mystic.svg`, `rogue.svg`, `seeker.svg`, `survivor.svg`, `multiclass.svg`, `mythos.svg`, `neutral.svg`

### `frontend/src/assets/icomoon/`
Rename `arkham.build_ icons.json` → `earthborne.build_icons.json` and `arkham.build_ encounters.json` → `earthborne.build_encounters.json` (filenames have a literal space and the wrong brand).

---

## Phase H — Backend schema orphans

These columns exist in the DB but are never queried, mapped, or exposed through the API.

### Drop unused columns
A new migration should drop these from the `card` table:
`imagesrc`, `back_card_id`, `locations`, `objective`, `spoiler`, `progress_fixed`

Files to update after the migration:
- `backend/src/db/schema.types.ts` — remove the corresponding fields
- `backend/src/scripts/ingest-cards.ts` — remove writes to those fields (~lines 374–383)

### `backend/.kysely-codegenrc.json`
Remove overrides for `arkhamdb_decklist.slots`, `arkhamdb_decklist.side_slots`, `arkhamdb_decklist.ignore_deck_limit_slots` — these tables don't exist in the ER schema.

### Column mapping foot-gun in `backend/src/db/queries/card.ts`
The query renames DB columns to their ER API names at the query boundary (`cost` → `energy_cost`, `level` → `aspect_requirement_value`, `aspect_id` → `aspect_requirement_type`). This works but is confusing. A follow-up migration renaming the underlying columns to their ER semantic names would remove the mapping layer entirely.

---

## Phase I — Locale key renames

ER *values* in these keys are already correct (e.g., "Ranger"); only the *key names* are stale arkham. Affects all 9 locale files (`en.json` + 8 translations). A search-replace across locales + `t(...)` call sites in code is sufficient.

| Old key | New key |
|---|---|
| `common.type.investigator` / `investigator_one` / `investigator_other` | `role` / `role_one` / `role_other` |
| `filters.investigator` | `filters.role` |
| `filters.investigator_card_access` | `filters.card_access` |
| `filters.investigator_skills` | `filters.approaches` |
| `deck_create.choose_investigator` | `deck_create.choose_role` |
| `common.per_investigator` | `common.per_ranger` |

Also rename CSS class `.icon-per_investigator` → `.icon-per_ranger` in the same pass.

---

## Phase J — Package names, config, and CI branding

Mechanical renames, low risk. Do last to avoid merge conflicts with other phases.

| File | Change |
|---|---|
| Root `package.json` `name` | `arkham-build-monorepo` → `earthborne-build-monorepo` |
| `frontend/package.json` `name` | `@arkham-build/frontend` → `@earthborne-build/frontend` |
| `backend/package.json` `name` | `@arkham-build/backend` → `@earthborne-build/backend` |
| `shared/package.json` `name` | `@arkham-build/shared` → `@earthborne-build/shared` — **drives ~50 import edits** |
| `frontend/tsconfig.json` path alias | `"@arkham-build/shared"` → `"@earthborne-build/shared"` |
| `backend/tsconfig.json` path alias | same |
| `.github/FUNDING.yml` | `github: [arkham-build]`, `patreon: arkhambuild` → update or clear |
| `.github/workflows/frontend-smoke-tests-production.yml` | default URL `https://arkham.build` → `https://earthborne.build`; remove dead `VITE_ARKHAMDB_BASE_URL` env var |
| `backend/docker-compose.yml` | service name `api-arkham-build` → `api-earthborne-build` |
| `test/e2e/tests/mocks.ts` | fallback URL `https://api.arkham.build` → earthborne equivalent |
| `frontend/src/components/card-list/card-search.tsx` | hardcoded link to `arkham-build/arkham.build/.../buildql.md` → local path or earthborne repo |

---

## Things explicitly *not* to remove

Per CLAUDE.md and AGPL inheritance:
- README.md / CLAUDE.md / AGENTS.md / GEMINI.md attribution lines pointing at upstream `arkham.build`
- `docs/adaptation-plan.md` (historical record used by future agent sessions)
- `docs/rules-reference-retrospective.md`
- The "based on arkham.build" string and `arkham_build_url` link on the About page

---

## Verification (per phase)

Before declaring any phase done:

1. Run scoped checks per CLAUDE.md:
   - `npm run lint`
   - `npm run check -w frontend`
   - `npm run check -w backend`
   - `npm run build -w frontend`
   - `npm run test -w backend`
   - `npm run test -w shared`
2. **Phase A**: Load a saved deck, open it in the editor, save again (round-trip). Create a fresh deck via `/deck/create/<role-code>`. Browse decklists.
3. **Phase B/C/G** (deletes): Visit `/`, `/decks`, `/deck/edit/…`, `/deck/view/…`, `/card/…`, `/rules` and check the browser console for 404s.
4. **Phase I** (locale rename): `npm run check -w frontend` will catch any `t("...investigator...")` call sites. Smoke-test at least one non-English locale.
5. **Phase J** (package rename): `npm run check` on every workspace + a fresh `npm install` to confirm workspace resolution works.
