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
  CostFilter,
  EquipFilter,
  List,
  MultiselectFilter,
  PropertiesFilter,
} from "../slices/lists.types";
import type { Metadata } from "../slices/metadata.types";
import type { Interpreter } from "./buildql/interpreter";
import { type CardOwnershipOptions, isCardOwned } from "./card-ownership";
import type { LookupTables } from "./lookup-tables.types";
import type { ResolvedDeck } from "./types";

/**
 * Misc. card identity filters
 */

// Non-ranger cards in ER are path/campaign cards.
export function filterPathCards(card: Card) {
  return ![
    "gear",
    "attachment",
    "moment",
    "role",
    "aspect",
    "attribute",
  ].includes(card.type_code);
}

export function filterOfficial(card: Card) {
  return official(card);
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
 * Properties — parsed from the opening property block of card text.
 */
export function filterProperties(
  filterState: PropertiesFilter,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _lookupTables: LookupTables,
): Filter | undefined {
  const filters: Filter[] = [];

  for (const [property, enabled] of Object.entries(filterState)) {
    if (!enabled) continue;

    if (property === "unique") {
      filters.push((card: Card) => !!card.is_unique);
    } else if (property === "expert") {
      filters.push((card: Card) => !!card.is_expert);
    } else {
      filters.push((card: Card) => card.keywords?.includes(property) ?? false);
    }
  }

  return filters.length ? and(filters) : undefined;
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
