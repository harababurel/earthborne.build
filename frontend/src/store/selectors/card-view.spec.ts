import type { Card } from "@arkham-build/shared";
import { describe, expect, it } from "vitest";
import { useStore } from "@/store";
import { selectUsableByInvestigators } from "./card-view";

describe("card-view selectors", () => {
  it("uses ER role cards when finding cards that can use a deck card", () => {
    const roleCard = {
      code: "role-1",
      name: "Role",
      pack_code: "pack-1",
      position: 1,
      quantity: 1,
      type_code: "role",
    } as Card;

    const deckCard = {
      category: "background",
      code: "card-1",
      name: "Deck card",
      pack_code: "pack-1",
      position: 2,
      quantity: 1,
      type_code: "moment",
    } as Card;

    const state = useStore.getInitialState();

    const result = selectUsableByInvestigators(
      {
        ...state,
        metadata: {
          ...state.metadata,
          cards: {
            [roleCard.code]: roleCard,
            [deckCard.code]: deckCard,
          },
          cycles: {
            "pack-1": {
              code: "pack-1",
              name: "Pack",
              official: true,
              position: 1,
              real_name: "Pack",
            },
          },
          packs: {
            "pack-1": {
              code: "pack-1",
              cycle_code: "pack-1",
              name: "Pack",
              official: true,
              position: 1,
              real_name: "Pack",
            },
          },
        },
      },
      deckCard,
    );

    expect(result.map(({ card }) => card.code)).toEqual([roleCard.code]);
  });
});
