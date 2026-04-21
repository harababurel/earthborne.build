import type { Card } from "@arkham-build/shared";
import { createSelector } from "reselect";
import { official } from "@/utils/card-utils";
import i18n from "@/utils/i18n";
import { fields } from "../lib/buildql/fields";
import { Interpreter } from "../lib/buildql/interpreter";
import { isCardOwned } from "../lib/card-ownership";
import { createLookupTables } from "../lib/lookup-tables";
import type { ResolvedDeck } from "../lib/types";
import type { Cycle } from "../schemas/cycle.schema";
import type { Pack } from "../schemas/pack.schema";
import type { StoreState } from "../slices";

export const selectMetadata = (state: StoreState) => state.metadata;

export const selectLookupTables = createSelector(
  selectMetadata,
  (state: StoreState) => state.settings,
  (metadata, settings) => {
    return createLookupTables(metadata, settings);
  },
);

export const selectClientId = (state: StoreState) => {
  return state.app.clientId;
};

export const selectIsInitialized = (state: StoreState) => {
  return state.ui.initialized;
};

export const selectCanCheckOwnership = (state: StoreState) =>
  !state.settings.showAllCards;

export const selectCollection = createSelector(
  selectMetadata,
  (state: StoreState) => state.settings,
  (metadata, settings) => {
    const collection = {
      ...settings.collection,
      ...Object.fromEntries(
        Object.entries(metadata.packs)
          .filter(([, pack]) => !official(pack))
          .map((pack) => [pack[0], true]),
      ),
    };

    return collection;
  },
);

export const selectCardOwnedCount = createSelector(
  selectMetadata,
  selectLookupTables,
  selectCollection,
  (state: StoreState) => state.settings,
  (metadata, lookupTables, collection, settings) => {
    return (card: Card) => {
      return isCardOwned({
        card,
        metadata,
        lookupTables,
        collection,
        showAllCards: settings.showAllCards,
      });
    };
  },
);

export const selectBackCard = createSelector(
  selectMetadata,
  selectLookupTables,
  (_: StoreState, code: string) => code,
  (metadata, lookupTables, code) => {
    const card = metadata.cards[code];
    if (!card) return undefined;

    // ER uses double_sided instead of back_link_id/hidden.
    if (card.double_sided) {
      const backCode = Object.keys(
        lookupTables.relations.fronts[code] ?? {},
      ).at(0);

      return backCode ? metadata.cards[backCode] : undefined;
    }

    return undefined;
  },
);

export const selectLocaleSortingCollator = createSelector(
  (state: StoreState) => state.settings,
  (settings) => {
    return new Intl.Collator(settings.locale, {
      ignorePunctuation: settings.sortIgnorePunctuation,
      sensitivity: "base",
      usage: "sort",
    });
  },
);

export const selectCardMapper = createSelector(selectMetadata, (metadata) => {
  return (code: string) => metadata.cards[code];
});

export const selectTraitMapper = createSelector(
  selectLocaleSortingCollator,
  (_) => {
    return (code: string) => {
      const key = `common.traits.${code}`;
      const name = i18n.exists(key) ? i18n.t(key) : code;
      return { code, name };
    };
  },
);

export const selectSkillMapper = createSelector(
  selectLocaleSortingCollator,
  (_) => {
    return (code: string) => {
      return {
        code,
        name: i18n.t(`common.skill.${code}`),
      };
    };
  },
);

export type Printing = {
  id: string;
  card: Card;
  pack: Pack;
  cycle: Cycle;
};

export const selectActiveList = (state: StoreState) => {
  const active = state.activeList;
  return active ? state.lists[active] : undefined;
};

export const selectPrintingsForCard = createSelector(
  selectMetadata,
  selectLookupTables,
  selectLocaleSortingCollator,
  (_: StoreState, code: string) => code,
  (metadata, lookupTables, collator, cardCode) => {
    const duplicates = Object.keys(
      lookupTables.relations.duplicates[cardCode] ?? {},
    );

    const reprints = Object.keys(
      lookupTables.relations.reprints[cardCode] ?? {},
    );

    const basePrints = Object.keys(
      lookupTables.relations.basePrints[cardCode] ?? {},
    );

    const packCodes = Array.from(
      new Set([cardCode, ...duplicates, ...reprints, ...basePrints]),
    ).reduce((acc, code) => {
      const card = metadata.cards[code];

      const canShow = official(card);

      if (!canShow) return acc;

      acc.set(card.pack_code, card);
      return acc;
    }, new Map<string, Card>());

    const printings = Array.from(packCodes.entries())
      .map(([packCode, card]) => {
        const pack = metadata.packs[packCode];
        const cycle = metadata.cycles[pack.cycle_code];
        return {
          card,
          cycle,
          id: `${pack.code}-${card.code}`,
          pack,
        } as Printing;
      })
      .sort((a, b) => {
        if (official(a.cycle) !== official(b.cycle)) {
          return a.cycle.official ? -1 : 1;
        }

        if (official(a.cycle) && official(b.cycle)) {
          if (a.cycle.position !== b.cycle.position) {
            return a.cycle.position - b.cycle.position;
          }
        } else {
          const cycleNameComparison = collator.compare(
            a.cycle.real_name,
            b.cycle.real_name,
          );

          if (cycleNameComparison !== 0) {
            return cycleNameComparison;
          }
        }

        if (a.cycle.code === "core" && b.cycle.code === "core") {
          return a.pack.position - b.pack.position;
        }

        // invert: mythos packs first, reprints second
        return b.pack.position - a.pack.position;
      });

    return printings;
  },
);

export const selectBuildQlInterpreter = createSelector(
  selectMetadata,
  selectLookupTables,
  selectActiveList,
  (_: StoreState, deck?: ResolvedDeck) => deck,
  (metadata, lookupTables, list, deck) => {
    return new Interpreter({
      fields,
      fieldLookupContext: {
        deck,
        i18n,
        lookupTables,
        matchBacks: !!list?.search?.includeBacks,
        metadata,
      },
    });
  },
);

export const selectStaticBuildQlInterpreter = createSelector(
  selectMetadata,
  selectLookupTables,
  selectActiveList,
  (metadata, lookupTables, list) => {
    return new Interpreter({
      fields,
      fieldLookupContext: {
        deck: undefined,
        i18n,
        lookupTables,
        matchBacks: !!list?.search?.includeBacks,
        metadata,
      },
    });
  },
);
