/** biome-ignore-all lint/suspicious/noExplicitAny: test code */

import { beforeAll, describe, expect, it } from "vitest";
import type { StoreApi } from "zustand";
import { getMockStore } from "@/test/get-mock-store";
import {
  selectLookupTables,
  selectStaticBuildQlInterpreter,
} from "../selectors/shared";
import type { StoreState } from "../slices";
import type { InvestigatorAccessConfig } from "./filtering";
import {
  filterInvestigatorAccess,
  filterOwnership,
  filterProperties,
  filterRangerCards,
  filterStartingCards,
} from "./filtering";

describe("filter: ranger cards", () => {
  it("excludes role and aspect cards from the ranger card section", () => {
    expect(
      filterRangerCards({
        category_id: "ranger",
        type_code: "gear",
      } as any),
    ).toBe(true);

    expect(
      filterRangerCards({
        category_id: "ranger",
        type_code: "role",
      } as any),
    ).toBe(false);

    expect(
      filterRangerCards({
        category_id: "ranger",
        type_code: "aspect",
      } as any),
    ).toBe(false);
  });
});

describe("filter: starting cards", () => {
  it("includes background, specialty, and personality cards", () => {
    for (const category of ["background", "specialty", "personality"]) {
      expect(filterStartingCards({ category, type_code: "gear" } as any)).toBe(
        true,
      );
    }
  });

  it("excludes rewards, maladies, roles, and uncategorized cards", () => {
    expect(
      filterStartingCards({ category: "reward", type_code: "gear" } as any),
    ).toBe(false);
    expect(
      filterStartingCards({
        category: "malady",
        type_code: "attachment",
      } as any),
    ).toBe(false);
    expect(
      filterStartingCards({ category: "specialty", type_code: "role" } as any),
    ).toBe(false);
    expect(
      filterStartingCards({ category: null, type_code: "aspect" } as any),
    ).toBe(false);
  });

  it("is applied through the properties filter", () => {
    const filter = filterProperties({ starting: true }, {} as any);
    expect(filter?.({ category: "background", type_code: "gear" } as any)).toBe(
      true,
    );
    expect(filter?.({ category: "reward", type_code: "gear" } as any)).toBe(
      false,
    );
  });
});

describe("filter: investigator access", () => {
  let store: StoreApi<StoreState>;

  function _applyFilter(
    state: StoreState,
    code: string,
    target: string,
    config?: InvestigatorAccessConfig,
  ) {
    const buildQlInterpreter = selectStaticBuildQlInterpreter(state);

    return filterInvestigatorAccess(
      state.metadata.cards[code],
      buildQlInterpreter,
      config,
    )?.(state.metadata.cards[target]);
  }

  beforeAll(async () => {
    store = await getMockStore();
  });

  describe("ownership", () => {
    it("handles case: pack owned", () => {
      const state = store.getState();
      expect(
        filterOwnership({
          card: state.metadata.cards["51007"],
          metadata: state.metadata,
          lookupTables: selectLookupTables(state),
          collection: { rtdwl: true },
          showAllCards: false,
        }),
      ).toBeTruthy();
    });
  });
});
