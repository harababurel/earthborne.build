# Arkham Residue Audit And Execution Plan

Current as of 2026-04-25.

This document replaces the older `docs/arkham-residue-cleanup.md` audit, which is now stale. That older file mixed together:

- work that has already been completed
- work that was renamed or moved
- work that still exists in active code paths

Use this file as the canonical execution plan for any future residue-cleanup work.

## Scope

This audit covers:

- active frontend code paths
- shared frontend/backend types that still leak Arkham concepts
- user-visible translation residue
- stale docs and supporting config that can confuse future work

It does **not** treat historical attribution or intentional upstream references as residue. Keep:

- the "based on arkham.build" attribution on the About page
- historical adaptation notes in `docs/adaptation-plan.md`
- AGPL/upstream credit

## Non-Regression Rule

These cleanup phases must not negatively impact the current Earthborne UI or rendering behavior.

Apply this rule when deciding whether to rename, delete, or preserve a leftover:

- remove dead code and unreachable UI freely
- rename stale internal concepts when behavior stays the same
- preserve active Earthborne user flows and current rendering unless a change is required to remove an invalid Arkham-only behavior
- if there is any doubt whether a path is still active, verify usage before deleting it

## Executive Summary

The old cleanup plan is not a reliable source of truth anymore.

It is stale in both directions:

- some items it calls out are already gone
- some of the most important remaining residue now lives elsewhere

The current highest-value residue is concentrated in five clusters:

1. list/filter/settings state still uses `investigator` as an active concept
2. deck collection filters still expose a dead `parallel` property
3. deck edit / notes / symbol tooling still contains side-deck and `per_investigator` leftovers
4. large translation surfaces still contain Arkham-only strings and keys
5. a few data/config files and query shims still encode Arkham semantics

The recommended approach is a short sequence of focused phases, not another giant sweep based on the obsolete plan.

## What The Old Plan Got Wrong

These examples are enough to show why `docs/arkham-residue-cleanup.md` should no longer drive execution:

- It says `frontend/src/pages/deck-edit/deck-edit.tsx` is a null stub. It is implemented now.
- It references directories that no longer exist, such as `frontend/src/components/customizations/` and `frontend/src/components/deck-investigator/`.
- It assumes residue is primarily in older schema files that no longer exist at the paths it names.
- It does not reflect the current locations of live residue in settings, list state, notes UI, and locale files.

## Audit Findings

### A. Active list/settings terminology residue

This is the most important remaining cluster because it affects state shape, filters, settings UI, migrations, and future feature work.

Evidence:

- `frontend/src/store/slices/settings.types.ts`
  - `settings.lists.investigator`
- `frontend/src/store/slices/settings.ts`
  - `INVESTIGATOR_DEFAULTS`
  - `getInitialListsSetting().investigator`
- `frontend/src/pages/settings/list-settings.tsx`
  - special-case logic for `listKey === "investigator"`
- `frontend/src/store/slices/lists.types.ts`
  - `FilterMapping.investigator`
  - `FilterMapping.investigator_skills`
  - `InvestigatorSkillsFilter`
- `frontend/src/store/slices/lists.type-guards.ts`
  - active type guards for `investigator` and `investigator_skills`
- `frontend/src/store/slices/lists.ts`
  - active switch branches for `investigator` and `investigator_skills`
- `frontend/src/store/selectors/lists.ts`
  - multiple active branches for `investigator` and `investigator_skills`
- `frontend/src/store/persist/migrations/0004-fix-investigator-default.ts`
  - migration still patches `settings.lists.investigator`

Assessment:

- This is not harmless naming drift.
- It keeps a false domain model alive in the most central frontend state layers.
- It increases the risk of future bugs and confuses any new contributor or agent.

Recommended action:

- Rename the active list concept from `investigator` to `role`.
- Remove `investigator_skills` entirely if nothing user-visible still depends on it.
- Rename or delete the related migration logic.

### B. Dead `parallel` deck property still wired into active filters

Evidence:

- `frontend/src/store/slices/deck-collection.types.ts`
  - `DeckPropertyName = "parallel"`
- `frontend/src/store/slices/deck-collection.ts`
  - initializes `parallel: false`
- `frontend/src/store/selectors/deck-collection.ts`
  - translates and exposes `parallel`
  - hardcodes the filter to always return `false`

Assessment:

- This is pure dead behavior in an active feature.
- It should not exist in an Earthborne deck collection UI.

Recommended action:

- Remove the `parallel` property filter end-to-end.
- Delete any corresponding locale keys that are now unused.

### C. Deck edit / notes / symbol residue

Evidence:

- `frontend/src/pages/deck-edit/card-extras.tsx`
  - still branches on `currentTab === "sideSlots"`
  - still checks `ignoreDeckLimitSlots`
- `frontend/src/pages/deck-edit/editor/notes-rte/symbols-popover.tsx`
  - still offers `per_investigator`
- `frontend/src/locales/*`
  - still contain `show_move_to_side_deck`, `move_to_side_deck`, `analyze_side_decks`

Assessment:

- Some of this is likely unreachable or partially vestigial, but it is still active code and active content.
- Notes/symbol UX should use Earthborne naming consistently.

Recommended action:

- Remove side-deck branches and side-deck settings if they are no longer reachable.
- Rename the symbol and locale key from `per_investigator` to `per_ranger`.

### D. Translation residue is still extensive and user-visible

Evidence:

- all locale files still contain many Arkham-era keys or strings, including:
  - `connect_arkhamdb`
  - `import_arkhamdb`
  - `xp_spent`
  - `uses_parallel`
  - `bondedSlots`
  - `sideSlots`
  - `parallel_front` / `parallel_back`
  - `show_move_to_side_deck`
  - many `{{investigator}}` interpolations
- several locale strings still mention “ArkhamDB-flavoured markdown” or similar wording

Assessment:

- This is the biggest user-visible residue surface left in the repo.
- Not every stale key is necessarily rendered, but the current locale corpus is not trustworthy as a product source of truth.

Recommended action:

- Audit locale keys by actual usage.
- Remove dead keys after code cleanup.
- Rename still-used keys to Earthborne-native names where appropriate.
- Rewrite user-facing copy that still references Arkham-only features.

### E. Data/config/query leftovers

Evidence:

- `frontend/src/store/services/queries.ts`
  - `newDeck()` still posts `investigator: payload.investigator_code`
- `frontend/src/store/services/data/types.json`
  - still contains Arkham card types including `investigator`, `asset`, `event`, `skill`, `treachery`, etc.
- `frontend/src/store/persist/migrate.ts`
  - still imports `0004-fix-investigator-default`

Assessment:

- These are smaller than the list/settings and locale issues, but they matter because they preserve incorrect semantics at integration boundaries.

Recommended action:

- Confirm whether `newDeck()` is dead code or still used. If dead, remove it. If active, rename payload semantics.
- Replace or delete `types.json` if it no longer reflects Earthborne card taxonomy.
- Clean up persist migrations that only exist to support removed list keys.

### F. Stale docs that will mislead future agents

Evidence:

- `docs/arkham-residue-cleanup.md`
  - obsolete and inaccurate
- `docs/deckbuilding-redesign-plan.md`
  - still says `deck-edit.tsx` is a null stub
- `docs/deck-create-rules-alignment.md`
  - still references `choose-investigator`

Assessment:

- This is not the highest product risk, but it is the highest agent-confusion risk.

Recommended action:

- Retire the old cleanup doc.
- Update or annotate stale planning docs when they conflict with current code.

## Already Completed Or No Longer Relevant

These should **not** be re-opened unless new evidence appears:

- `frontend/src/pages/deck-edit/deck-edit.tsx` is implemented and should not be treated as a stub-cleanup task.
- `frontend/src/components/customizations/` is already gone.
- `frontend/src/components/deck-investigator/` is already gone.
- several ArkhamDB backend routes and ingest scripts were already removed per `docs/adaptation-plan.md`.

## Recommended Execution Plan

Execute in order. Each phase should ship independently.

### Phase 1: Frontend state and filter normalization

Goal:

- remove the false `investigator` / `investigator_skills` domain model from active list and settings state
- remove the dead `parallel` property filter

Target files:

- `frontend/src/store/slices/settings.types.ts`
- `frontend/src/store/slices/settings.ts`
- `frontend/src/pages/settings/list-settings.tsx`
- `frontend/src/store/slices/lists.types.ts`
- `frontend/src/store/slices/lists.type-guards.ts`
- `frontend/src/store/slices/lists.ts`
- `frontend/src/store/selectors/lists.ts`
- `frontend/src/store/slices/deck-collection.types.ts`
- `frontend/src/store/slices/deck-collection.ts`
- `frontend/src/store/selectors/deck-collection.ts`
- `frontend/src/store/persist/migrations/0004-fix-investigator-default.ts`
- `frontend/src/store/persist/migrate.ts`

Deliverables:

- `investigator` list state renamed to `role`, or removed where redundant
- `investigator_skills` filter path removed
- `parallel` deck property filter removed end-to-end

Verification:

- `npm run check -w frontend`
- `npx biome check <touched frontend files>`
- smoke-test settings and list filtering

### Phase 2: Deck edit and notes cleanup

Goal:

- remove side-deck-era code paths from deck editing and notes symbol tooling

Target files:

- `frontend/src/pages/deck-edit/card-extras.tsx`
- `frontend/src/pages/deck-edit/editor/notes-rte/symbols-popover.tsx`
- any still-referenced move-to-side-deck UI files if present

Deliverables:

- no `sideSlots` / `ignoreDeckLimitSlots` logic in active deck-edit helpers
- `per_investigator` symbol renamed to `per_ranger`

Verification:

- `npm run check -w frontend`
- smoke-test deck edit and notes symbol insertion

### Phase 3: Locale and copy cleanup

Goal:

- remove or rename stale Arkham-era locale keys after code paths are cleaned up

Target files:

- `frontend/src/locales/en.json`
- all translated locale files in `frontend/src/locales/`

Approach:

- first determine which keys are still referenced by code
- delete dead keys
- rename active Earthborne equivalents
- rewrite visible copy that still mentions Arkham-only features

Priority keys/strings:

- `per_investigator`
- `show_move_to_side_deck`
- `move_to_side_deck`
- `analyze_side_decks`
- `uses_parallel`
- `xp_spent`
- `bondedSlots`
- `sideSlots`
- `connect_arkhamdb`
- `import_arkhamdb`
- any `{{investigator}}` copy that is still user-visible in Earthborne flows

Verification:

- `npm run check -w frontend`
- smoke-test English UI
- spot-check at least one non-English locale for missing-key regressions

### Phase 4: Query/data artifact cleanup

Goal:

- remove small but misleading integration-layer residue

Target files:

- `frontend/src/store/services/queries.ts`
- `frontend/src/store/services/data/types.json`
- any remaining callers of dead compatibility helpers

Deliverables:

- no active `investigator_code` payload mapping in Earthborne deck creation/update flows unless the backend contract truly requires it
- no stale Arkham type taxonomy file left pretending to be current ER metadata

Verification:

- `npm run check -w frontend`
- smoke-test deck creation/save paths

### Phase 5: Doc cleanup

Goal:

- ensure future agents do not restart from obsolete assumptions

Target files:

- `docs/arkham-residue-cleanup.md`
- `docs/deckbuilding-redesign-plan.md`
- `docs/deck-create-rules-alignment.md`

Deliverables:

- obsolete cleanup doc retired
- stale plan docs annotated or updated where they contradict the current codebase

## Suggested Agent Instructions

If handing this off to another agent, use constraints like these:

1. Treat this document as the source of truth, not `docs/arkham-residue-cleanup.md`.
2. Do Phase 1 first and stop after it unless explicitly asked to continue.
3. Remove dead code instead of preserving compatibility unless a current caller proves it is needed.
4. Do not rewrite product behavior beyond the residue cleanup.
5. Validate each phase with scoped frontend checks before moving on.

## Quick Triage Labeling

Use this priority order:

- P1: active state/model residue
- P1: dead active filters
- P2: deck edit and notes residue
- P2: user-visible locale residue
- P3: query/data artifacts
- P3: stale docs

## Exit Criteria

This cleanup should be considered complete when:

- no active frontend list/settings/filter state uses `investigator` or `investigator_skills` as Earthborne concepts
- no active deck collection filter uses `parallel`
- no active deck-edit path references side-deck mechanics
- `per_investigator` has been replaced with `per_ranger` in active code and user-visible strings
- stale locale keys for removed features are deleted or explicitly quarantined
- no planning doc claims work is pending when the code already moved on
