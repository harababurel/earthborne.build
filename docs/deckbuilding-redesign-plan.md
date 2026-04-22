# Deck Construction Page Redesign

## Context

The current deckbuilding UI is inherited from arkham.build and doesn't match Earthborne Rangers' rules or UX needs:

- `deck-create.tsx` has AH-era three-column layout (investigator front/back + bound cards) — none of which applies to ER
- `deck-edit.tsx` is `export default function DeckEdit() { return null; }` — a complete stub
- `DeckSchema` (frontend) lacks `rewards`, `maladies`, `displaced` fields that already exist in `shared/src/schemas/decklist.schema.ts`
- No store actions exist for campaign evolution mechanics
- No visual distinction between starter and evolved decks

The goal is: a wizard-based deck creation flow following ER's structured rules, plus a full deck edit page supporting both starter-deck tweaks and campaign evolution tracking.

---

## Part 1: Schema & Data Layer

### 1a. Add campaign fields to frontend DeckSchema
**File:** `frontend/src/store/schemas/deck.schema.ts`

Add three nullable fields to `DeckSchema` (aligning with `shared/src/schemas/decklist.schema.ts`):
```typescript
rewards: SlotsSchema.nullable().default(null),
displaced: SlotsSchema.nullable().default(null),
maladies: SlotsSchema.nullable().default(null),
```

`ResolvedDeck extends Deck`, and `resolveDeck()` spreads `...deck`, so these fields flow through automatically.

### 1b. Extend EditState and Slot type
**File:** `frontend/src/store/slices/deck-edits.types.ts`

```typescript
// Extend Slot:
export type Slot = "slots" | "rewards" | "displaced" | "maladies";

export function mapTabToSlot(tab: string): Slot {
  if (tab === "rewards" || tab === "displaced" || tab === "maladies") return tab;
  return "slots";
}

// Extend EditState:
export type EditState = {
  // ... existing fields ...
  quantities?: {
    slots?: Record<string, number>;
    rewards?: Record<string, number>;
    displaced?: Record<string, number>;
    maladies?: Record<string, number>;
  };
};
```

`applyDeckEdits()` in `frontend/src/store/lib/deck-edits.ts` already iterates `edits.quantities` keys dynamically — no changes needed there.

### 1c. Add campaign evolution actions to deck-edits slice
**File:** `frontend/src/store/slices/deck-edits.ts`

Add these actions (each calls `dehydrate()` after):

- **`unlockReward(deckId, cardCode)`** — set `rewards[cardCode] = 1`
- **`removeUnlockedReward(deckId, cardCode)`** — set `rewards[cardCode] = 0`
- **`swapRewardIntoSlots(deckId, rewardCode, displacedCode)`** — atomically: set `rewards[rewardCode] = 0`, set `slots[rewardCode] = 2`, set `slots[displacedCode] = 0`, set `displaced[displacedCode] = 2`
- **`restoreDisplaced(deckId, displacedCode, outCode)`** — atomically: set `displaced[displacedCode] = 0`, set `slots[displacedCode] = 2`, set `slots[outCode] = 0`, set `displaced[outCode] = 2` (or just remove from deck if player doesn't want to displace another)
- **`addMalady(deckId, cardCode)`** — set `maladies[cardCode] = 1`
- **`removeMalady(deckId, cardCode)`** — set `maladies[cardCode] = 0`

Also add these to `DeckEditsSlice` type.

### 1d. Add isEvolvedDeck helper
**File:** `frontend/src/utils/deck-utils.ts` (new file, or add to existing utils)

```typescript
export function isEvolvedDeck(deck: Pick<Deck, "rewards" | "displaced" | "maladies">) {
  return (
    Object.values(deck.rewards ?? {}).some((q) => q > 0) ||
    Object.values(deck.displaced ?? {}).some((q) => q > 0) ||
    Object.values(deck.maladies ?? {}).some((q) => q > 0)
  );
}
```

---

## Part 2: Deck Creation Wizard

Replaces the current AH-era three-column layout in `deck-create.tsx`. The wizard is linear and step-gated: each step must be completed before advancing.

### Flow

```
/deck/create           →  ChooseInvestigator (existing: browse role cards, click + to start wizard)
/deck/create/:code     →  Wizard (new)
```

Role is pre-selected from the URL param. Steps shown as a top progress bar.

**Wizard steps:**
1. **Name** — Ranger name text input + storage provider selector (local/shared). Default name from `getDefaultDeckName()`.
2. **Aspect** — Grid of 4 aspect cards (type_code === "aspect"). Select 1. Show aspect stats prominently.
3. **Background** — Background type picker (Artisan / Forager / Shepherd / Talespinner / Traveler). Then card list showing all cards for that background type — player selects 5. Running count shown.
4. **Specialty** — Card list for the role's specialty type (derived from role card's `specialty_type` field). Player selects 5. If exactly 5 cards exist, auto-select all and step becomes confirmation only.
5. **Personality** — All personality cards (type_code === "personality") auto-included. Show them for confirmation — no selection needed.
6. **Outside Interest** — Browseable/searchable list of all background + specialty cards excluding chosen background type, role's specialty type, and Expert/role cards. Player selects 1.
7. **Review** — Full 30-card deck preview grouped by category. Shows role + aspect card above. Validation summary (green checkmark or errors). Create button.

### State changes
**File:** `frontend/src/store/slices/deck-create.types.ts`

Replace `DeckCreateState` entirely:
```typescript
type DeckCreateStep = "name" | "aspect" | "background" | "specialty" | "personality" | "outside_interest" | "review";

type DeckCreateState = {
  step: DeckCreateStep;
  name: string;
  provider: "local" | "shared";
  roleCode: string;            // from URL, immutable
  aspectCode?: string;
  background?: string;         // background type key (e.g. "artisan")
  backgroundSlots: Record<string, number>;
  specialtySlots: Record<string, number>;
  personalitySlots: Record<string, number>;
  outsideInterestSlots: Record<string, number>;
};
```

**File:** `frontend/src/store/slices/deck-create.ts`

Replace all existing AH-era actions with:
- `initCreate(code)` — initialize state for given role code, pre-populate `personalitySlots` immediately
- `resetCreate()` — clear state
- `deckCreateSetStep(step)` — navigate between steps
- `deckCreateSetName(value)` / `deckCreateSetProvider(value)` — step 1
- `deckCreateSetAspect(code)` — step 2
- `deckCreateSetBackground(type)` + `deckCreateToggleBackgroundCard(code)` — step 3
- `deckCreateToggleSpecialtyCard(code)` — step 4
- `deckCreateToggleOutsideInterest(code)` — step 6

**File:** `frontend/src/store/selectors/deck-create.ts`

Replace `selectDeckCreateCardSets` with per-step selectors:
- `selectDeckCreateRole` — resolved role card
- `selectDeckCreateAspectCards` — all cards with type_code "aspect"
- `selectDeckCreateBackgroundCards(background)` — cards with matching background_type
- `selectDeckCreateSpecialtyCards(specialty)` — cards with matching specialty_type
- `selectDeckCreatePersonalityCards` — cards with type_code "personality"
- `selectDeckCreateOutsideInterestCards(background, specialty)` — all background/specialty cards excluding chosen ones

### UI components
**File:** `frontend/src/pages/deck-create/deck-create.tsx`

Replace `DeckCreateInner` three-column layout with a full-page wizard. Keep the outer shell (CardModalProvider, Masthead, Footer).

New sub-components (in `frontend/src/pages/deck-create/`):
- `DeckCreateProgress` — step breadcrumb/progress bar at top
- `DeckCreateStepName` — name input + provider radio
- `DeckCreateStepAspect` — card grid, single select
- `DeckCreateStepBackground` — type selector + card multi-select (pick 5)
- `DeckCreateStepSpecialty` — card multi-select (pick 5) or confirmation
- `DeckCreateStepPersonality` — display-only confirmation
- `DeckCreateStepOutsideInterest` — searchable card list, single select
- `DeckCreateStepReview` — deck preview + Create button

Keep `DeckCreateEditor` for the Create action (or inline it). The Create action assembles `slots` from all four slot groups and calls the existing deck save action.

---

## Part 3: Deck Edit Page

Replaces the null stub at `frontend/src/pages/deck-edit/deck-edit.tsx`.

### Layout

Two-panel layout (sidebar + main), similar to `DeckDisplay` but in edit mode.

**Sidebar:**
- Role card (compact) + aspect card (compact) as deck identity
- Deck name (editable inline)
- `DeckEvolutionBadge` — "Starter" or "Evolved" pill
- Validation status (errors listed)
- Save / Discard buttons

**Main (tabs):** uses existing `Tabs` component from `@/components/ui/tabs`
- **Deck** tab — card categories
- **Campaign** tab — rewards / displaced / maladies
- **Notes** tab — per-card annotations

### Deck tab

Cards grouped into sections: Personality (8 slots) · Background (10 slots) · Specialty (10 slots) · Outside Interest (2 slots).

Each section shows cards with a quantity control (+/−). Changing quantity calls `updateCardQuantity`. Swapping a card (remove one, add another of same category) is an edit-mode UX: clicking a card opens a picker for a replacement from the same category pool.

### Campaign tab

Shown always; when deck has no campaign data, show an empty-state message: *"This is a starter deck. Add unlocked rewards to begin tracking campaign changes."*

Three sections:

**Unlocked Rewards** — cards the ranger has earned but not yet swapped into the deck.
- "Add Reward" button → card browser filtered to `category === "reward"` → calls `unlockReward()`
- Each reward card shows "Add to Deck" button → triggers a displacement picker (select which deck card to move to Displaced) → calls `swapRewardIntoSlots()`
- "Remove" button → calls `removeUnlockedReward()`

**Displaced Cards** — cards removed from the 30-card deck when a reward was swapped in.
- Each displaced card shows "Restore" button → triggers a picker (select which deck card to displace in its place, or free slot if deck < 30) → calls `restoreDisplaced()`

**Maladies** — Lingering Injury cards, not counted in the 30-card limit.
- "Add Malady" button → card browser filtered to `category === "malady"` → calls `addMalady()`
- "Remove" button → calls `removeMalady()`

Adding any reward/displaced/malady automatically marks the deck as evolved (derived from data, no explicit flag needed).

### Notes tab

Per-card annotations using the existing `updateAnnotation` action and `decodeAnnotations` / `encodeAnnotations` from `deck-meta.ts`. Mirror the existing implementation in `card-modal.tsx`.

### New components (in `frontend/src/pages/deck-edit/`):
- `DeckEditSidebar` — role + aspect display, name editor, badge, validation, save/discard
- `DeckEditDeckTab` — category sections with edit controls
- `DeckEditCampaignTab` — rewards / displaced / maladies sections
- `DeckEditNotesTab` — annotation editor
- `DeckEvolutionBadge` (in `frontend/src/components/`) — reusable, used in edit page, deck view, and deck list

### Routing

`/deck/edit/:id` already exists in `app.tsx` and maps to `DeckEdit`. The `DeckEdit` page must:
1. Look up the deck by id from store
2. Initialize `deckEdits` (call `createEdit` if no pending edits)
3. Render the two-panel layout

---

## Part 4: Deck View Page (minor addition)

**File:** `frontend/src/components/deck-display/deck-display.tsx`

After the main decklist sections, show campaign sections if non-empty:
- Unlocked Rewards section (read-only card list)
- Displaced Cards section (read-only)
- Maladies section (read-only)
- Show `DeckEvolutionBadge` in the deck header area

These sections only render when the respective slots have entries.

---

## i18n

All new UI text must use `react-i18next` keys in `frontend/src/locales/en.json`. Key namespaces to add:
- `deck_create.*` — wizard step labels, prompts, navigation
- `deck_edit.*` — tab labels, section headings, empty states, action labels
- `deck.evolution.*` — badge labels ("Starter", "Evolved"), campaign section headings

---

## Critical Files

| File | Change |
|---|---|
| `frontend/src/store/schemas/deck.schema.ts` | Add rewards / displaced / maladies |
| `frontend/src/store/slices/deck-edits.types.ts` | Extend Slot, EditState |
| `frontend/src/store/slices/deck-edits.ts` | Add campaign actions |
| `frontend/src/store/slices/deck-create.types.ts` | Replace DeckCreateState |
| `frontend/src/store/slices/deck-create.ts` | Replace AH-era actions |
| `frontend/src/store/selectors/deck-create.ts` | Replace selectDeckCreateCardSets |
| `frontend/src/pages/deck-create/deck-create.tsx` | Full wizard UI |
| `frontend/src/pages/deck-edit/deck-edit.tsx` | Full implementation |
| `frontend/src/components/deck-display/deck-display.tsx` | Campaign sections, evolution badge |
| `frontend/src/locales/en.json` | New i18n keys |

Reuse: `Tabs` / `TabsContent` / `TabsList` / `TabsTrigger` from `@/components/ui/tabs`, `CardSet` from `@/components/cardset`, `Card` from `@/components/card/card`, validation from `frontend/src/store/lib/deck-validation.ts`, `isEvolvedDeck` helper, `applyDeckEdits` (no changes needed there).

---

## Verification

1. `npm run check -w frontend` — TypeScript passes with no errors
2. `npm run lint` — Biome passes with no warnings
3. Create deck: navigate to `/deck/create`, select a role, complete all 7 wizard steps, confirm resulting deck has exactly 30 cards (8 personality + 10 background + 10 specialty + 2 outside interest), plus role and aspect cards stored separately
4. Validate deck creation: the saved deck passes `validateDeck()` with no problems
5. Edit deck: open a created deck at `/deck/edit/:id`, verify all three tabs render, make a name change, save, verify it persists
6. Campaign evolution: in Campaign tab, add an unlocked reward, swap it into the deck, verify the displaced section gains a card, the deck slot count stays at 30, and the badge changes from "Starter" to "Evolved"
7. Deck view: verify `/deck/view/:id` shows the evolution badge and campaign sections for an evolved deck
