# List sort & grouping settings — redesign plan

## Status

**Complete**, 2026-04-25.

All six steps implemented and verified (`npm run check -w frontend` passes clean).
Commits: `refactor(frontend): replace arkham sort/group types with ER-native ones`,
`refactor(frontend): rename ENCOUNTER_DEFAULTS to PATH_DEFAULTS`.

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
  `encounter_set` in the codebase was misleading.
- **Pack** — release axis; mostly useful in collection view. Note: "cycles" are an
  Arkham Horror concept with no ER equivalent and were not carried over.

## Design

### Field inventory (as implemented)

#### Player / Mixed lists

| Field         | Group | Sort | Notes                                                  |
|---------------|:-----:|:----:|--------------------------------------------------------|
| `name`        |       |  ✓   | Alpha.                                                 |
| `cost`        |   ✓   |  ✓   | `energy_cost`.                                         |
| `aspect`      |   ✓   |  ✓   | `energy_aspect`.                                       |
| `type`        |   ✓   |  ✓   | `type_code`.                                           |
| `category`    |   ✓   |  ✓   | Ranger deck category.                                  |
| `approach`    |   ✓   |  ✓   | Primary approach icon (highest of 4).                  |
| `equip`       |       |  ✓   | `equip_value`, gear-only; nulls last; descending.      |
| `pack`        |   ✓   |  ✓   |                                                        |
| `position`    |       |  ✓   | Set position within pack.                              |

Removed entirely from the unions: `slot`, `level`, `subtype`, `faction`,
`encounter_set`, `cycle` (AH-specific, no ER equivalent).

#### Path lists

Internal key is `path`; user-facing label is "Path cards". Internal constant is
`PATH_DEFAULTS`. Internal grouping constant is `PATH_GROUPING_TYPES`.

| Field         | Group | Sort | Notes                                |
|---------------|:-----:|:----:|--------------------------------------|
| `name`        |       |  ✓   |                                      |
| `type`        |   ✓   |  ✓   |                                      |
| `path_set`    |   ✓   |       | Renamed from `encounter_set`.        |
| `pack`        |   ✓   |  ✓   |                                      |
| `position`    |       |  ✓   |                                      |

#### Mixed list

Union of Player and Path field sets, deduped.

### New defaults

```ts
PLAYER_DEFAULTS   = { group: ["category", "type"],        sort: ["cost", "name"] }
PATH_DEFAULTS     = { group: ["pack", "path_set"],        sort: ["position"] }
ALL_DEFAULTS      = { group: ["pack", "path_set"],        sort: ["aspect", "name"] }
DECK_DEFAULTS     = { group: ["category", "type"],        sort: ["cost", "name"] }
DECK_SCANS_DEF.   = { group: ["category"],                sort: ["type", "name"] }
```

### Sorting presets

`SORTING_PRESETS` deleted (dead in the UI). `SortSelect` simplified to only expose
the "Default" option; presets can be reintroduced later on top of the new field set.

### Migration

Store version bumped to 12 for `0011-clean-list-sort-fields.ts`, which strips
unknown group/sort fields from all persisted list configs, rewrites
`encounter_set` → `path_set`, and falls back to the new defaults if a config is
left empty after stripping.

## Open questions (resolved)

1. **Approach grouping tiebreaker.** Resolved: `conflict > reason > exploration >
   connection`, matching `APPROACH_ORDER` in shared.
2. **Rename `encounter` context key to `path`?** Done.
3. **Keep "All cards" as a separate context?** Kept as-is for now, with the
   internal key renamed from `mixed` to `all`.
4. **Equip sort direction.** Descending (high-equip gear first).
