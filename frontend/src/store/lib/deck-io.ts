import type { Card, Deck, DeckProblem } from "@earthborne-build/shared";
import {
  type DeckValidationResult,
  validateDeck,
} from "@/store/lib/deck-validation";
import type { StoreState } from "@/store/slices";
import { displayAttribute } from "@/utils/card-utils";
import { randomId } from "@/utils/crypto";
import i18n from "@/utils/i18n";
import { isEmpty } from "@/utils/is-empty";
import {
  selectLocaleSortingCollator,
  selectLookupTables,
  selectMetadata,
  selectStaticBuildQlInterpreter,
} from "../selectors/shared";
import { getInitialSettings } from "../slices/settings";
import {
  type DeckGrouping,
  groupDeckCards,
  isGroupCollapsed,
  resolveParents,
  resolveQuantities,
} from "./deck-grouping";
import { getGroupingKeyLabel } from "./grouping";
import { resolveDeck } from "./resolve-deck";
import { makeSortFunction } from "./sorting";
import type { ResolvedDeck } from "./types";

export function formatDeckImport(
  state: StoreState,
  deck: Deck,
  type: string,
): Deck {
  const now = new Date().toISOString();

  const validation = validateDeck(
    resolveDeck(
      {
        lookupTables: selectLookupTables(state),
        metadata: selectMetadata(state),
        sharing: state.sharing,
      },
      selectLocaleSortingCollator(state),
      deck,
    ),
    selectMetadata(state),
    selectLookupTables(state),
    selectStaticBuildQlInterpreter(state),
  );

  const problem = mapValidationToProblem(validation);

  const cleanedDeck = Object.entries(deck).reduce<Record<string, unknown>>(
    (acc, [key, value]) => {
      if (isApiDeckKey(key)) {
        acc[key] = value;
      }

      return acc;
    },
    {},
  );

  return {
    ...(cleanedDeck as Deck),
    id: randomId(),
    problem,
    date_creation: now,
    date_update: now,
    tags:
      type === "decklist"
        ? (deck.tags?.replaceAll(", ", " ") ?? null)
        : deck.tags,
  };
}

export function formatDeckShare(_deck: Deck): Deck {
  const deck = structuredClone(_deck);
  deck.source = undefined;
  return deck;
}

export function mapValidationToProblem(
  validation: DeckValidationResult,
): DeckProblem | null {
  if (validation.valid) return null;

  const error = validation.errors[0];
  if (!error) return null;

  switch (error.type) {
    case "TOO_FEW_CARDS":
      return "too_few_cards";
    case "TOO_MANY_CARDS":
      return "too_many_cards";
    case "INVALID_CARD_COUNT":
      return "too_many_copies";
    case "INVALID_DECK_OPTION":
      return "invalid_cards";
    case "FORBIDDEN":
      return "invalid_cards";
    default:
      return null;
  }
}

// This is very ugly, but not a hot path, so who cares.
export function formatDeckAsText(state: StoreState, deck: ResolvedDeck) {
  let text = "";

  const t = i18n.t;
  const metadata = selectMetadata(state);

  const investigatorName = displayAttribute(
    metadata.cards[deck.role_code],
    "name",
  );

  text += `# ${deck.name}\n\n`;
  text += `${t("common.type.role")}: ${investigatorName}  \n`;

  const groups = groupDeckCards(
    selectMetadata(state),
    selectLocaleSortingCollator(state),
    getInitialSettings().lists.deck,
    deck,
  );

  if (groups.slots && !isEmpty(deck.slots)) {
    text += `\n## ${t("common.decks.slots")}\n\n${formatGrouping(state, groups.slots, deck.slots)}`;
  }

  return text;
}

function formatGrouping(
  state: StoreState,
  grouping: DeckGrouping,
  slots: { [code: string]: number },
) {
  let text = "";

  const metadata = selectMetadata(state);
  const quantities = resolveQuantities(grouping);

  const seenParents = new Set<string>();

  grouping.data.forEach((group, i) => {
    const parents = resolveParents(grouping, group).filter(
      (parent) => !seenParents.has(parent.key),
    );

    parents.forEach((parent, _) => {
      seenParents.add(parent.key);
      const key = parent.key.split("|").at(-1) as string;
      const type = parent.type.split("|").at(-1) as string;
      text += `**${getGroupingKeyLabel(type, key, metadata)}** (${quantities.get(parent.key) ?? 0})  \n`;
    });

    if (!isGroupCollapsed(group)) {
      const key = group.key.split("|").at(-1) as string;
      const type = group.type.split("|").at(-1) as string;
      text += `_${getGroupingKeyLabel(type, key, metadata)}_ (${quantities.get(group.key) ?? 0})  \n`;
    }

    text += formatGroupAsText(state, group.cards, slots);
    if (i < grouping.data.length - 1) text += "\n";
  });

  return text;
}

function formatGroupAsText(
  state: StoreState,
  data: Card[],
  quantities: { [code: string]: number },
) {
  if (!data.length) return "";

  const metadata = selectMetadata(state);

  const sortFn = makeSortFunction(
    ["name"],
    metadata,
    selectLocaleSortingCollator(state),
  );

  const cards = [...data]
    .sort(sortFn)
    .map((c) => formatCardAsText(state, c, quantities))
    .join("\n");

  return `${cards}\n`;
}

function formatCardAsText(
  _state: StoreState,
  card: Card,
  quantities: { [code: string]: number },
) {
  const name = displayAttribute(card, "name");

  const quantity = quantities[card.code] ?? 0;
  const energyCost = card.energy_cost != null ? ` [${card.energy_cost}]` : "";
  return `- ${name}${energyCost}${quantity > 1 ? ` x${quantity}` : ""}`;
}

function isApiDeckKey(key: string): key is keyof Deck {
  return [
    "date_creation",
    "date_update",
    "description_md",
    "id",
    "name",
    "problem",
    "slots",
    "tags",
    "version",
    "aspect_code",
    "role_code",
    "background",
    "specialty",
  ].includes(key);
}
