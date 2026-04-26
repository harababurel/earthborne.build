# List sort & grouping settings — redesign plan

## Status

Draft, 2026-04-26. Not yet started.

## Why this exists

The Lists section of the settings page (`frontend/src/pages/settings/settings.tsx:165-201`,
`frontend/src/pages/settings/list-settings.tsx`) is largely an arkham.build relic. The
exposed sort/group fields and the per-context defaults reference concepts that do not
exist in Earthborne Rangers — `slot`, `level`, `subtype`, `faction` — while leaving
ER-native concepts (approach icons, equip cost, ranger deck categories, path sets)
either underused or invisible in defaults.

The goal: make the field set, the labels, and the per-context defaults reflect how a
ranger actually browses cards and reads a deck.

## ER concepts we are designing for

- **Aspects** — AWA / FIT / FOC / SPI. Both an energy cost type and a stat axis.
  Replaces the AH "faction" axis.
- **Card types** — 13 concrete types, no subtype layer. Player-side: `moment`,
  `attachment`, `gear`, `being`. Path-side: `feature`, `attribute`, `path`, `location`,
  `weather`, `mission`, `challenge`. Special: `aspect`, `role`.
- **Ranger deck categories** — `personality`, `background`, `specialty`, `reward`,
  `malady`. These are deck *slots* in the ER sense and are the most useful axis when
  looking at a built deck.
- **Approach icons** — `conflict`, `reason`, `exploration`, `connection`. Four left-edge
  icons on every ranger card. Currently not surfaced at all.
- **Equip value** — gear-only stat. Currently not surfaced.
- **Path sets** — ER's encounter-set equivalent (`set_code`). The label
  `encounter_set` in the codebase is misleading.
- **Pack / cycle** — release axis; mostly useful in collection view.

## Design

### Field inventory (post-redesign)

#### Player / Mixed lists

| Field         | Group | Sort | Notes                                                  |
|---------------|:-----:|:----:|--------------------------------------------------------|
| `name`        |       |  ✓   | Alpha. Existing.                                       |
| `cost`        |   ✓   |  ✓   | `energy_cost`. Existing.                               |
| `aspect`      |   ✓   |  ✓   | `energy_aspect`. Existing.                             |
| `type`        |   ✓   |  ✓   | `type_code`. Existing.                                 |
| `category`    |   ✓   |  ✓   | Ranger deck category. Sort: expose the existing impl.  |
| `approach`    |   ✓   |  ✓   | **NEW.** Primary approach icon (highest of 4).         |
| `equip`       |       |  ✓   | **NEW.** `equip_value`, gear-only; nulls last.         |
| `pack`        |   ✓   |  ✓   | Existing.                                              |
| `cycle`       |   ✓   |  ✓   | Existing.                                              |
| `position`    |       |  ✓   | Existing. Set position within pack.                    |

Removed entirely from the unions: `slot`, `level`, `subtype`, `faction`,
`encounter_set` (kept on the path side only).

#### Path lists (encounter context)

Rename the user-facing label from "Encounter / Path cards" to **"Path cards"**, and
rename the internal `encounter_set` group key to `path_set` (with a one-shot migration
for stored settings).

| Field         | Group | Sort | Notes                                |
|---------------|:-----:|:----:|--------------------------------------|
| `name`        |       |  ✓   |                                      |
| `type`        |   ✓   |  ✓   |                                      |
| `path_set`    |   ✓   |       | Renamed from `encounter_set`.        |
| `pack`        |   ✓   |  ✓   |                                      |
| `cycle`       |   ✓   |  ✓   |                                      |
| `position`    |       |  ✓   | `set_position`, "X-Y" parsed.        |

#### Mixed list

Union of Player and Path field sets, deduped — same as today, but over the cleaned-up
unions.

### List contexts

Keep all five contexts (`player`, `encounter`, `mixed`, `deck`, `deckScans`) but
rename `encounter` → `path` everywhere user-facing. Internal key stays `encounter` to
avoid a broader refactor; only the i18n label changes. (Alternative: rename the key
too — see Open questions.)

### New defaults

```ts
PLAYER_DEFAULTS   = { group: ["category", "type"],        sort: ["cost", "name"] }
PATH_DEFAULTS     = { group: ["pack", "path_set"],        sort: ["position"] }
MIXED_DEFAULTS    = { group: ["type"],                    sort: ["name"] }
DECK_DEFAULTS     = { group: ["category", "type"],        sort: ["cost", "name"] }
DECK_SCANS_DEF.   = { group: ["category"],                sort: ["type", "name"] }
```

Rationale:

- **Player browsing** defaults to category → type because that mirrors how a ranger
  picks cards into the deck (pick 5 from your background, etc.).
- **Deck view** uses the same axis: when you look at your built deck, the most
  meaningful grouping is which slot each card filled. This is the single biggest
  improvement over the current `["type","slot"]` default, which renders as `[type,
  none]` today.
- **Path** keeps the existing `pack` → `path_set` grouping; that already works.
- **Mixed** stays simple — type only — since it's a "show me everything" view.

### Sorting presets

Drop `SORTING_PRESETS` (settings.ts:46-75). It is dead in the UI today (grep for
usages). If reintroduced later, do it on top of the new field set.

### UI changes to `list-settings.tsx`

- Drop the encounter-list-specific `level` filter at lines 46-47 (level is gone for
  everyone).
- Add i18n labels for `approach`, `equip`, `path_set`.
- Group ordering in the toggle list: surface `category` and `type` at the top of the
  player/deck contexts so the most-used toggles are immediately visible.

## Implementation plan

Schema-first, then logic, then UI, then migration. Each step is independently
verifiable.

### Step 1 — Prune the type unions

`frontend/src/store/slices/lists.types.ts:127-152`

- Remove `slot`, `level`, `subtype`, `faction` from `GroupingType` and `SortingType`.
- Add `approach` to both unions; add `equip` to `SortingType` only.
- Rename `encounter_set` → `path_set` in `GroupingType`.

Verify: `npm run check -w frontend` will surface every dead reference.

### Step 2 — Update grouping logic

`frontend/src/store/lib/grouping.ts`

- Drop the `slot` / `level` / `subtype` branches in `applyGrouping` (currently no-ops
  returning `none`).
- Replace `encounter_set` constant + grouping function names with `path_set`.
- Add `groupByApproach(card)`: returns the dominant approach icon, ties broken by
  `conflict > reason > exploration > connection` (TBD with user).
- Update `PLAYER_GROUPING_TYPES` and `ENCOUNTER_GROUPING_TYPES` (rename to
  `PATH_GROUPING_TYPES`) to match the inventory above.

### Step 3 — Update sorting logic

`frontend/src/store/lib/sorting.ts`

- Add `category` to the exposed `SORTING_TYPES` (impl already exists at lines
  207-221).
- Add `sortByApproach` and `sortByEquip` (gear-only, nulls last).
- Drop `level` sort.

### Step 4 — Update defaults & migration

`frontend/src/store/slices/settings.ts`

- Replace `PLAYER_DEFAULTS`, `ENCOUNTER_DEFAULTS` (rename to `PATH_DEFAULTS`),
  `MIXED_DEFAULTS`, `DECK_DEFAULTS`, `DECK_SCANS_DEFAULTS` per the design above.
- Delete `SORTING_PRESETS`.

Settings persistence: stored configs may contain stale field names
(`slot`/`level`/`subtype`/`faction`/`encounter_set`). Add a migration in the persist
hydrate path that strips unknown fields from each list config's `group` and `sort`
arrays, and rewrites `encounter_set` → `path_set`. If a list config is left empty
after stripping, fall back to the new defaults.

Locate the migration hook in `frontend/src/store/persist.ts` (or wherever
`hydrate`/`dehydrate` live for settings).

### Step 5 — UI

`frontend/src/pages/settings/list-settings.tsx` and
`frontend/src/pages/settings/settings.tsx`

- Update the i18n keys in `frontend/src/locales/en.json` for the new fields and the
  "Path cards" rename.
- Drop the encounter-specific `level` filter (lines 46-47).
- No structural changes to the Sortable component.

### Step 6 — Verification

- `npm run check -w frontend`
- `npm run build -w frontend`
- `npm run test -w shared` (if any sorting/grouping tests live there)
- Manual: open settings, toggle each new field, confirm grouping renders in player
  list and deck view; confirm a fresh profile picks up new defaults; confirm a
  pre-existing profile with stored `slot`/`level` entries hydrates cleanly.

## Open questions

1. **Approach grouping tiebreaker.** Some ER cards have ties across approach icons.
   What order should ties resolve in? (Suggested: `conflict > reason > exploration >
   connection`, but this is a domain call.)
2. **Rename `encounter` context key to `path`?** Cleaner, but touches more files
   (store keys, settings shape, possibly persisted state). Worth a follow-up but I'd
   keep it out of this change unless you want it bundled.
3. **Keep "All cards" (mixed) as a separate context** or fold it into Player + a
   "show path cards too" toggle? The current mixed context is barely differentiated.
4. **Equip sort direction.** Default ascending or descending? (Suggested: descending,
   because high-equip gear is what you usually want to spot.)
