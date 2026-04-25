# Arkham Residue Audit And Cleanup Status

Current as of 2026-04-25.

This document is the current source of truth for arkham.build residue status in this repo.

It records:

- what was audited
- what was cleaned up
- what remains intentionally out of scope
- what future agents should treat as non-goals

## Summary

The active frontend residue cleanup identified in the April 2026 audit has been implemented.

The cleanup was executed under one constraint:

- it must not negatively impact the current Earthborne UI or rendering behavior

That constraint held. The resulting changes were validated with frontend typecheck, scoped linting, and frontend production builds.

## Completed Cleanup

### Active frontend state and filter cleanup

Completed:

- renamed active list/settings state from `investigator` to `role`
- removed the dead `investigator_skills` filter path
- removed the dead deck collection `parallel` property filter and its UI
- added a persisted-state migration for older saved list settings

Affected areas:

- `frontend/src/store/slices/settings.*`
- `frontend/src/store/slices/lists.*`
- `frontend/src/store/selectors/lists.ts`
- `frontend/src/store/slices/deck-collection.*`
- `frontend/src/store/selectors/deck-collection.ts`
- `frontend/src/store/persist/*`

### Deck edit and symbol cleanup

Completed:

- removed side-deck-era branches from active deck edit helpers
- renamed the active notes symbol from `per_investigator` to `per_ranger`

Affected areas:

- `frontend/src/pages/deck-edit/card-extras.tsx`
- `frontend/src/pages/deck-edit/editor/notes-rte/symbols-popover.tsx`
- active locale symbol keys

### Locale cleanup for dead active keys

Completed:

- removed unused Arkham-only locale keys that no longer have active frontend callers
- renamed active `per_investigator` locale keys to `per_ranger`

Examples removed from active locale bundles:

- `show_move_to_side_deck`
- `move_to_side_deck`
- `analyze_side_decks`
- `connect_arkhamdb`
- `import_arkhamdb`
- `xp_spent`
- `uses_parallel`
- `bondedSlots`
- `sideSlots`
- `parallel_front`
- `parallel_back`

### Dead query/data cleanup

Completed:

- removed the dead `newDeck()` frontend query helper that still posted `investigator_code`
- removed the unused frontend `frontend/src/store/services/data/types.json` artifact
- removed unused side-deck recommender state and the dead `include-side-deck-toggle` component

### Doc cleanup

Completed:

- updated stale docs that still described `deck-edit.tsx` as a stub or described the old choose-investigator flow as current
- updated agent docs to point here instead of the deleted old cleanup plan

Affected docs:

- `AGENTS.md`
- `CLAUDE.md`
- `GEMINI.md`
- `docs/adaptation-plan.md`
- `docs/deckbuilding-redesign-plan.md`
- `docs/deck-create-rules-alignment.md`

## Validation

The cleanup was validated with:

- `npm run check -w frontend`
- `npx biome check` on the touched frontend/docs files
- `npm run build -w frontend`

## Remaining Non-Goals

These are not considered pending cleanup work by default:

- historical attribution to arkham.build
- historical notes in `docs/adaptation-plan.md`
- upstream or generated content under `frontend/src/assets/`
- comments, snapshots, or historical docs that mention Arkham concepts as part of adaptation history
- backend/shared semantic renames that do not affect active Earthborne frontend behavior

## Remaining Possible Follow-Up

Possible future cleanup, if explicitly requested:

- backend/shared semantic renames for older compatibility naming
- test and comment wording cleanup where it still causes confusion
- historical doc cleanup beyond what is needed to avoid misleading future agents

These are lower priority than product behavior, UI polish, and normal feature work.

## Guidance For Future Agents

Use this rule when evaluating residue work:

- remove dead code and unreachable UI freely
- rename stale internal concepts when behavior stays the same
- preserve active Earthborne user flows and current rendering unless a change is required to remove an invalid Arkham-only behavior
- verify usage before deleting anything that might still be active

Do not restart a repo-wide residue sweep unless new evidence appears that active user-facing behavior is still leaking Arkham-specific concepts.
