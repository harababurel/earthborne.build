# Deck creation flow — align with official rules

## Goal

Restructure the deck creation wizard so the order matches the Earthborne Rangers
rulebook (p.32), and move role selection to the end of the flow (from within
the chosen specialty) instead of the beginning. Add a quality-of-life preview
of eligible roles on the specialty step so the player can see where the flow
is headed without committing.

## Rules recap

Rulebook order:

1. Choose aspect
2. Determine personality
3. Choose background (5 cards)
4. Choose specialty (5 cards)
5. Choose outside interest (1 card)
6. Select role (from within chosen specialty — not part of the 30-card deck)

Each specialty ships with 2–3 role cards (core has 2 per, expansions add more).
The role is what starts in play; the other 30 cards are the deck.

## Current flow vs target flow

### Historical Current

```
Homepage → /deck/create (older ChooseInvestigator picker) → click role →
  /deck/create/:code (wizard: name → aspect → background → specialty →
  personality → outside_interest → review) → create
```

This section describes the old flow that existed when this plan was written.
Role is chosen first, wizard is initialized with `roleCode`, specialty is
decoupled from the role (the wizard lets you pick any specialty even though
your role already implies one).

### Target

```
Homepage → /deck/create (wizard: name → aspect → personality → background →
  specialty → outside_interest → role → review) → create
```

Role is chosen last, constrained to the roles of the chosen specialty.
The `/deck/create/:code` entry point and the `ChooseInvestigator` page are
removed.

## Changes by area

### 1. Routing & entry points

- `frontend/src/app.tsx`: drop the older `ChooseInvestigator` route at
  `/deck/create` and the `/deck/create/:code` route. Single route
  `/deck/create → DeckCreate`.
- Delete `frontend/src/pages/choose-investigator/` entirely (directory +
  `signature-link.tsx`). No other page links to it.
- `frontend/src/store/slices/lists.ts`: the `create_deck` list is still used
  by other features (e.g. card modals from within the wizard), so it stays —
  but verify nothing relies on the ChooseInvestigator page as the list
  consumer.
- Homepage / deck-collection "Create Deck" button already links to
  `/deck/create`; no change needed there.

**Verify:** `/deck/create` lands directly on the wizard step 1.

### 2. Store state (`deck-create.types.ts` / `deck-create.ts`)

- `DeckCreateState.roleCode` becomes optional (`roleCode?: string`).
- Remove the `code` parameter from `initCreate`. It now takes no arguments
  and seeds defaults without a role. Default name becomes a generic
  placeholder like "New Ranger" (localized), user can edit it in the name
  step like today.
- Add action `deckCreateSetRole(code: string)`.
- Add wizard step `"role"` to the `DeckCreateStep` union.

**Verify:** Wizard can be initialized without a role; `deckCreate.roleCode`
starts `undefined`.

### 3. Wizard step order

New `steps` array in `deck-create.tsx`:

```ts
const steps: DeckCreateStep[] = [
  "name",
  "aspect",
  "personality",
  "background",
  "specialty",
  "outside_interest",
  "role",
  "review",
];
```

Update `deck_create.steps.*` i18n keys to include `role`, and reorder if the
progress bar uses the array order (it does).

### 4. New role step (`DeckCreateStepRole`)

- Shows the role cards from `deckCreate.specialty` (filtered via a new
  `selectDeckCreateRoleCards(state, specialty)` selector — returns cards
  with `type_code === "role"` and `specialty_type === specialty`).
- Uses the existing `SelectableCard` component. Single-select behavior like
  the aspect step (radio-style).
- `canAdvance` for `"role"` returns `!!deckCreate.roleCode`.

**Verify:** Choosing a specialty of "Explorer" offers only the Explorer
roles (Vigilant Lookout, Undaunted Seeker, Peerless Pathfinder).

### 5. Specialty step — role preview (QoL)

After picking a specialty and above the specialty card grid, render a
non-interactive preview: "Your role will be chosen from:" followed by the
role cards (using `Card size="compact"`) for that specialty. The cards
should be visually distinct from selectable cards (no button, no hover
affordance, maybe reduced opacity) to make clear they're not selectable yet.

Implementation: same selector as the role step
(`selectDeckCreateRoleCards`). Gate rendering on `deckCreate.specialty`
being set.

**Verify:** Selecting "Explorer" on the specialty step shows the three
Explorer roles as a preview without a click target.

### 6. Selectors

- Add `selectDeckCreateRoleCards(state, specialty?)`:
  filters `type_code === "role" && specialty_type === specialty`.
- `selectDeckCreateRole`: currently asserts `roleCode` is set. Make it
  return `undefined` (or a nullable `ResolvedCard`) when `roleCode` is not
  yet chosen. Callers (the review step, `useAccentColor` at the wizard
  root) need to handle undefined.
- `useAccentColor` currently derives the theme color from the role card on
  the wizard root. With no role until step 7, pick a sensible fallback
  (aspect card once chosen, then role once chosen, otherwise neutral).

**Verify:** Navigating to the wizard before any selection does not crash;
accent color updates progressively.

### 7. Deck creation (`app.ts::createDeck`)

Already uses `state.deckCreate.roleCode`. With `roleCode` now optional,
`canAdvance` gates the review step, but defensively `createDeck` should
assert `roleCode` is defined before building the deck object. The
`createDeck` payload doesn't otherwise change.

### 8. Review step

Show the role card in the identity row (it already does via
`selectDeckCreateRole`). No layout change, but confirm it renders once role
becomes nullable-then-resolved.

### 9. i18n additions

- `deck_create.steps.role`
- `deck_create.role.title` ("Choose role")
- `deck_create.specialty.role_preview` ("Your role will be chosen from:")
- `deck_create.default_name` ("New Ranger") — replaces the current
  role-derived default.

## Quality-of-life ideas beyond what the user mentioned

These are optional and can be cut. Listed so they're visible for a yes/no:

1. **Role preview on specialty step** — the user already asked for this.
2. **Show specialty label on aspect step** — e.g. "High stat: FIT (3), low
   stat: AWA (1)" beneath each aspect card, so the player can reason about
   which backgrounds/specialties they'll unlock before committing.
3. **Back-navigation that preserves choices** — the wizard already keeps
   state when stepping backward; worth verifying nothing in the new flow
   resets selections unexpectedly (setting a new specialty should keep the
   background intact, etc.).
4. **Summary banner across all steps** — a thin strip showing current
   choices (aspect/background/specialty/role) as they're made, to reduce
   the need to scroll through progress dots.

## Out of scope / known issues surfaced while writing this

- **Personality step is not an actual choice today.** `initCreate` picks
  the first `PERSONALITY_PICKS` personality cards alphabetically into
  `personalitySlots` and the step renders them pre-selected with no
  interaction. Per the rules, the player chooses one personality card from
  each of the four aspects. This should be a separate plan — it's a
  correctness bug but orthogonal to role/specialty ordering.
- **Expert trait on outside interest** — the existing selector already
  excludes `is_expert`, which matches the rulebook.

## Implementation order

Small, reviewable tasks:

1. Store & types: make `roleCode` optional, add `deckCreateSetRole`,
   `initCreate` signature change, add `"role"` step.
2. Selectors: new `selectDeckCreateRoleCards`, make
   `selectDeckCreateRole` nullable, update callers.
3. Wizard: reorder `steps`, add `DeckCreateStepRole`, update `canAdvance`.
4. Specialty step: add role preview block.
5. Routing: delete `ChooseInvestigator`, collapse route to `/deck/create`.
6. i18n: new keys.
7. Smoke test the full flow end-to-end in the dev server; verify existing
   decks still load in the editor.

Each task should pass `npm run check -w frontend` before moving on.
