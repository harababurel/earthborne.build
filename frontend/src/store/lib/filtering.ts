/**
 * Earthborne Rangers card filtering functions.
 *
 * Function signatures are kept compatible with the original AH version where
 * callers have not yet been updated (Phase 5). AH-specific implementations are
 * replaced with ER equivalents or stubs.
 */

import type { Card, SealedDeckResponse } from "@earthborne-build/shared";
import { official, splitMultiValue } from "@/utils/card-utils";
import { resolveLimitedPoolPacks } from "@/utils/environments";
import type { Filter } from "@/utils/fp";
import { and, or } from "@/utils/fp";
import { isEmpty } from "@/utils/is-empty";

// AttributeFilter was removed from shared; defined locally for fan-made content support.
type AttributeFilter = {
  attribute: string;
  value: string | number | null | undefined;
  operator?: "=" | "!=";
};

import type {
  ApproachIconsFilter,
  AspectRequirementFilter,
  AssetFilter,
  CostFilter,
  EquipFilter,
  InvestigatorSkillsFilter,
  LevelFilter,
  List,
  MultiselectFilter,
  PropertiesFilter,
  SkillIconsFilter,
  SubtypeFilter,
} from "../slices/lists.types";
import type { Metadata } from "../slices/metadata.types";
import type { Interpreter } from "./buildql/interpreter";
import { type CardOwnershipOptions, isCardOwned } from "./card-ownership";
import type { LookupTables } from "./lookup-tables.types";
import type { ResolvedDeck } from "./types";

/**
 * Misc. card identity filters
 */

// ER has no duplicate/hidden cards, so all cards pass.
export function filterDuplicates(_card: Card) {
  return true;
}

// ER has no alternate-art or parallel cards, so all cards pass.
export function filterAlternates(_card: Card) {
  return true;
}

// Non-player cards in ER are mapped to the "encounter" card type filter.
export function filterEncounterCards(card: Card) {
  return ![
    "gear",
    "attachment",
    "moment",
    "role",
    "aspect",
    "attribute",
  ].includes(card.type_code);
}

// ER has no Mythos faction. All cards pass.
export function filterMythosCards(_card: Card) {
  return true;
}

// ER has no separate back-side card entries. All cards pass.
export function filterBacksides(_card: Card) {
  return true;
}

export function filterOfficial(card: Card) {
  return official(card);
}

/**
 * Actions — ER has no action icon filter; stub returns undefined.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function filterActions(
  _filterState: MultiselectFilter,
): Filter | undefined {
  return undefined;
}

/**
 * Health / threshold props.
 * Repurposed for ER harm/progress thresholds and presence.
 */
export function filterHealthProp(
  value: [number, number],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _includeX: boolean,
  prop: string,
) {
  const [min, max] = value;
  return (card: Card) => {
    // biome-ignore lint/suspicious/noExplicitAny: dynamic property access
    const v = (card as any)[prop];
    if (v == null) return false;
    return v >= min && v <= max;
  };
}

/**
 * Asset filter — ER has no slot/uses/skill-boost filter. Always returns undefined.
 */
export function filterAssets(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _value: AssetFilter,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _lookupTables: LookupTables,
): Filter | undefined {
  return undefined;
}

/**
 * Attribute — generic filter, works for ER fan-made content.
 */
export function filterAttribute(attributeFilter: AttributeFilter) {
  const { attribute, value, operator } = attributeFilter;
  const op = operator ?? "=";

  return (card: Card) => {
    // biome-ignore lint/suspicious/noExplicitAny: dynamic property access
    const attr = (card as any)[attribute];

    switch (op) {
      case "=":
        return value == null ? attr == null : attr === value;
      case "!=":
        return value == null ? attr != null : attr !== value;
      default:
        return false;
    }
  };
}

/**
 * Card Pool — used for sealed/limited pool modes.
 */
export function filterCardPool(
  value: MultiselectFilter | undefined,
  metadata: Metadata,
  lookupTables: LookupTables,
) {
  if (isEmpty(value)) return undefined;

  const [cardEntries, rest] = partition(value, (key) =>
    key.startsWith("card:"),
  );

  const packFilter = filterPackCode(
    resolveLimitedPoolPacks(metadata, rest).map((p) => p.code),
    metadata,
    lookupTables,
  );

  if (isEmpty(cardEntries)) return packFilter;

  const codes = cardEntries.map((key) => key.replace("card:", ""));
  const ors: Filter[] = [];

  if (!isEmpty(codes)) {
    ors.push((card: Card) => codes.includes(card.code));
  }

  if (packFilter) ors.push(packFilter);

  return !isEmpty(ors) ? or(ors) : undefined;
}

function partition<T>(a: T[], predicate: (t: T) => boolean): [T[], T[]] {
  const truthy: T[] = [];
  const falsy: T[] = [];
  for (const item of a) {
    if (predicate(item)) truthy.push(item);
    else falsy.push(item);
  }
  return [truthy, falsy];
}

/**
 * Cost — uses ER energy_cost field.
 */
function filterEvenCost(card: Card) {
  return card.energy_cost != null && card.energy_cost % 2 === 0;
}

function filterOddCost(card: Card) {
  return card.energy_cost != null && card.energy_cost % 2 !== 0;
}

function filterCostRange(value: [number, number]) {
  const [min, max] = value;
  return (card: Card) => {
    if (card.energy_cost == null) return min <= -1;
    return card.energy_cost >= Math.max(min, 0) && card.energy_cost <= max;
  };
}

export function filterCost(filterState: CostFilter): Filter | undefined {
  const filters: Filter[] = [];

  if (filterState.range) filters.push(filterCostRange(filterState.range));
  if (filterState.even) filters.push(filterEvenCost);
  if (filterState.odd) filters.push(filterOddCost);
  // filterState.x: ER has no X-cost cards yet

  return filters.length ? and(filters) : undefined;
}

/**
 * Aspect requirement — upstream aspect_id + level.
 */
function filterAspectRequirementRange(value: [number, number]) {
  const [min, max] = value;
  return (card: Card) =>
    card.aspect_requirement_value != null &&
    card.aspect_requirement_value >= min &&
    card.aspect_requirement_value <= max;
}

export function filterAspectRequirement(
  filterState: AspectRequirementFilter,
): Filter | undefined {
  const filters: Filter[] = [];

  if (!isEmpty(filterState.aspects)) {
    filters.push(
      (card: Card) =>
        card.aspect_requirement_type != null &&
        filterState.aspects.includes(card.aspect_requirement_type),
    );
  }

  if (filterState.range) {
    filters.push(filterAspectRequirementRange(filterState.range));
  }

  return filters.length ? and(filters) : undefined;
}

/**
 * Equip — ER gear cards can have equip values.
 */
export function filterEquip(value: EquipFilter): Filter | undefined {
  if (!value) return undefined;
  const [min, max] = value;
  return (card: Card) =>
    card.equip_value != null &&
    card.equip_value >= min &&
    card.equip_value <= max;
}

/**
 * Approach icons — match cards with at least one selected approach icon.
 */
export function filterApproachIcons(
  filterState: ApproachIconsFilter,
): Filter | undefined {
  if (isEmpty(filterState)) return undefined;

  return (card: Card) =>
    filterState.some((approach) => {
      switch (approach) {
        case "conflict":
          return !!card.approach_conflict;
        case "reason":
          return !!card.approach_reason;
        case "exploration":
          return !!card.approach_exploration;
        case "connection":
          return !!card.approach_connection;
        default:
          return false;
      }
    });
}

/**
 * Cycle — ER has no cycles. Stub returns undefined.
 */
export function filterCycleCode(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _filterState: MultiselectFilter,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _metadata: Metadata,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _lookupTables: LookupTables,
): Filter | undefined {
  return undefined;
}

/**
 * Encounter set — uses ER set_code field.
 */
export function filterEncounterCode(
  filterState: MultiselectFilter,
): Filter | undefined {
  return filterSetCode(filterState);
}

/**
 * Faction / aspect — ER uses aspects, not factions.
 * Maps faction filter codes to ER aspect codes.
 */
export function filterFactions(factions: string[]): Filter | undefined {
  if (isEmpty(factions)) return undefined;

  return (card: Card) => {
    const aspect = card.aspect_requirement_type;
    if (!aspect) return false;
    return factions.some((f) => f === aspect);
  };
}

/**
 * Level / XP — ER has no XP system. Stub returns undefined.
 */
export function filterLevel(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _filterState: LevelFilter,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _interpreter?: Interpreter,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _ranger?: Card,
): Filter | undefined {
  return undefined;
}

/**
 * Ownership
 */
export function filterOwnership(options: CardOwnershipOptions) {
  return isCardOwned(options);
}

/**
 * Pack code.
 */
export function filterPackCode(
  value: MultiselectFilter,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _metadata: Metadata,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _lookupTables: LookupTables,
): Filter | undefined {
  if (isEmpty(value)) return undefined;
  if (!value.some((x) => x)) return undefined;

  return (card: Card) => value.includes(card.pack_code);
}

/**
 * Illustrator
 */
export function filterIllustrator(
  filterState: MultiselectFilter,
): Filter | undefined {
  const filters: Filter[] = filterState.map(
    (key) => (c: Card) => c.illustrator === key,
  );
  return or(filters);
}

/**
 * Properties — only `unique` is applicable in ER; others are AH-specific stubs.
 */
export function filterProperties(
  filterState: PropertiesFilter,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _lookupTables: LookupTables,
): Filter | undefined {
  const filters: Filter[] = [];

  if (filterState.unique) {
    filters.push((card: Card) => !!card.is_unique);
  }

  if (filterState.expert) {
    filters.push((card: Card) => !!card.is_expert);
  }

  for (const keyword of [
    "ambush",
    "conduit",
    "disconnected",
    "fatiguing",
    "friendly",
    "manifestation",
    "obstacle",
    "persistent",
    "setup",
  ] as const) {
    if (filterState[keyword]) {
      filters.push((card: Card) => card.keywords?.includes(keyword) ?? false);
    }
  }

  return filters.length ? and(filters) : undefined;
}

/**
 * Skill icons — ER has no skill icons. Stub returns undefined.
 */
export function filterSkillIcons(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _filterState: SkillIconsFilter,
): Filter | undefined {
  return undefined;
}

/**
 * Investigator skills — ER has no investigator skill stats. Stub returns undefined.
 */
export function filterInvestigatorSkills(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _filterState: InvestigatorSkillsFilter,
): Filter | undefined {
  return undefined;
}

/**
 * Subtypes — ER has no card subtypes. Stub returns undefined.
 */
export function filterSubtypes(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _filter: SubtypeFilter,
): Filter | undefined {
  return undefined;
}

/**
 * Traits — split on "." separator (same format as AH).
 */
export function filterTraits(
  filterState: MultiselectFilter,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _lookupTables: LookupTables,
): Filter | undefined {
  if (isEmpty(filterState)) return undefined;

  return (card: Card) => {
    if (!card.traits) return false;
    const traits = splitMultiValue(card.traits);
    return filterState.some((t) =>
      traits.some((ct) => ct.toLowerCase() === t.toLowerCase()),
    );
  };
}

/**
 * Type — filter by ER type_code.
 */
export function filterType(
  enabledTypeCodes: MultiselectFilter,
): Filter | undefined {
  if (isEmpty(enabledTypeCodes)) return undefined;

  return (card: Card) => enabledTypeCodes.includes(card.type_code);
}

/**
 * Set — filter by ER set_code.
 */
export function filterSetCode(
  enabledSetCodes: MultiselectFilter,
): Filter | undefined {
  if (isEmpty(enabledSetCodes)) return undefined;

  return (card: Card) =>
    card.set_code != null && enabledSetCodes.includes(card.set_code);
}

/**
 * Tag — ER uses keywords array instead of AH tag strings.
 * Checks card.keywords for the given keyword.
 */
export function filterTag(
  tag: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _checkUnselectedCustomizations: boolean,
) {
  return (card: Card) => card.keywords?.includes(tag as never) ?? false;
}

/**
 * Tag fallback — ER has no tag fallback concept; always returns false.
 */
export function filterTagFallback(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _tag: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _checkUnselectedCustomizations: boolean,
) {
  return (_card: Card) => false;
}

/**
 * Sealed deck
 */
export function filterSealed(
  sealedDeck: SealedDeckResponse["cards"],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _lookupTables: LookupTables,
) {
  return (c: Card) => !!sealedDeck[c.code];
}

/**
 * Ranger / investigator access filter.
 *
 * Returns a filter that shows only cards the ranger can include in their deck:
 *   - personality: accessible to all rangers
 *   - background: accessible if card.background_type matches config.background
 *   - specialty: accessible if card.specialty_type matches config.specialty
 *   - reward / malady: always accessible (campaign additions)
 *
 * When background/specialty are not configured (browsing without a specific
 * ranger), all ranger deck cards (category != null) are shown.
 */
export type InvestigatorAccessConfig = {
  background?: string | null;
  specialty?: string | null;
  showLimitedAccess?: boolean;
  // Legacy AH fields — kept for API compatibility with callers not yet updated.
  targetDeck?: "slots" | "extraSlots";
};

export function filterInvestigatorAccess(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _rangerCard: Card,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _interpreter?: Interpreter,
  config?: InvestigatorAccessConfig,
): Filter | undefined {
  const { background, specialty } = config ?? {};

  // When no background/specialty is set, show all ranger deck cards.
  if (!background || !specialty) {
    return (card: Card) => card.category != null;
  }

  return (card: Card) => {
    const { category } = card;

    if (!category) return false;
    if (category === "personality") return true;
    if (category === "reward" || category === "malady") return true;

    // For background/specialty cards, show both the chosen pool AND other
    // background/specialty cards (the ranger can include 1 outside interest).
    if (category === "background" || category === "specialty") return true;

    return false;
  };
}

/**
 * Weakness access — ER has no weaknesses. Returns a filter that always passes.
 */
export function filterInvestigatorWeaknessAccess(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _ranger: Card,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _config?: Pick<InvestigatorAccessConfig, "targetDeck">,
): Filter {
  return () => false;
}

/**
 * makeOptionFilter — ER has no deck options. Stub returns undefined.
 * Kept for API compatibility with limited-slots.ts.
 */
export function makeOptionFilter(
  _option: unknown,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _interpreter?: Interpreter,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _config?: InvestigatorAccessConfig,
): Filter | undefined {
  return undefined;
}

/**
 * Deduplication context filter.
 *
 * ER has no duplicate/reprint concept, so all cards in the filtered list
 * are kept as-is.
 */
export function filterDuplicatesFromContext(
  filteredCards: Card[],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _activeList: List,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _metadata: Metadata,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _lookupTables: LookupTables,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _deck: ResolvedDeck | undefined,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _collection: Record<string, boolean | number>,
): Filter | undefined {
  // No deduplication needed in ER — all cards in the list are canonical.
  if (!filteredCards.length) return undefined;
  return undefined;
}

/**
 * Contains card — checks if a card is in any slot of a resolved deck.
 */
export function containsCard(
  deck: ResolvedDeck | undefined,
  card: Card,
): boolean {
  if (!deck) return false;
  return deck.slots[card.code] != null || deck.role_code === card.code;
}
