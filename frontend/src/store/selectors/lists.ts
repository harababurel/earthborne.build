import type { Card } from "@arkham-build/shared";
import {
  APPROACH_ORDER,
  ASPECT_ORDER,
  ASSET_SLOT_ORDER,
  SKILL_KEYS,
} from "@arkham-build/shared";
import { createSelector } from "reselect";
import {
  displayAttribute,
  official,
  splitMultiValue,
} from "@/utils/card-utils";
import { NO_SLOT_STRING } from "@/utils/constants";
import { resolveLimitedPoolPacks } from "@/utils/environments";
import {
  capitalize,
  displayPackName,
  formatTabooSet,
} from "@/utils/formatting";
import type { Filter } from "@/utils/fp";
import { and, not, or } from "@/utils/fp";
import i18n from "@/utils/i18n";
import { isEmpty } from "@/utils/is-empty";
import { time, timeEnd } from "@/utils/time";
import type { Interpreter } from "../lib/buildql/interpreter";
import { applyCardChanges } from "../lib/card-edits";
import { getAdditionalDeckOptions } from "../lib/deck-validation";
import {
  containsCard,
  filterActions,
  filterApproachIcons,
  filterAspectRequirement,
  filterAssets,
  filterBacksides,
  filterCardPool,
  filterCost,
  filterCycleCode,
  filterDuplicates,
  filterDuplicatesFromContext,
  filterEncounterCards,
  filterEncounterCode,
  filterEquip,
  filterFactions,
  filterHealthProp,
  filterIllustrator,
  filterInvestigatorAccess,
  filterInvestigatorSkills,
  filterInvestigatorWeaknessAccess,
  filterLevel,
  filterMythosCards,
  filterOfficial,
  filterOwnership,
  filterPackCode,
  filterProperties,
  filterSealed,
  filterSetCode,
  filterSkillIcons,
  filterSubtypes,
  filterTabooSet,
  filterTraits,
  filterType,
} from "../lib/filtering";
import { getGroupedCards } from "../lib/grouping";
import type { LookupTables } from "../lib/lookup-tables.types";
import { resolveCardWithRelations } from "../lib/resolve-card";
import { applySearch } from "../lib/searching";
import {
  makeSortFunction,
  sortByEncounterSet,
  sortByName,
} from "../lib/sorting";
import {
  type CardWithRelations,
  isResolvedDeck,
  type ResolvedDeck,
} from "../lib/types";
import type { Cycle } from "../schemas/cycle.schema";
import type { Pack } from "../schemas/pack.schema";
import type { StoreState } from "../slices";
import type {
  ApproachIconsFilter,
  AspectRequirementFilter,
  AssetFilter,
  CardTypeFilter,
  CostFilter,
  EquipFilter,
  FanMadeContentFilter,
  FilterMapping,
  HealthFilter,
  InvestigatorSkillsFilter,
  LevelFilter,
  List,
  MultiselectFilter,
  OwnershipFilter,
  PropertiesFilter,
  SanityFilter,
  SelectFilter,
  SkillIconsFilter,
  SubtypeFilter,
} from "../slices/lists.types";
import type { Metadata } from "../slices/metadata.types";
import {
  selectActiveList,
  selectBuildQlInterpreter,
  selectCollection,
  selectLocaleSortingCollator,
  selectLookupTables,
  selectMetadata,
  selectSettingsTabooId,
  selectTraitMapper,
} from "./shared";

export type CardGroup = {
  type: string;
  key: string;
};

export type ListState = {
  cards: Card[];
  groupCounts: number[];
  groups: CardGroup[];
  key: string;
  totalCardCount: number;
};

export type TargetDeck = "slots" | "extraSlots" | "both";

function makeUserFilter(
  metadata: Metadata,
  lookupTables: LookupTables,
  list: List,
  resolvedDeck: ResolvedDeck | undefined,
  targetDeck: TargetDeck | undefined,
  buildQlInterpreter: Interpreter,
) {
  const filters: Filter[] = [];

  if (!list.filtersEnabled) return and(filters);

  list.filters.forEach((_, id) => {
    const filterValue = list.filterValues[id];
    if (!filterValue) return;

    switch (filterValue.type) {
      case "action": {
        const value = filterValue.value as MultiselectFilter;
        if (value.length) {
          const filter = filterActions(value);
          if (filter) filters.push(filter);
        }
        break;
      }

      case "asset": {
        const value = filterValue.value as AssetFilter;
        const filter = filterAssets(value, lookupTables);
        if (filter) filters.push(filter);
        break;
      }

      case "approach_icons": {
        const value = filterValue.value as ApproachIconsFilter;
        if (value.length) {
          const filter = filterApproachIcons(value);
          if (filter) filters.push(filter);
        }
        break;
      }

      case "aspect_requirement": {
        const value = filterValue.value as AspectRequirementFilter;
        if (value.aspects.length || value.range) {
          const filter = filterAspectRequirement(value);
          if (filter) filters.push(filter);
        }
        break;
      }

      case "cost": {
        const value = filterValue.value as CostFilter;
        if (value.range || value.even || value.odd || value.x) {
          const filter = filterCost(value);
          if (filter) filters.push(filter);
        }
        break;
      }

      case "cycle": {
        const value = filterValue.value as MultiselectFilter;
        if (value.length) {
          const filter = filterCycleCode(value, metadata, lookupTables);
          if (filter) filters.push(filter);
        }
        break;
      }

      case "encounter_set": {
        const value = filterValue.value as MultiselectFilter;
        if (value.length) {
          const filter = filterEncounterCode(value);
          if (filter) filters.push(filter);
        }
        break;
      }

      case "equip": {
        const value = filterValue.value as EquipFilter;
        if (value) {
          const filter = filterEquip(value);
          if (filter) filters.push(filter);
        }
        break;
      }

      case "faction": {
        const value = filterValue.value as MultiselectFilter;
        if (value.length) {
          const filter = filterFactions(value);
          if (filter) filters.push(filter);
        }
        break;
      }

      case "investigator": {
        const value = filterValue.value as string | undefined;

        if (value) {
          const filter = [];
          const accessFilter = filterInvestigatorAccess(
            metadata.cards[value],
            buildQlInterpreter,
            {
              targetDeck: targetDeck === "both" ? undefined : targetDeck,
            },
          );
          const weaknessFilter = filterInvestigatorWeaknessAccess(
            metadata.cards[value],
            { targetDeck: targetDeck === "both" ? undefined : targetDeck },
          );

          if (accessFilter) filter.push(accessFilter);
          if (weaknessFilter) filter.push(weaknessFilter);

          filters.push(or(filter));
        }

        break;
      }

      case "level": {
        const value = filterValue.value as LevelFilter;

        if (value.range) {
          if (resolvedDeck) {
            const filter = filterLevel(
              value,
              buildQlInterpreter,
              resolvedDeck?.investigatorBack?.card,
            );
            if (filter) filters.push(filter);
          } else {
            const filterIndex = list.filters.indexOf("investigator");
            const filterValue = filterIndex
              ? list.filterValues[filterIndex]?.value
              : undefined;
            const investigator = filterValue
              ? metadata.cards[filterValue as string]
              : undefined;
            const filter = filterLevel(value, buildQlInterpreter, investigator);
            if (filter) filters.push(filter);
          }
        }

        break;
      }

      case "pack": {
        const value = filterValue.value as MultiselectFilter;
        if (value.length) {
          const filter = filterPackCode(value, metadata, lookupTables);
          if (filter) filters.push(filter);
        }
        break;
      }

      case "properties": {
        const value = filterValue.value as PropertiesFilter;
        const filter = filterProperties(value, lookupTables);
        if (filter) filters.push(filter);
        break;
      }

      case "skill_icons": {
        const value = filterValue.value as SkillIconsFilter;
        const filter = filterSkillIcons(value);
        if (filter) filters.push(filter);
        break;
      }

      case "taboo_set": {
        const value = filterValue.value as number | undefined;
        if (value != null) {
          const filter = filterTabooSet(value, metadata);
          if (filter) filters.push(filter);
        }
        break;
      }

      case "trait": {
        const value = filterValue.value as MultiselectFilter;
        if (value.length) {
          const filter = filterTraits(value, lookupTables);
          if (filter) filters.push(filter);
        }
        break;
      }

      case "set": {
        const value = filterValue.value as MultiselectFilter;
        if (value.length) {
          const filter = filterSetCode(value);
          if (filter) filters.push(filter);
        }
        break;
      }

      case "type": {
        const value = filterValue.value as MultiselectFilter;
        if (value.length) {
          const filter = filterType(value);
          if (filter) filters.push(filter);
        }
        break;
      }

      case "health":
      case "sanity": {
        const value = filterValue.value as [number, number] | undefined;
        if (value) {
          filters.push(filterHealthProp(value, false, filterValue.type));
        }
        break;
      }

      case "investigator_skills": {
        const value = filterValue.value as InvestigatorSkillsFilter;
        const filter = filterInvestigatorSkills(value);
        if (filter) filters.push(filter);
        break;
      }

      case "investigator_card_access": {
        const value = filterValue.value as MultiselectFilter;
        if (value.length) {
          const filter = (card: Card) => {
            if (card.type_code !== "role") return false;

            const innerFilter = filterInvestigatorAccess(
              card,
              buildQlInterpreter,
            );

            if (!innerFilter) return false;
            return value.every((code) => innerFilter(metadata.cards[code]));
          };

          filters.push(filter);
        }
        break;
      }

      case "illustrator": {
        const value = filterValue.value as MultiselectFilter;
        if (value.length) {
          const filter = filterIllustrator(value);
          if (filter) filters.push(filter);
        }

        break;
      }

      case "subtype": {
        const value = filterValue.value as SubtypeFilter;
        if (value) {
          const filter = filterSubtypes(value);
          if (filter) filters.push(filter);
        }
        break;
      }

      // These filters are handled in the "system" filter of the list since they should
      // be reflected in the choices available to the user.
      // For instance, it does not make sense to show weakness or non-collection card traits
      // as options in the trait filter.
      // TODO: At some point, we might want to refactor the store data structure to reflect this.
      case "fan_made_content":
      case "card_type":
      case "ownership": {
        break;
      }
    }
  });

  return filters.length ? and(filters) : undefined;
}

export const selectActiveListFilters = (state: StoreState) => {
  const active = selectActiveList(state);
  return active ? active.filters : [];
};

export const selectActiveListFilter = createSelector(
  selectActiveList,
  (_: StoreState, id: number) => id,
  (list, id) => {
    return list ? list.filterValues[id] : undefined;
  },
);

export function selectCanonicalTabooSetId(
  state: StoreState,
  resolvedDeck: ResolvedDeck | undefined,
) {
  if (resolvedDeck) return resolvedDeck.taboo_id;

  const filters = selectActiveListFilters(state);
  const filterId = filters.indexOf("taboo_set");

  const filterValue = filterId
    ? selectActiveListFilter(state, filterId)
    : undefined;

  if (typeof filterValue?.value === "number") return filterValue.value;

  return selectSettingsTabooId(state.settings, selectMetadata(state));
}

// Custom equality check for deck's card access.
// Deck access is only affected by a few subset of deck changes:
// 1. The deck changes.
// 2. The taboo that the deck uses changes.
// 3. An investigator side changes.
// 4. Cards that change deckbuilding rules (i.e. On Your Own, Versatile...) are added or removed.
// 5. Customizations change, some options change card properties.
// 6. Investigator option selections change.
// 7. Deck card pool changes.
// 8. Sealed deck changes.
// 9. Stored deck has changed.
// 10. BuildQL deck option overrides
const deckAccessEqual = (
  a: ResolvedDeck | undefined,
  b: ResolvedDeck | undefined,
) => {
  if (isResolvedDeck(a) && isResolvedDeck(b)) {
    return (
      a.id === b.id && // 1
      a.taboo_id === b.taboo_id && // 2
      a.investigatorFront.card.code === b.investigatorFront.card.code && // 3
      a.investigatorBack.card.code === b.investigatorBack.card.code && // 3
      JSON.stringify(getAdditionalDeckOptions(a)) ===
        JSON.stringify(getAdditionalDeckOptions(b)) && // 4
      JSON.stringify(a.customizations) === JSON.stringify(b.customizations) && // 5
      JSON.stringify(a.selections) === JSON.stringify(b.selections) && // 6
      JSON.stringify(a.cardPool) === JSON.stringify(b.cardPool) && // 7
      a.sealedDeck === b.sealedDeck && // 8
      a.date_update === b.date_update && // 9
      a.metaParsed.buildql_deck_options_override ===
        b.metaParsed.buildql_deck_options_override // 10
    );
  }

  // biome-ignore lint/suspicious/noDoubleEquals: we want a shallow equality check in this context.
  return a == b;
};

const selectDeckCachedByCardAccess = createSelector(
  (_: StoreState, resolvedDeck: ResolvedDeck | undefined) => resolvedDeck,
  (resolvedDeck) => resolvedDeck,
  {
    memoizeOptions: {
      resultEqualityCheck: deckAccessEqual,
    },
  },
);

const selectDeckInvestigatorFilter = createSelector(
  selectMetadata,
  selectLookupTables,
  selectDeckCachedByCardAccess,
  selectBuildQlInterpreter,
  (state: StoreState) => state.settings,
  (
    _: StoreState,
    __: ResolvedDeck | undefined,
    targetDeck: TargetDeck | undefined,
  ) => targetDeck ?? "slots",
  (state: StoreState) => state.ui.showUnusableCards,
  (state: StoreState) => state.ui.showLimitedAccess,
  (
    metadata,
    lookupTables,
    resolvedDeck,
    buildQlInterpreter,
    _settings,
    targetDeck,
    showUnusableCards,
    showLimitedAccess,
  ) => {
    if (!resolvedDeck) return undefined;

    const investigatorBack = resolvedDeck.investigatorBack.card;
    if (!investigatorBack) return undefined;

    if (showUnusableCards) {
      return and([
        filterMythosCards,
        (card: Card) => !lookupTables.relations.bonded[card.code],
      ]);
    }

    const ors = [];

    const investigatorFilter = filterInvestigatorAccess(
      investigatorBack,
      buildQlInterpreter,
      {
        targetDeck: targetDeck === "both" ? undefined : targetDeck,
        showLimitedAccess,
      },
    );

    const weaknessFilter = filterInvestigatorWeaknessAccess(investigatorBack, {
      targetDeck: targetDeck === "both" ? undefined : targetDeck,
    });

    if (investigatorFilter) ors.push(investigatorFilter);
    if (weaknessFilter) ors.push(weaknessFilter);

    const investigatorAccessFilter = or(ors);

    const ands = [investigatorAccessFilter];

    const cardPool = resolvedDeck.cardPool;
    const sealedDeck = resolvedDeck.sealedDeck?.cards;

    if (!cardPool?.length && !sealedDeck) {
      return and(ands);
    }

    const cardInDeckFilter = (card: Card) => containsCard(resolvedDeck, card);

    // ER has no XP/restrictions/encounter_code concept — cards in the pool
    // are either accessible or not; no bypass needed.
    const xpNullPoolFilter = (_card: Card) => false;

    if (cardPool?.length) {
      const cardPoolFilter = filterCardPool(cardPool, metadata, lookupTables);

      if (cardPoolFilter) {
        ands.push(or([cardPoolFilter, xpNullPoolFilter, cardInDeckFilter]));
      }
    }

    if (sealedDeck) {
      ands.push(
        or([
          filterSealed(sealedDeck, lookupTables),
          xpNullPoolFilter,
          cardInDeckFilter,
        ]),
      );
    }

    return and(ands);
  },
);

const customizationsEqual = (
  a: ResolvedDeck | undefined,
  b: ResolvedDeck | undefined,
) => {
  return isResolvedDeck(a) && isResolvedDeck(b)
    ? JSON.stringify(a.customizations) === JSON.stringify(b.customizations)
    : // biome-ignore lint/suspicious/noDoubleEquals: we want a shallow equality check in this context.
      a == b;
};

const selectDeckCachedByCustomizations = createSelector(
  (_: StoreState, resolvedDeck: ResolvedDeck | undefined) => resolvedDeck,
  (resolvedDeck) => resolvedDeck,
  {
    memoizeOptions: {
      resultEqualityCheck: customizationsEqual,
    },
  },
);

const selectDeckCustomizations = createSelector(
  selectDeckCachedByCustomizations,
  (resolvedDeck) => resolvedDeck?.customizations,
);

const fanMadeDataEqual = (
  a: ResolvedDeck | undefined,
  b: ResolvedDeck | undefined,
) => {
  return isResolvedDeck(a) && isResolvedDeck(b)
    ? JSON.stringify(a.fanMadeData) === JSON.stringify(b.fanMadeData)
    : // biome-ignore lint/suspicious/noDoubleEquals: we want a shallow equality check in this context.
      a == b;
};

const selectDeckCachedByFanMadeData = createSelector(
  (_: StoreState, resolvedDeck: ResolvedDeck | undefined) => resolvedDeck,
  (resolvedDeck) => resolvedDeck,
  {
    memoizeOptions: {
      resultEqualityCheck: fanMadeDataEqual,
    },
  },
);

const selectDeckFanMadeData = createSelector(
  selectDeckCachedByFanMadeData,
  (resolvedDeck) => resolvedDeck?.fanMadeData,
);

const selectBaseListCards = createSelector(
  selectMetadata,
  selectLookupTables,
  (state: StoreState) => state.fanMadeData.projects,
  (state: StoreState) => selectActiveList(state)?.systemFilter,
  (state: StoreState) => selectActiveList(state)?.filterValues,
  (state: StoreState) => selectActiveList(state)?.fanMadeCycleCodes,
  selectDeckInvestigatorFilter,
  selectCanonicalTabooSetId,
  selectDeckCustomizations,
  selectDeckFanMadeData,
  selectCollection,
  (
    metadata,
    lookupTables,
    fanMadeProjects,
    systemFilter,
    filterValues,
    fanMadeCycleCodes,
    deckInvestigatorFilter,
    tabooSetId,
    customizations,
    fanMadeData,
    collection,
  ) => {
    if (isEmpty(metadata.cards)) {
      console.warn("player cards selected before store is initialized.");
      return undefined;
    }

    time("select_base_list_cards");

    let filteredCards = Object.values(metadata.cards);

    // filters can be impacted by card changes, apply them now.
    if (tabooSetId || customizations) {
      filteredCards = filteredCards.map((c) =>
        applyCardChanges(c, metadata, tabooSetId, customizations),
      );
    }

    let filters = [];

    if (systemFilter) filters.push(systemFilter);

    // Filter fan made data that is not owned and does not belong to this specific deck.
    // In ER, non-official cards have a pack_code starting with "fan_".
    filters.push((card: Card) => {
      if (!card.pack_code?.startsWith("fan_")) return true;

      const pack = metadata.packs[card.pack_code];
      if (!pack?.cycle_code) return false;

      return Boolean(
        fanMadeData?.cards?.[card.code] ||
          fanMadeProjects?.[pack.cycle_code] ||
          fanMadeCycleCodes?.includes(pack.cycle_code),
      );
    });

    if (deckInvestigatorFilter) {
      filters.push(deckInvestigatorFilter);
    }

    if (filterValues) {
      const cardTypeFilter = Object.values(filterValues).find(
        (f) => f.type === "card_type",
      );

      if (cardTypeFilter) {
        const value = cardTypeFilter.value as CardTypeFilter;

        if (value === "player") {
          filters.push(not(filterEncounterCards));
        } else if (value === "encounter") {
          filters.push(filterEncounterCards);
        }
      }
    }

    filteredCards = filteredCards.filter(and(filters));
    const totalCardCount = filteredCards.length;

    filters = [];

    if (filterValues) {
      const ownershipFilter = Object.values(filterValues).find(
        (f) => f.type === "ownership",
      );

      if (ownershipFilter) {
        const value = ownershipFilter.value as OwnershipFilter;

        if (value !== "all") {
          filters.push((card: Card) => {
            const ownership = filterOwnership({
              card,
              metadata,
              lookupTables,
              collection,
              showAllCards: false,
            });

            return value === "owned" ? ownership : !ownership;
          });
        }
      }

      const fanMadeContentFilter = Object.values(filterValues).find(
        (f) => f.type === "fan_made_content",
      );

      if (fanMadeContentFilter) {
        const value = fanMadeContentFilter.value as FanMadeContentFilter;

        if (value === "official") {
          filters.push(filterOfficial);
        } else if (value === "fan-made") {
          filters.push(not(filterOfficial));
        }
      }
    }

    if (filters.length) {
      filteredCards = filteredCards.filter(and(filters));
    }

    timeEnd("select_base_list_cards");
    return { filteredCards, totalCardCount };
  },
);

export const selectListCards = createSelector(
  selectMetadata,
  selectLookupTables,
  selectActiveList,
  selectBaseListCards,
  selectLocaleSortingCollator,
  selectBuildQlInterpreter,
  (_: StoreState, resolvedDeck: ResolvedDeck | undefined) => resolvedDeck,
  (
    _: StoreState,
    __: ResolvedDeck | undefined,
    targetDeck: TargetDeck | undefined,
  ) => targetDeck,
  (state: StoreState) => state.ui.showUnusableCards,
  (state: StoreState) => state.settings.collection,
  (
    metadata,
    lookupTables,
    activeList,
    baseFilterResult,
    sortingCollator,
    buildQlInterpreter,
    deck,
    targetDeck,
    showUnusableCards,
    collection,
  ) => {
    if (!baseFilterResult || !activeList) return undefined;

    time("select_list_cards");
    let filteredCards = baseFilterResult.filteredCards;
    let totalCardCount = baseFilterResult.totalCardCount;

    // filter duplicates, taking into account the deck and list context.
    const currentTotal = filteredCards.length;

    if (!showUnusableCards) {
      const deduplicateFilter = filterDuplicatesFromContext(
        filteredCards,
        activeList,
        metadata,
        lookupTables,
        deck,
        collection,
      );

      if (deduplicateFilter) {
        filteredCards = filteredCards.filter(deduplicateFilter);
        totalCardCount -= currentTotal - filteredCards.length;
      }
    }

    // apply search after initial filtering to cut down on search operations.
    const search = activeList.search;

    if (search.value) {
      if (search.mode === "buildql") {
        if (search.buildQlSearch) {
          try {
            filteredCards = filteredCards.filter(search.buildQlSearch);
          } catch {}
        }
      } else {
        filteredCards = applySearch(activeList.search, filteredCards, metadata);
      }
    }

    // apply user filters.
    const userFilter = makeUserFilter(
      metadata,
      lookupTables,
      activeList,
      deck,
      targetDeck,
      buildQlInterpreter,
    );

    if (userFilter) {
      filteredCards = filteredCards.filter((card) => userFilter(card));
    }

    const cards: Card[] = [];
    const groups: CardGroup[] = [];
    const groupCounts: number[] = [];

    const groupedCards = getGroupedCards(
      activeList.display.grouping,
      filteredCards,
      makeSortFunction(activeList.display.sorting, metadata, sortingCollator),
      metadata,
      sortingCollator,
    );

    for (const group of groupedCards.data) {
      cards.push(...group.cards);

      groups.push({
        key: group.key,
        type: group.type,
      });

      groupCounts.push(group.cards.length);
    }

    timeEnd("select_list_cards");

    return {
      key: activeList.key,
      groups,
      cards,
      groupCounts,
      totalCardCount,
    } as ListState;
  },
);

export const selectCardRelationsResolver = createSelector(
  selectMetadata,
  selectLookupTables,
  selectLocaleSortingCollator,
  (metadata, lookupTables, collator) => {
    return (code: string) => {
      // for the current use case (investigator signatures), customizations and taboo are irrelevant.
      return resolveCardWithRelations(
        { metadata, lookupTables },
        collator,
        code,
        undefined,
        undefined,
        true,
      );
    };
  },
);

export const selectListFilterProperties = createSelector(
  selectMetadata,
  selectLookupTables,
  selectBaseListCards,
  (_metadata, lookupTables, baseFilterResult) => {
    time("select_card_list_properties");

    const actionTable = lookupTables.actions;

    const aspectRequirement = { min: Number.MAX_SAFE_INTEGER, max: 0 };
    const cost = { min: Number.MAX_SAFE_INTEGER, max: 0 };
    const equip = { min: Number.MAX_SAFE_INTEGER, max: 0 };
    const health = { min: Number.MAX_SAFE_INTEGER, max: 0 };
    const sanity = { min: Number.MAX_SAFE_INTEGER, max: 0 };

    const skills = SKILL_KEYS.reduce(
      (acc, key) => {
        acc[key] = { min: Number.MAX_SAFE_INTEGER, max: 0 };
        return acc;
      },
      {} as Record<string, { min: number; max: number }>,
    );

    const actions = new Set<string>();
    const approachIcons = new Set<string>();
    const aspectRequirements = new Set<string>();
    const cardTypes = new Set<string>();
    const encounterSets = new Set<string>();
    const factions = new Set<string>();
    const illustrators = new Set<string>();
    const investigators = new Set<string>();
    const levels = new Set<number | null>();
    const packs = new Set<string>();
    const sets = new Set<string>();
    const traits = new Set<string>();
    const types = new Set<string>();

    if (baseFilterResult?.filteredCards) {
      for (const card of baseFilterResult.filteredCards) {
        if (card.type_code === "role") {
          investigators.add(card.code);
        }

        // ER has no encounter cards, all cards are player cards.
        cardTypes.add("player");

        levels.add(null);
        types.add(card.type_code);

        packs.add(card.pack_code);

        if (card.set_code) {
          sets.add(card.set_code);
        }

        if (card.energy_aspect) {
          factions.add(card.energy_aspect);
        }

        if (card.aspect_requirement_type) {
          factions.add(card.aspect_requirement_type);
          aspectRequirements.add(card.aspect_requirement_type);
        }

        if (card.aspect_requirement_value != null) {
          aspectRequirement.min = Math.min(
            aspectRequirement.min,
            Math.max(card.aspect_requirement_value, 0),
          );
          aspectRequirement.max = Math.max(
            aspectRequirement.max,
            Math.max(card.aspect_requirement_value, 0),
          );
        }

        if (card.illustrator) {
          illustrators.add(card.illustrator);
        }

        if (card.energy_cost != null) {
          cost.min = Math.min(cost.min, Math.max(card.energy_cost, 0));
          cost.max = Math.max(cost.max, Math.max(card.energy_cost, 0));
        }

        if (card.equip_value != null) {
          equip.min = Math.min(equip.min, Math.max(card.equip_value, 0));
          equip.max = Math.max(equip.max, Math.max(card.equip_value, 0));
        }

        if (card.approach_conflict) approachIcons.add("conflict");
        if (card.approach_reason) approachIcons.add("reason");
        if (card.approach_exploration) approachIcons.add("exploration");
        if (card.approach_connection) approachIcons.add("connection");

        if (typeof card.harm_threshold === "number") {
          health.min = Math.min(health.min, Math.max(card.harm_threshold, 0));
          health.max = Math.max(health.max, card.harm_threshold);
        }

        for (const trait of splitMultiValue(card.traits)) {
          traits.add(trait);
        }
      }

      for (const [key, table] of Object.entries(actionTable)) {
        for (const card of baseFilterResult.filteredCards) {
          if (actions.has(key)) {
            break;
          }

          if (table[card.code]) {
            actions.add(key);
          }
        }
      }
    }

    timeEnd("select_card_list_properties");

    return {
      actions,
      approachIcons,
      aspectRequirement:
        aspectRequirement.min === Number.MAX_SAFE_INTEGER
          ? { min: 0, max: 0 }
          : aspectRequirement,
      aspectRequirements,
      cardTypes,
      cost,
      encounterSets,
      equip: equip.min === Number.MAX_SAFE_INTEGER ? { min: 0, max: 0 } : equip,
      factions,
      health,
      illustrators,
      investigators,
      levels,
      packs,
      sets,
      sanity,
      skills,
      traits,
      types,
    };
  },
);

/**
 * Actions
 */

export const selectActionMapper = createSelector(
  selectLocaleSortingCollator,
  (_) => {
    return (code: string) => ({ code, name: i18n.t(`common.actions.${code}`) });
  },
);

export const selectActionOptions = createSelector(
  selectListFilterProperties,
  selectLocaleSortingCollator,
  selectActionMapper,
  ({ actions }, collator, mapper) => {
    return Array.from(actions)
      .map(mapper)
      .sort((a, b) => collator.compare(a.name, b.name));
  },
);

/**
 * Approach Icons
 */

export const selectApproachIconMapper = createSelector(
  selectLocaleSortingCollator,
  (_) => {
    return (code: string) => ({
      code,
      name: i18n.t(`common.skill.${code}`),
    });
  },
);

export const selectApproachIconOptions = createSelector(
  selectListFilterProperties,
  selectApproachIconMapper,
  ({ approachIcons }, mapper) => {
    return APPROACH_ORDER.filter((code) => approachIcons.has(code)).map(mapper);
  },
);

/**
 * Aspect Requirement
 */

export const selectAspectRequirementMapper = createSelector(
  selectMetadata,
  (metadata) => {
    return (code: string) => {
      return (
        metadata.factions[code] ?? {
          code,
          name: i18n.t(`common.factions.${code.toLowerCase()}`),
        }
      );
    };
  },
);

export const selectAspectRequirementOptions = createSelector(
  selectListFilterProperties,
  ({ aspectRequirements }) => {
    return ASPECT_ORDER.filter((code) => aspectRequirements.has(code)).map(
      (code) => ({
        code,
        name: i18n.t(`common.factions.${code.toLowerCase()}`),
      }),
    );
  },
);

export const selectAspectRequirementMinMax = createSelector(
  selectListFilterProperties,
  ({ aspectRequirement }) => aspectRequirement,
);

/**
 * Asset
 */

export const selectUsesMapper = createSelector(
  selectLocaleSortingCollator,
  (_) => {
    return (code: string) => {
      const displayStr = i18n.exists(`common.uses.${code}`)
        ? i18n.t(`common.uses.${code}`)
        : capitalize(code);
      return { code, name: displayStr };
    };
  },
);

export const selectSlotsMapper = createSelector(
  selectLocaleSortingCollator,
  (_) => {
    return (code: string) => {
      const displayStr =
        code === NO_SLOT_STRING
          ? i18n.t("common.slot.none")
          : i18n.t(`common.slot.${code.toLowerCase()}`);
      return { code, name: displayStr };
    };
  },
);

export const selectAssetOptions = createSelector(
  selectLookupTables,
  selectLocaleSortingCollator,
  selectListFilterProperties,
  (lookupTables, collator, filterProps) => {
    const uses = Object.keys(lookupTables.uses)
      .map((code) => ({
        code,
        name: i18n.exists(`common.uses.${code}`)
          ? i18n.t(`common.uses.${code}`)
          : capitalize(code),
      }))
      .sort((a, b) => collator.compare(a.name, b.name));

    const skillBoosts = SKILL_KEYS.filter((x) => x !== "wild");

    uses.sort();

    return {
      health: filterProps.health,
      sanity: filterProps.sanity,
      uses,
      slots: [
        { code: NO_SLOT_STRING, name: i18n.t("common.slot.none") },
        ...ASSET_SLOT_ORDER.map((code) => ({
          code,
          name: i18n.t(`common.slot.${code.toLowerCase()}`),
        })),
      ],
      skillBoosts,
    };
  },
);

/**
 * Cost
 */

export function costToString(cost: number) {
  if (cost === -1) return i18n.t("filters.cost.nocost");
  return cost.toString();
}

export const selectCostMinMax = createSelector(
  selectListFilterProperties,
  ({ cost }) => cost,
);

/**
 * Equip
 */

export const selectEquipMinMax = createSelector(
  selectListFilterProperties,
  ({ equip }) => equip,
);

/**
 * Encounter Set
 */
function sortedEncounterSets(metadata: Metadata, collator: Intl.Collator) {
  const encounterSets = Object.values(metadata.encounterSets);

  const byEncounterSet = sortByEncounterSet(metadata, collator);
  encounterSets.sort((a, b) => byEncounterSet(a.pack_code, b.pack_code));

  return encounterSets;
}

export const selectEncounterSetMapper = createSelector(
  selectMetadata,
  (metadata) => {
    return (code: string) => metadata.encounterSets[code];
  },
);

export const selectEncounterSetOptions = createSelector(
  selectMetadata,
  selectLocaleSortingCollator,
  selectListFilterProperties,
  (metadata, collator, listFilterProperties) =>
    sortedEncounterSets(metadata, collator).filter((set) =>
      listFilterProperties.encounterSets.has(set.code),
    ),
);

/**
 * Factions
 */

export const selectFactionOptions = createSelector(
  selectListFilterProperties,
  selectMetadata,
  ({ factions }, metadata) => {
    return Object.values(metadata.factions)
      .filter((f) => factions.has(f.code))
      .sort(
        (a, b) =>
          ASPECT_ORDER.indexOf(a.code as (typeof ASPECT_ORDER)[number]) -
          ASPECT_ORDER.indexOf(b.code as (typeof ASPECT_ORDER)[number]),
      );
  },
);

/**
 * Health
 */

export const selectHealthMinMax = createSelector(
  selectListFilterProperties,
  ({ health }) => health,
);

/**
 * Illustrator
 */

export const selectIllustratorOptions = createSelector(
  selectListFilterProperties,
  selectLocaleSortingCollator,
  (properties, collator) => {
    return Array.from(properties.illustrators)
      .map((code) => ({ code }))
      .sort((a, b) => collator.compare(a.code, b.code));
  },
);

/**
 * Investigator
 */

export const selectInvestigatorOptions = createSelector(
  selectListFilterProperties,
  selectMetadata,
  selectLocaleSortingCollator,
  (listFilterProperties, metadata, collator) => {
    const investigators = Array.from(listFilterProperties.investigators).reduce<
      Card[]
    >((acc, code) => {
      const card = metadata.cards[code];

      if (card) {
        acc.push(card);
      }

      return acc;
    }, []);

    investigators.sort(sortByName(collator));

    return [
      { label: i18n.t("filters.investigator.any_investigator"), value: "" },
      ...investigators.map((card) => ({
        label: displayAttribute(card, "name"),
        value: card.code,
      })),
    ];
  },
);

/**
 * Investigator Card Access
 */

// FIXME: consider how to handle fan-made content here
export const selectCardOptions = createSelector(
  selectMetadata,
  selectLocaleSortingCollator,
  (metadata, collator) => {
    const sortFn = makeSortFunction(["name", "level"], metadata, collator);

    return Object.values(metadata.cards)
      .filter((card) => {
        return (
          !filterEncounterCards(card) &&
          filterMythosCards(card) &&
          filterDuplicates(card) &&
          filterBacksides(card) &&
          card.type_code !== "role"
        );
      })
      .sort(sortFn);
  },
);

/**
 * Investigator Skill Icons
 */

export const selectSkillIconsMinMax = createSelector(
  selectListFilterProperties,
  ({ skills }) => skills,
);

/**
 * Level
 */

export function levelToString(value: number) {
  if (value === -1) return i18n.t("filters.level.no_level");
  return value.toString();
}

/**
 * Packs
 */

export type CycleWithPacks = Cycle & {
  packs: Pack[];
  reprintPacks: Pack[];
};

export const selectCyclesAndPacks = createSelector(
  selectMetadata,
  selectLookupTables,
  (state: StoreState) => state.settings,
  (state: StoreState) => state.fanMadeData.projects,
  (metadata, lookupTables, _settings, fanMadeProjects) => {
    const cycles = Object.entries(lookupTables.packsByCycle).reduce(
      (acc, [cycleCode, packTable]) => {
        const cycle = metadata.cycles[cycleCode];

        // filter cycles that are only present in fan-made content cache
        if (cycle.official === false && !fanMadeProjects?.[cycle.code]) {
          return acc;
        }

        const packs: Pack[] = [];
        const reprintPacks: Pack[] = [];

        for (const code of Object.keys(packTable)) {
          const pack = metadata.packs[code];
          (pack.reprint ? reprintPacks : packs).push(pack);
        }

        reprintPacks.sort((a, b) => a.position - b.position);
        packs.sort((a, b) => a.position - b.position);

        const canShowCycle = packs.some(
          (pack) =>
            !pack.date_release || new Date(pack.date_release) <= new Date(),
        );

        if (canShowCycle) {
          acc.push({ ...cycle, packs, reprintPacks });
        }

        return acc;
      },
      [] as CycleWithPacks[],
    );

    cycles.sort((a, b) => a.position - b.position);

    return cycles;
  },
);

export const selectCampaignCycles = createSelector(
  selectCyclesAndPacks,
  (cycles) => cycles.filter((cycle) => official(cycle)),
);

export const selectCycleMapper = createSelector(selectMetadata, (metadata) => {
  return (code: string) => metadata.cycles[code];
});

export const selectCycleOptions = createSelector(
  selectCyclesAndPacks,
  (cycles) => cycles,
);

const selectCycleChanges = createSelector(
  selectMetadata,
  (_: StoreState, value: MultiselectFilter) => value,
  (metadata, value) => {
    return value
      .map((id) => displayPackName(metadata.cycles[id]))
      .join(` ${i18n.t("filters.or")} `);
  },
);

export const selectPackMapper = createSelector(selectMetadata, (metadata) => {
  return (code: string) => metadata.packs[code];
});

export const selectPackOptions = createSelector(
  selectListFilterProperties,
  selectCyclesAndPacks,
  (listFilterProperties, cycles) => {
    return cycles.reduce((acc, cycle) => {
      if (cycle.reprintPacks.length && cycle.code !== "core") {
        acc.push(
          ...cycle.reprintPacks.filter((p) =>
            listFilterProperties.packs.has(p.code),
          ),
        );
      } else if (
        official(cycle) &&
        cycle.packs.length === 2 &&
        cycle.position <= 11
      ) {
        acc.push(
          ...cycle.packs.filter((p) => listFilterProperties.packs.has(p.code)),
        );
      } else {
        acc.push(
          ...[...cycle.packs, ...cycle.reprintPacks].filter((p) =>
            listFilterProperties.packs.has(p.code),
          ),
        );
      }

      return acc;
    }, [] as Pack[]);
  },
);

function newFormatPlayerPack(pack: Pack) {
  return pack.code.endsWith("p");
}

export const selectLimitedPoolPackOptions = createSelector(
  selectCyclesAndPacks,
  (state: StoreState) => state.fanMadeData.projects,
  (_: StoreState, filter?: (cycle: Cycle) => boolean) => filter,
  (cycles, fanMadeProjects, filter) => {
    return cycles.flatMap((cycle) => {
      if (filter && !filter(cycle)) {
        return [];
      }

      // Fan-made content
      if (!official(cycle)) {
        if (!fanMadeProjects?.[cycle.code]) return [];
        return cycle.packs;
      }

      // Non-deckbuilding
      if (
        cycle.code === "parallel" ||
        cycle.code === "promotional" ||
        cycle.code === "side_stories"
      ) {
        return [];
      }

      // Core set
      if (cycle.code === "core") {
        return [...cycle.reprintPacks, ...cycle.packs];
      }

      // Reprinted new format
      if (cycle.reprintPacks.length) {
        return cycle.reprintPacks.filter(newFormatPlayerPack);
      }

      // New format
      if (cycle.packs.length === 2 && cycle.position <= 11) {
        return cycle.packs.filter(newFormatPlayerPack);
      }

      return cycle.packs;
    });
  },
);

export const selectLimitedPoolPacks = createSelector(
  selectMetadata,
  (_: StoreState, pool: string[] | undefined) => pool,
  (metadata, pool) => resolveLimitedPoolPacks(metadata, pool),
);

/**
 * Properties
 */

export const selectPropertyOptions = createSelector(
  selectActiveList,
  selectLocaleSortingCollator, // HACK: trigger re-evaluation on locale change
  (list) => {
    if (!list) return [];
    const t = i18n.t;
    return [
      { key: "ambush", label: t("common.keywords.ambush") },
      { key: "conduit", label: t("common.keywords.conduit") },
      { key: "disconnected", label: t("common.keywords.disconnected") },
      { key: "expert", label: t("common.expert") },
      { key: "fatiguing", label: t("common.keywords.fatiguing") },
      { key: "friendly", label: t("common.keywords.friendly") },
      { key: "manifestation", label: t("common.keywords.manifestation") },
      { key: "obstacle", label: t("common.keywords.obstacle") },
      { key: "persistent", label: t("common.keywords.persistent") },
      { key: "setup", label: t("common.keywords.setup") },
      { key: "unique", label: t("common.unique") },
    ].filter((p) => list.display.properties?.includes(p.key));
  },
);

/**
 * Sanity
 */

export const selectSanityMinMax = createSelector(
  selectListFilterProperties,
  ({ sanity }) => sanity,
);

/**
 * Search
 */

export const selectActiveListSearch = createSelector(
  selectActiveList,
  (list) => list?.search,
);

export const selectResolvedCardById = createSelector(
  selectMetadata,
  selectLookupTables,
  selectLocaleSortingCollator,
  (_: StoreState, code: string) => code,
  (_: StoreState, __: string, resolvedDeck?: ResolvedDeck) => resolvedDeck,
  (state: StoreState, __: string, resolvedDeck?: ResolvedDeck) =>
    selectCanonicalTabooSetId(state, resolvedDeck),
  (metadata, lookupTables, collator, code, resolvedDeck, tabooSetId) => {
    return resolveCardWithRelations(
      { metadata, lookupTables },
      collator,
      code,
      tabooSetId,
      resolvedDeck?.customizations,
      true,
    );
  },
);

/**
 * Subtype
 */

function subtypeLabels() {
  return {
    none: i18n.t("common.subtype.none"),
    weakness: i18n.t("common.subtype.weakness"),
    basicweakness: i18n.t("common.subtype.basicweakness"),
  } as Record<string, string>;
}

export function selectSubtypeOptions() {
  const labels = subtypeLabels();
  return [
    { code: "none", name: labels["none"] },
    { code: "weakness", name: labels["weakness"] },
    { code: "basicweakness", name: labels["basicweakness"] },
  ];
}

/**
 * Taboo Set
 */

export const selectTabooSetOptions = createSelector(
  selectMetadata,
  selectLocaleSortingCollator,
  (metadata, collator) => {
    const sets = Object.values(metadata.tabooSets);
    sets.sort((a, b) => collator.compare(b.date, a.date));
    return sets;
  },
);

/**
 * Trait
 */

export const selectTraitOptions = createSelector(
  selectListFilterProperties,
  selectTraitMapper,
  selectLocaleSortingCollator,
  ({ traits }, traitMapper, collator) => {
    return Array.from(traits)
      .map(traitMapper)
      .sort((a, b) => collator.compare(a.name, b.name));
  },
);

/**
 * Type
 */

export const selectTypeMapper = createSelector(
  selectLocaleSortingCollator,
  (_) => {
    return (code: string) => {
      return {
        code,
        name: i18n.t(`common.type.${code}`),
      };
    };
  },
);

export const selectTypeOptions = createSelector(
  selectListFilterProperties,
  selectLocaleSortingCollator,
  selectTypeMapper,
  ({ types }, collator, mapper) => {
    return Array.from(types)
      .map(mapper)
      .sort((a, b) => collator.compare(a.name, b.name));
  },
);

/**
 * Set
 */

export const selectSetMapper = createSelector(
  selectLocaleSortingCollator,
  (_) => {
    return (code: string) => {
      return {
        code,
        name: i18n.t(`common.set.${code}`),
      };
    };
  },
);

export const selectSetOptions = createSelector(
  selectListFilterProperties,
  selectLocaleSortingCollator,
  selectSetMapper,
  ({ sets }, collator, mapper) => {
    return Array.from(sets)
      .map(mapper)
      .sort((a, b) => collator.compare(a.name, b.name));
  },
);

/**
 * Upgrades
 */

export type AvailableUpgrades = {
  upgrades: Record<string, Card[]>;
  shrewdAnalysisPresent: boolean;
};

// ER has no XP upgrade system — always returns empty.
export const selectAvailableUpgrades = createSelector(
  selectDeckInvestigatorFilter,
  selectMetadata,
  selectLookupTables,
  (_: StoreState, deck: ResolvedDeck) => deck,
  (_: StoreState, __: ResolvedDeck, target: "slots" | "extraSlots") => target,
  (
    _accessFilter,
    _metadata,
    _lookupTables,
    _deck,
    _target,
  ): AvailableUpgrades => {
    return { upgrades: {}, shrewdAnalysisPresent: false };
  },
);

// ER has no XP upgrade system — always returns empty.
export function selectResolvedUpgrades(
  _state: StoreState,
  availableUpgrades: AvailableUpgrades,
  _deck: ResolvedDeck,
  card: Card,
) {
  return (availableUpgrades.upgrades[card.code] ?? []).map(
    (_) => undefined as CardWithRelations | undefined,
  );
}

/**
 * Filter changes
 */

function formatHealthChanges(value: [number, number] | undefined, key: string) {
  if (!value) return "";
  let s = `${value[0]}`;
  if (value[1] !== value[0]) s = `${s}-${value[1]}`;
  return `${key}: ${s}`;
}

function selectAssetChanges(value: AssetFilter) {
  const t = i18n.t;

  const slot = value.slots.reduce((acc, key) => {
    return !acc
      ? `${t("filters.slot.title")}: ${key}`
      : `${acc} ${t("filters.or")} ${key}`;
  }, "");

  const uses = value.uses.reduce((acc, key) => {
    const displayStr = i18n.exists(`common.uses.${key}`)
      ? t(`common.uses.${key}`)
      : capitalize(key);

    return !acc
      ? `${t("filters.uses.title")}: ${displayStr}`
      : `${acc} ${t("filters.or")} ${displayStr}`;
  }, "");

  const skillBoosts = value.skillBoosts.reduce((acc, key) => {
    const displayStr = t(`common.skill.${key}`);

    return !acc
      ? `${t("filters.skill_boost.title")}: ${displayStr}`
      : `${acc} ${t("filters.or")} ${displayStr}`;
  }, "");

  const healthFilter = formatHealthChanges(
    value.health,
    t("filters.health.title"),
  );

  const sanityFilter = formatHealthChanges(
    value.sanity,
    t("filters.sanity.title"),
  );

  return [slot, uses, skillBoosts, sanityFilter, healthFilter]
    .filter((x) => x)
    .join(", ");
}

const selectActionChanges = (value: MultiselectFilter) => {
  if (!value.length) return "";
  return value.map((code) => i18n.t(`common.actions.${code}`)).join(", ");
};

function selectApproachIconChanges(value: ApproachIconsFilter) {
  if (!value.length) return "";
  return value
    .map((code) => i18n.t(`common.skill.${code}`))
    .join(` ${i18n.t("filters.or")} `);
}

function selectAspectRequirementChanges(value: AspectRequirementFilter) {
  const changes: string[] = [];

  if (value.aspects.length) {
    changes.push(
      value.aspects
        .map((code) => i18n.t(`common.factions.${code.toLowerCase()}`))
        .join(` ${i18n.t("filters.or")} `),
    );
  }

  if (value.range) {
    changes.push(
      formatHealthChanges(
        value.range,
        i18n.t("filters.aspect_requirement.value"),
      ),
    );
  }

  return changes.join(", ");
}

function selectCostChanges(value: CostFilter) {
  if (!value.range) return "";

  const min = costToString(value.range[0]);

  let s = min;
  if (value.range[1] !== value.range[0])
    s = `${s}-${costToString(value.range[1])}`;
  if (value.even) s = `${s}, even`;
  if (value.odd) s = `${s}, odd`;
  if (value.x) s = `${s}, X`;

  return s;
}

function selectEquipChanges(value: EquipFilter) {
  return formatHealthChanges(value, i18n.t("filters.equip.title"));
}

const selectEncounterSetChanges = createSelector(
  (_: StoreState, value: MultiselectFilter) => value,
  selectMetadata,
  (value, metadata) => {
    return value
      .map((id) => metadata.encounterSets[id].name)
      .join(` ${i18n.t("filters.or")} `);
  },
);

function selectFanMadeContentChanges(value: FanMadeContentFilter) {
  const t = i18n.t;
  return value === "all"
    ? ""
    : value === "official"
      ? t("filters.fan_made_content.official")
      : t("filters.fan_made_content.fan_made");
}

function selectHealthChanges(value: [number, number] | undefined) {
  return formatHealthChanges(value, i18n.t("filters.health.title"));
}

export function selectIllustratorChanges(value: MultiselectFilter) {
  const count = value.length;
  if (!count) return "";
  return value.join(` ${i18n.t("filters.or")} `);
}

function selectInvestigatorCardAccessChanges(value: MultiselectFilter) {
  const count = value.length;
  if (!count) return "";
  return `${count} ${i18n.t("common.card", { count })}`;
}

const selectInvestigatorChanges = createSelector(
  (_: StoreState, value: SelectFilter) => value,
  selectMetadata,
  (value, metadata) => {
    if (!value) return "";
    const card = metadata.cards[value];
    return card ? displayAttribute(card, "name") : value.toString();
  },
);

function selectInvestigatorSkillIconsChanges(value?: InvestigatorSkillsFilter) {
  if (!value) return "";

  return Object.entries(value).reduce((acc, [key, val]) => {
    if (!val) return acc;

    const skillStr = i18n.t(`common.skill.${key}`);
    const s = `${val[0]}-${val[1]} ${skillStr}`;

    return acc ? `${acc} ${i18n.t("filters.and")} ${s}` : s;
  }, "");
}

function selectLevelChanges(value: LevelFilter) {
  if (!value.range) return undefined;

  const min = levelToString(value.range[0]);

  let str = min;
  if (value.range[1] !== value.range[0]) {
    const max = levelToString(value.range[1]);
    str = `${str}-${max}`;
  }

  return str;
}

function selectOwnershipChanges(value: OwnershipFilter) {
  const t = i18n.t;
  return value === "all"
    ? ""
    : value === "owned"
      ? t("filters.ownership.owned")
      : t("filters.ownership.unowned");
}

const selectPackChanges = createSelector(
  selectMetadata,
  (_: StoreState, value: MultiselectFilter) => value,
  (metadata, value) => {
    if (!value) return "";

    return resolveLimitedPoolPacks(metadata, value)
      .map((pack) => displayPackName(pack))
      .join(` ${i18n.t("filters.or")} `);
  },
);

function selectPropertiesChanges(state: StoreState, value: PropertiesFilter) {
  const propertyOptions = selectPropertyOptions(state);

  return Object.entries(value).reduce((acc, [key, filterValue]) => {
    if (!filterValue) return acc;
    const displayStr = propertyOptions.find((x) => x.key === key)?.label ?? key;
    return !acc ? displayStr : `${acc} ${i18n.t("filters.and")} ${displayStr}`;
  }, "");
}

function selectSanityChanges(value: [number, number] | undefined) {
  return formatHealthChanges(value, "Sanity");
}

function selectSkillIconsChanges(value: SkillIconsFilter) {
  return Object.entries(value).reduce((acc, [key, val]) => {
    if (!val) return acc;

    const displayStr =
      key === "any"
        ? i18n.t("filters.skill_icons.any")
        : i18n.t(`common.skill.${key}`);

    const s = `${val}+ ${displayStr}`;

    return acc ? `${acc} ${i18n.t("filters.and")} ${s}` : s;
  }, "");
}

function selectSubtypeChanges(value: SubtypeFilter) {
  const options = Object.entries(value);
  const enabled = options.filter(([, value]) => !!value);
  if (enabled.length === options.length) return "";

  const labels = subtypeLabels();
  if (enabled.length === 0) return labels["none"];

  return enabled.map(([key]) => labels[key]).join(` ${i18n.t("filters.or")} `);
}

const selectTabooSetChanges = createSelector(
  (_: StoreState, value: SelectFilter) => value,
  selectMetadata,
  (value, metadata) => {
    if (!value) return "";
    const set = metadata.tabooSets[value];
    return set ? formatTabooSet(set) : value.toString();
  },
);

function selectTraitChanges(value: MultiselectFilter) {
  if (!value.length) return "";

  return value
    .map((code) => {
      const key = `common.traits.${code}`;
      return i18n.exists(key) ? i18n.t(key) : code;
    })
    .join(` ${i18n.t("filters.or")} `);
}

function selectSetChanges(value: MultiselectFilter) {
  if (!value.length) return "";
  return value
    .map((code) => i18n.t(`common.set.${code}`))
    .join(` ${i18n.t("filters.or")} `);
}

function selectTypeChanges(value: MultiselectFilter) {
  if (!value.length) return "";
  return value
    .map((code) => i18n.t(`common.type.${code}`))
    .join(` ${i18n.t("filters.or")} `);
}

export function selectFilterChanges<T extends keyof FilterMapping>(
  state: StoreState,
  type: T,
  value: FilterMapping[T],
) {
  switch (type) {
    case "action": {
      return selectActionChanges(value as MultiselectFilter);
    }

    case "approach_icons": {
      return selectApproachIconChanges(value as ApproachIconsFilter);
    }

    case "aspect_requirement": {
      return selectAspectRequirementChanges(value as AspectRequirementFilter);
    }

    case "asset": {
      return selectAssetChanges(value as AssetFilter);
    }

    case "cost": {
      return selectCostChanges(value as CostFilter);
    }

    case "cycle": {
      return selectCycleChanges(state, value as MultiselectFilter);
    }

    case "equip": {
      return selectEquipChanges(value as EquipFilter);
    }

    case "encounter_set": {
      return selectEncounterSetChanges(state, value as MultiselectFilter);
    }

    case "faction": {
      return "";
    }

    case "fan_made_content": {
      return selectFanMadeContentChanges(value as FanMadeContentFilter);
    }

    case "health": {
      return selectHealthChanges(value as HealthFilter);
    }

    case "investigator": {
      return selectInvestigatorChanges(state, value as SelectFilter);
    }

    case "investigator_card_access": {
      return selectInvestigatorCardAccessChanges(value as MultiselectFilter);
    }

    case "investigator_skills": {
      return selectInvestigatorSkillIconsChanges(
        value as InvestigatorSkillsFilter,
      );
    }

    case "level": {
      return selectLevelChanges(value as LevelFilter);
    }

    case "ownership": {
      return selectOwnershipChanges(value as OwnershipFilter);
    }

    case "pack": {
      return selectPackChanges(state, value as MultiselectFilter);
    }

    case "properties": {
      return selectPropertiesChanges(state, value as PropertiesFilter);
    }

    case "sanity": {
      return selectSanityChanges(value as SanityFilter);
    }

    case "skill_icons": {
      return selectSkillIconsChanges(value as SkillIconsFilter);
    }

    case "subtype": {
      return selectSubtypeChanges(value as SubtypeFilter);
    }

    case "taboo_set": {
      return selectTabooSetChanges(state, value as SelectFilter);
    }

    case "set": {
      return selectSetChanges(value as MultiselectFilter);
    }

    case "trait": {
      return selectTraitChanges(value as MultiselectFilter);
    }

    case "type": {
      return selectTypeChanges(value as MultiselectFilter);
    }
  }
}

type FilterChange = {
  type: keyof FilterMapping | "search";
  change: string;
};

export const selectActiveListChanges = createSelector(
  (state: StoreState) => state,
  (state) => {
    const list = selectActiveList(state);
    if (!list) return [];

    const changes = list.filters.reduce((acc, type, id) => {
      const filter = list.filterValues[id];
      if (!filter) return acc;

      const change = selectFilterChanges(state, type, filter.value);
      if (change) acc.push({ type, change });

      return acc;
    }, [] as FilterChange[]);

    if (list.search.value) {
      changes.push({
        type: "search",
        change: list.search.value,
      });
    }

    return changes;
  },
);
