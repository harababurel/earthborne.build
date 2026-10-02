import type { Card } from "@earthborne-build/shared";
import { afterEach, describe, expect, it } from "vitest";
import { useStore } from "@/store";
import {
  selectStaticBuildQlInterpreter,
  selectTraitMapper,
} from "@/store/selectors/shared";
import type { Search } from "@/store/slices/lists.types";
import { getInitialMetadata } from "@/store/slices/metadata";
import { makeTestDeck } from "@/test/factories";
import { cardFrontImageUrl } from "@/utils/card-utils";
import i18n, { changeLanguage } from "@/utils/i18n";
import { parseUnchecked } from "./buildql/parser";
import { formatDeckAsText } from "./deck-io";
import { createLookupTables } from "./lookup-tables";
import { resolveDeck } from "./resolve-deck";
import { applySearch } from "./searching";

const card: Card = {
  code: "01001",
  name: "Explorador decidido",
  real_name: "Determined Seeker",
  pack_code: "ebr",
  type_code: "gear",
  traits: "Expert / Tool",
  category: "personality",
  set_position: 1,
};
const metadata = { ...getInitialMetadata(), cards: { [card.code]: card } };
const search: Search = {
  mode: "simple",
  value: "",
  includeName: true,
  includeGameText: false,
  includeFlavor: false,
  includeBacks: false,
};

afterEach(async () => {
  await changeLanguage("en");
});

describe("localized cards", () => {
  it("finds translated and English names without enabling other search fields", () => {
    for (const value of ["Explorador", "Determined Seeker", card.code]) {
      expect(applySearch({ ...search, value }, [card], metadata)).toEqual([
        card,
      ]);
    }
    expect(
      applySearch({ ...search, value: "Expert" }, [card], metadata),
    ).toEqual([]);
    expect(
      applySearch(
        { ...search, value: "Seeker", includeName: false },
        [card],
        metadata,
      ),
    ).toEqual([]);
  });

  it("matches either name in BuildQL, including negation and lists", () => {
    const state = { ...useStore.getInitialState(), metadata };
    const interpreter = selectStaticBuildQlInterpreter(state);
    for (const query of [
      'name = "Explorador"',
      'name == "Determined Seeker"',
      'na ? ["Other", "Seeker"]',
      "name = /determined/",
      'name != "Missing"',
    ]) {
      expect(interpreter.evaluate(parseUnchecked(query))(card), query).toBe(
        true,
      );
    }
    for (const query of [
      'name != "Seeker"',
      'name !== "Explorador decidido"',
      'name !?? ["Determined Seeker"]',
    ]) {
      expect(interpreter.evaluate(parseUnchecked(query))(card), query).toBe(
        false,
      );
    }
  });

  it("translates individual and composite trait displays while retaining English codes", async () => {
    await changeLanguage("es");
    const state = {
      ...useStore.getInitialState(),
      settings: {
        ...useStore.getInitialState().settings,
        locale: "es" as const,
      },
    };
    const mapper = selectTraitMapper(state);
    expect(mapper("Tool")).toEqual({
      code: "Tool",
      name: i18n.t("common.traits.Tool"),
    });
    expect(mapper("Tool. Expert.")).toEqual({
      code: "Tool. Expert.",
      name: `${i18n.t("common.traits.Tool")}. Expert.`,
    });
    expect(mapper("Tool / Unknown").name).toBe(
      `${i18n.t("common.traits.Tool")} / Unknown`,
    );
    expect(card.traits).toBe("Expert / Tool");
  });

  it("exports English names and leaves image URLs unchanged", () => {
    const role: Card = {
      code: "role",
      name: "Guía",
      real_name: "Guide",
      type_code: "role",
      pack_code: "ebr",
    };
    const state = {
      ...useStore.getInitialState(),
      metadata: { ...metadata, cards: { ...metadata.cards, role } },
    };
    const collator = new Intl.Collator("es");
    const deck = resolveDeck(
      {
        ...state,
        lookupTables: createLookupTables(state.metadata, state.settings),
      },
      collator,
      makeTestDeck({ role_code: "role", slots: { [card.code]: 2 } }),
    );
    const text = formatDeckAsText(state, deck);
    expect(text).toContain("Guide");
    expect(text).toContain("Determined Seeker");
    expect(text).not.toContain("Explorador");
    expect(text).not.toContain("Guía");
    expect(cardFrontImageUrl(card, false)).toBe(
      cardFrontImageUrl({ ...card, name: card.real_name ?? card.name }, false),
    );
  });
});
