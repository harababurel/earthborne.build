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
import { filterInvestigatorAccess, filterOwnership } from "./filtering";

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
