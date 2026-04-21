# Arkham residue cleanup — findings and recommended plan

## Context

Recent work waves removed several arkham-specific systems from this Earthborne Rangers deckbuilder: current/legacy environments, chapter 1 vs chapter 2 cycles, the taboo list, weakness sets / random basic weakness, and fan-made content. This audit catalogues what *else* in the codebase is still arkham-only and is now dead, misleading, or actively wrong for ER.

Findings come from three parallel explorations (frontend, backend+shared, supporting files) plus targeted reads of `deck.schema.ts`, `slots.ts`, `types.ts`, `card-utils.ts`, `decklist.schema.ts`, and `package.json`. Nothing in this document changes any code — it is intended as a menu the user can sequence into future PRs.

The findings split into roughly three buckets:

- **Wrong-shape data model** — `Deck`, `DeckMeta`, `ResolvedDeck`, `CardWithRelations`, `DeckCharts`, and the resolve/slot logic still encode arkham primitives (investigators, factions, XP, side decks, bonded, parallel, exile, customizations, attachments). These actively shape how decks flow through the app and are the most expensive — and most valuable — to fix.
- **Dead surface area** — UI components, CSS, asset files, blog content, and stub helpers that were neutered for ER but never deleted. Removing them is mostly mechanical and reduces the surface that future Claude/agent sessions have to filter when reasoning about the codebase.
- **Cosmetic / branding** — package names (`@arkham-build/*`), CI defaults pointing at arkham.build, FUNDING.yml pointing at the upstream project. Low risk, high churn.

> Not in scope for removal (per CLAUDE.md / AGPL): the README/CLAUDE.md/AGENTS.md/GEMINI.md attribution lines pointing at upstream `arkham.build`, the historical `docs/adaptation-plan.md`, and the `arkham_build_url` link on the About page. These are required by the AGPL inheritance.

---

## Recommended phasing

I'd suggest tackling these in roughly this order. Each phase stands alone and ships independently.

1. **Phase A — Schema cleanup (high value, schema-first per CLAUDE.md).** Strip arkham-only fields from `Deck`, `DeckMeta`, `ResolvedDeck`, `CardWithRelations`. Cascades into deletes elsewhere.
2. **Phase B — Dead component / page / utility removal.** Once the schema no longer references them, side-deck UI, customizable sheet, specialist component, parallel-investigator filtering, recommendations bar, and the 2026 investigator blog page can be deleted outright.
3. **Phase C — Stub purge in `shared/src/lib/card-utils.ts` and `frontend/src/utils/card-utils.ts`.** Remove the empty arrays / `return false` helpers and inline the removals at call sites.
4. **Phase D — Dead CSS, dead assets, dead icon font entries.** No type/test churn, just file deletes.
5. **Phase E — Locale key rename (`investigator` → `ranger`, `faction` → `aspect` where the value is already ER).** Touches every locale file but is purely a rename.
6. **Phase F — Package rename `@arkham-build/*` → `@earthborne-build/*`.** Mechanical, ~50+ imports, do last to avoid merge conflicts with other phases.
7. **Phase G — Cosmetic CI/branding (FUNDING.yml, smoke-test workflow defaults, icomoon filename).** Trivial, can be folded into any other phase.

---

## Findings by area

### A. Data model / schema (highest leverage)

**`frontend/src/store/schemas/deck.schema.ts`** — `Deck` still requires arkham fields:
- `investigator_code` (required) — needs to become `role_code` or be removed; ER stores role under the new `role_code` field added at line 50
- `investigator_name` — same
- `meta` (string-encoded JSON) — only used for `DeckMeta` (which itself is mostly arkham)
- `ignoreDeckLimitSlots` — arkham mechanic (Charisma, etc.); ER decks always respect deck limit
- `sideSlots` — arkham side deck (allies, bonded); ER has no side deck
- `exile_string` — arkham exile mechanic; ER has none
- `xp`, `xp_spent`, `xp_adjustment` — ER has no XP
- `next_deck`, `previous_deck` — arkham campaign upgrade chain
- `version` (string) — used by ArkhamDB sync; ER stores its own version on `Decklist`
- `DeckProblem` enum value `"deck_options_limit"` and `"investigator"` — arkham-specific validation outcomes

**`frontend/src/store/lib/types.ts`** — multiple arkham-only types still in flight:
- `Attachments` type (line 10) — explicitly stub-typed but still imported by `decode-slots`-style code
- `OptionSelect` / `isOptionSelect` (line 29) — arkham deck options
- `CardWithRelations.relations` (line 53): `bonded`, `bound`, `restrictedTo`, `parallel`, `parallelCards`, `advanced`, `replacement`, `requiredCards`, `sideDeckRequiredCards`, `level`, `otherSignatures` — all arkham. `bound` may stay (used for ER's own bound-card relation), but everything else looks dead
- `Customization` / `Customizations` (line 77) — arkham TCU customizable cards
- `DeckMeta` (line 88) — arkham-only fields: `alternate_back`, `alternate_front`, `buildql_deck_options_override`, `card_pool`, `deck_size_selected`, `extra_deck`, `hidden_slots`, `faction_1`, `faction_2`, `faction_selected`, `option_selected`, `sealed_deck_name`, `sealed_deck`, `transform_into`, plus the `cus_*` / `attachments_*` / `card_pool_extension_*` template-string keys
- `Selection` union (line 139) — three variants, all arkham (`deckSize`, `faction`, `option`)
- `DeckCharts.skillIcons` and `DeckCharts.factions` (line 144) — should be `approachIcons` and `aspects`
- `ResolvedDeck` (line 153) — arkham-only fields: `attachments`, `availableAttachments`, `bondedSlots`, `sideSlots`, `extraSlots`, `exileSlots`, `customizations`, `investigatorFront`, `investigatorBack`, `hasExtraDeck`, `hasReplacements`, `hasParallel`, `otherInvestigatorVersion`, `sealedDeck`, `selections`, `cardPool`, `metaParsed`, plus inner `cards.{bondedSlots,exileSlots,extraSlots,sideSlots}`
- `DeckSummary` re-exports the same arkham subset

**`frontend/src/store/lib/slots.ts`** (`decodeSlots`) — three full code paths to remove:
- bonded card resolution (lines 43–51, 84–99, 153–167)
- `sideSlots` decoding (lines 103–117)
- `exileSlots` via `decodeExileSlots(deck.exile_string)` (lines 119–133)
- `extraSlots` (lines 135–151)
- `xpRequired` accumulation via `countExperience` (line 69, 146) — always 0 in ER, can be deleted along with the helper

**`frontend/src/store/lib/resolve-card.ts`** — arkham-only relation resolutions (`bonded`, `parallel`, `parallelCards`, `restrictedTo`, `sideDeckRequiredCards`, etc., line 59 area).

**`frontend/src/store/lib/resolve-deck.ts`** — `hasParallel` logic (line 83) and any other arkham-flavored derived state.

**`frontend/src/store/schemas/deck.schema.ts`** — also: the `DeckProblem` enum needs an ER-appropriate set.

### B. Backend / shared schema

**`backend/src/db/schema.types.ts`** + the migration that defined them — ingested but never queried/exposed:
- `card.imagesrc` (arkhamdb URL field — ER serves images locally)
- `card.back_card_id` (transform mechanic)
- `card.locations` (encounter scenario locations)
- `card.objective` (arkham scenario objective text)
- `card.spoiler` (arkham new-pack spoiler flag)
- `card.progress_fixed` (no known ER use)

These can be dropped from the schema and the matching writes in `backend/src/scripts/ingest-cards.ts` (lines 184–186, 192). Worth a follow-up migration; storage is small but they'll otherwise mislead readers.

**`backend/src/db/queries/card.ts`** (lines 257–260) — arkham-named columns repurposed for ER mapping at the API boundary:
- `cost` column → `energy_cost` API field
- `level` column → `aspect_requirement_value` API field
- `aspect_id` column → `aspect_requirement_type` API field
- `energy_aspect: null` — never populated

This works but is a foot-gun. A migration that renames the underlying columns to their ER semantic names would remove the mapping layer entirely.

### C. Stub / compatibility helpers

**`shared/src/lib/card-utils.ts`** — every export below is a no-op stub kept only to satisfy inherited callers:
- `countExperience()`, `cardLevel()`, `realCardLevel()`, `DECKLIST_SEARCH_MAX_XP` — XP system
- `SKILL_KEYS` — arkham skill icons
- `ASSET_SLOT_ORDER`, `FACTION_ORDER`, `PLAYER_TYPE_ORDER` — empty arrays propping up iteration
  - Each call site (e.g. `slots.ts:69` for `countExperience`, anywhere iterating `SKILL_KEYS`/`FACTION_ORDER`) should be deleted, then the stub removed.

**`frontend/src/utils/card-utils.ts`** — same pattern:
- `hasSkillIcons` (line 36)
- `sideways` (line 50), `reversed` (line 70) — arkham card layout
- `decodeExileSlots` (line 124)
- `isRandomBasicWeaknessLike` (line 155), `isStaticInvestigator` (line 161), `isSpecialist` (line 167)
- `cardUses` (line 177)
- `cycleOrPack` (line 190)
- `canShowCardPoolExtension` (line 227)

### D. Components and pages to delete outright

- `frontend/src/components/deck-investigator/` — rename to `deck-role/` (component represents ER role cards)
- `frontend/src/pages/choose-investigator/` — rename to `choose-role/`
- `frontend/src/components/skill-icons/skill-icons.tsx`, `skill-icons-investigator.tsx` — ER uses approach icons, not skill icons
- `frontend/src/components/icons/skill-icon.tsx`, `skill-icon-fancy.tsx` — same
- `frontend/src/components/faction-toggle.tsx` (+ module.css) — ER has no factions
- `frontend/src/components/filters/faction-filter.tsx` — same
- `frontend/src/components/filters/investigator-filter.tsx`, `investigator-card-access-filter.tsx`, `investigator-skills-filter.tsx`
- `frontend/src/components/customizable-sheet.tsx`, `frontend/src/components/customizations/customizations-editor.tsx` — already null-stubbed
- `frontend/src/components/card-modal/specialist.tsx` — already stub
- `frontend/src/pages/deck-edit/editor/move-to-side-deck.tsx`
- `frontend/src/pages/settings/show-move-to-side-deck.tsx`
- `frontend/src/pages/blog/investigator-2026-reveal.tsx` — Arkham Horror Marie Lambeau reveal blog
- `frontend/src/components/card-recommender/` — recommendations service was arkham-specific (audit first to confirm ER doesn't want a new one)
- `frontend/src/store/services/data/factions.json` — guardian/mystic/etc. data
- `frontend/src/pages/browse-decklists/decklists-filters/investigator-factions.tsx`

### E. CSS and assets

**`frontend/src/styles/main.css`**:
- Lines ~179–196 — CSS variables for arkham factions: `--guardian`, `--mystic`, `--rogue`, `--seeker`, `--survivor`, `--mythos`, `--neutral`, plus `*-dark` variants and `--multiclass-dark`. Unused.
- Lines ~826–1040 — `.fg-guardian`, `.fg-mystic`, etc. color classes built on those variables. Also unused.
- `.color-taboo`, `.border-taboo` (variable not even defined). Dead.

**`frontend/src/styles/icons-icon.css`**:
- Lines 262–283 — `.icon-skill_willpower`, `.icon-skill_intellect`, `.icon-skill_combat`, `.icon-skill_agility` (+ `_inverted`)
- `.icon-weakness`, `.icon-taboo`, `.icon-sanity`, `.icon-sanity_inverted` — unused
- Note: `.icon-per_investigator` IS used (filters, usable-by, symbols popover); leave it but consider renaming the class to `per_ranger` to match the locale terminology

**`frontend/src/styles/icons-encounters.css`** — entire file is mostly dead arkham encounter sets: `.encounters-arkham_ch2`, `.encounters-gangs_of_arkham`, `.encounters-people_of_arkham`, `.encounters-the_doom_of_arkham_part_*`, `.encounters-eldritch_lore`, `.encounters-miskatonic_university`, `.encounters-reeking_decay`, `.encounters-smoke_and_mirrors`, `.encounters-spreading_flames`. Audit which (if any) ER actually uses; delete the rest.

**`frontend/public/assets/rules/`** — arkham rules-reference imagery:
- `ChaosToken_Bless.png`, `ChaosToken_Frost.png`, `ChaosToken_Curse.png`
- `keyword_weakness.png`, `keyword_move.png` (unverified)
- `parallel_investigators.jpg`
- `anatomy_player.jpg`, `anatomy_encounter.jpg`
- `09021-upgradesheet.jpg`
- `overlay-tarot-slot.png`

Cross-check against the ER `/rules` page; if not referenced, delete.

**`frontend/public/assets/cycles/`** — `parallel.avif`, `fhv.avif`, `tsk.avif` are arkham cycle icons. Confirm unreferenced and delete.

**`frontend/public/assets/blog/`** — `investigator_2026_og.jpg` (paired with the arkham investigator blog page above).

**Icon metadata**:
- `frontend/src/assets/icomoon/arkham.build_ icons.json` — filename has the arkham.build prefix and a literal space in the name. Either rename or delete if the icon set has been re-exported under ER branding.
- `frontend/src/assets/icomoon/arkham.build_ encounters.json` — same.

**Card patches**:
- `frontend/src/store/services/data/card-patches/per-investigator-attributes.json` — patches for `doom_per_investigator`, `enemy_evade_per_investigator`, `shroud_per_investigator`. Pure arkham. Confirm not loaded, then delete.

### F. Locales

`frontend/src/locales/*.json` (9 languages). The values are mostly already ER-correct ("Ranger", "per ranger") but the *keys* still read `investigator`, `investigator_one`, `investigator_other`, `choose_investigator`, `investigator_card_access`, `investigator_skills`, `per_investigator`. A search-replace across all locale files plus the corresponding `t(...)` call sites in code would clean this up.

Also: `en.json` line 4 references "based on arkham.build" — keep per attribution.

### G. Branding / packaging / CI

- **Root `package.json`**: `"name": "arkham-build-monorepo"` → `earthborne-build-monorepo`
- **`frontend/package.json`**: `"name": "@arkham-build/frontend"`
- **`backend/package.json`**: `"name": "@arkham-build/backend"`
- **`shared/package.json`**: `"name": "@arkham-build/shared"` — renaming this drives ~50 import edits across `frontend/src/**`, `backend/src/**`, plus path aliases in `frontend/tsconfig.json`. Single mechanical PR.
- **`.github/workflows/frontend-smoke-tests-production.yml`**: line 10 default URL `https://arkham.build`; line 21 env var `VITE_ARKHAMDB_BASE_URL` (likely dead now).
- **`.github/FUNDING.yml`**: `github: [arkham-build]`, `patreon: arkhambuild` — points donations at the upstream project. Either repoint or empty out.
- **`frontend/src/utils/constants.ts` line 39**: `ISSUE_URL` points at `fspoettel/arkham.build`. Should target the earthborne.build repo's issues.

---

## Critical files to touch (Phase A focus)

These are the files Phase A would change. Listing them here so the executing agent doesn't have to re-derive:

- `frontend/src/store/schemas/deck.schema.ts` — slim `Deck`, replace `DeckProblem` enum
- `frontend/src/store/lib/types.ts` — slim `DeckMeta`, `ResolvedDeck`, `CardWithRelations.relations`, delete `Customization*`, `Attachments`, `OptionSelect`, `Selection` variants
- `frontend/src/store/lib/slots.ts` — delete bonded/side/exile/extra blocks, drop `xpRequired`
- `frontend/src/store/lib/resolve-card.ts` — drop arkham relations
- `frontend/src/store/lib/resolve-deck.ts` — drop `hasParallel` and friends
- `frontend/src/store/lib/deck-charts.ts` — replace `skillIcons` / `factions` with approach / aspect equivalents
- `shared/src/lib/card-utils.ts` — delete the stub block once call sites are gone

Dependent (will surface compile errors once the above are changed):
- Anything under `frontend/src/components/deck-*` and `frontend/src/pages/deck-*`
- `frontend/src/store/selectors/lists.ts` (`selectSkillIconsMinMax`, `selectInvestigatorOptions`)

## Reusable utilities already in the repo

These already exist and should be preferred over writing new logic during Phase A:
- `shared/src/lib/card-utils.ts` `cardEnergyCost`, `cardAspectRequirement`, `cardApproachIcons` — the ER-native helpers
- `frontend/src/utils/card-utils.ts` `isSpecialCard`, `isEnemyLike`, `cardBackType`, `getCanonicalCardCode` — ER-aware
- `shared/src/schemas/decklist.schema.ts` — already clean ER schema with `aspect_code`, `role_code`, `background`, `specialty`, `rewards`, `maladies`, `displaced`. Use as the canonical shape; the frontend `Deck` should converge toward it.

---

## Verification

For each phase, before declaring it done:

1. Run scoped checks per CLAUDE.md (the user's standing rule):
   - `npm run lint`
   - `npm run check -w frontend`
   - `npm run check -w backend`
   - `npm run build -w frontend`
   - `npm run test -w backend`
   - `npm run test -w shared`
2. For Phase A: load a saved deck in the dev frontend (`npm run dev -w frontend`), open it in the editor, save it again. Confirm the round-trip works without the dropped fields. Create a fresh deck via `/deck/create/<role-code>`. Browse decklists.
3. For Phase B/D (component/CSS deletion): visit the routes `/`, `/decks`, `/deck/edit/...`, `/deck/view/...`, `/card/...`, `/rules` and watch the browser console for missing-asset 404s.
4. For Phase E (locale rename): `npm run check -w frontend` will catch any code site still calling `t("...investigator...")`. Smoke-test the UI in at least one non-English locale to confirm strings still render.
5. For Phase F (package rename): `npm run check` on every workspace, plus a fresh `npm install` to confirm workspace resolution still works.
6. For Phase G: trigger the smoke-test workflow against `earthborne.build` to confirm the new default works.

---

## Things explicitly *not* to remove

Per CLAUDE.md and AGPL inheritance:
- README.md / CLAUDE.md / AGENTS.md / GEMINI.md attribution lines pointing at upstream `arkham.build`
- `docs/adaptation-plan.md` (historical record used by future Claude sessions)
- `docs/rules-reference-retrospective.md`
- The "based on arkham.build" string and `arkham_build_url` link on the About page
- The `.icon-per_investigator` CSS class (still actively used; rename later if desired)
