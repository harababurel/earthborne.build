import type { Card } from "@earthborne-build/shared";
import type { TFunction } from "i18next";
import { displayAttribute } from "@/utils/card-utils";
import type { Metadata } from "../slices/metadata.types";
import type { ResolvedDeck } from "./types";

// Aspect stats are displayed in the ranger sheet order (AWA, SPI, FIT, FOC),
// matching the aspect card layout rather than the alphabetical ASPECT_ORDER.
const ASPECT_STATS = [
  { key: "AWA", getValue: (c: Card) => c.aspect_awareness },
  { key: "SPI", getValue: (c: Card) => c.aspect_spirit },
  { key: "FIT", getValue: (c: Card) => c.aspect_fitness },
  { key: "FOC", getValue: (c: Card) => c.aspect_focus },
] as const;

export type DeckShareOptions = {
  includeRewards: boolean;
  includeDisplaced: boolean;
};

type DeckShareCard = { quantity: number; name: string };

type DeckShareSection = { title: string; cards: DeckShareCard[] };

export type DeckShareModel = {
  title: string;
  headerParts: string[];
  aspects: string;
  sections: DeckShareSection[];
};

export function buildDeckShareModel(
  deck: ResolvedDeck,
  metadata: Metadata,
  t: TFunction,
  options: DeckShareOptions,
): DeckShareModel {
  const backgroundName = t(`common.set.${deck.background}`);
  const specialtyName = t(`common.set.${deck.specialty}`);
  const roleName = displayAttribute(metadata.cards[deck.role_code], "name");

  const aspectCard = metadata.cards[deck.aspect_code];
  const aspects = ASPECT_STATS.map(
    ({ key, getValue }) =>
      `${aspectCard ? (getValue(aspectCard) ?? 0) : 0} ${key}`,
  ).join(", ");

  const buckets: Record<
    "personality" | "background" | "specialty" | "outside",
    Card[]
  > = { personality: [], background: [], specialty: [], outside: [] };

  for (const [code, quantity] of Object.entries(deck.slots)) {
    if (!quantity) continue;

    const card = deck.cards.slots[code]?.card;
    if (!card?.category) continue;

    if (card.category === "personality") {
      buckets.personality.push(card);
    } else if (card.category === "background") {
      if (card.background_type === deck.background) {
        buckets.background.push(card);
      } else {
        buckets.outside.push(card);
      }
    } else if (card.category === "specialty") {
      if (card.specialty_type === deck.specialty) {
        buckets.specialty.push(card);
      } else {
        buckets.outside.push(card);
      }
    }
    // reward and malady cards are surfaced through the optional sections below.
  }

  const sections: DeckShareSection[] = [
    { title: t("deck_edit.sections.personality"), cards: buckets.personality },
    {
      title: `${t("deck_edit.sections.background")}: ${backgroundName}`,
      cards: buckets.background,
    },
    {
      title: `${t("deck_edit.sections.specialty")}: ${specialtyName}`,
      cards: buckets.specialty,
    },
    {
      title: t("deck_edit.sections.outside_interest"),
      cards: buckets.outside,
    },
  ].map((section) => ({
    title: section.title,
    cards: toShareCards(section.cards, (card) => deck.slots[card.code] ?? 0),
  }));

  // Rewards that have been swapped into the deck belong to it and are always
  // listed as part of the deck.
  const inDeckRewards = Object.values(metadata.cards).filter(
    (card) => card.category === "reward" && (deck.slots?.[card.code] ?? 0) > 0,
  );

  sections.push({
    title: t("deck_share.included_rewards"),
    cards: toShareCards(inDeckRewards, (card) => deck.slots?.[card.code] ?? 0),
  });

  // The option adds a separate section listing every unlocked reward, whether or
  // not it has been swapped into the deck — so an in-deck reward appears twice.
  if (options.includeRewards) {
    const unlockedRewards = Object.values(metadata.cards).filter(
      (card) => card.category === "reward" && isRewardUnlocked(deck, card.code),
    );

    sections.push({
      title: t("deck_edit.sections.rewards"),
      cards: toShareCards(unlockedRewards, (card) =>
        rewardQuantity(deck, card.code),
      ),
    });
  }

  if (options.includeDisplaced) {
    const displacedCards = Object.entries(deck.displaced ?? {})
      .filter(([, quantity]) => quantity > 0)
      .map(([code]) => deck.cards.slots[code]?.card ?? metadata.cards[code])
      .filter((card): card is Card => !!card);

    sections.push({
      title: t("deck_edit.sections.displaced"),
      cards: toShareCards(
        displacedCards,
        (card) => deck.displaced?.[card.code] ?? 0,
      ),
    });
  }

  return {
    title: deck.name,
    headerParts: [backgroundName, specialtyName, roleName],
    aspects,
    sections: sections.filter((section) => section.cards.length > 0),
  };
}

export function hasUnlockedRewards(deck: ResolvedDeck, metadata: Metadata) {
  return Object.values(metadata.cards).some(
    (card) => card.category === "reward" && isRewardUnlocked(deck, card.code),
  );
}

export function hasDisplacedCards(deck: ResolvedDeck) {
  return Object.values(deck.displaced ?? {}).some((quantity) => quantity > 0);
}

export function formatDeckShareText(model: DeckShareModel): string {
  const blocks: string[] = [
    [model.title, model.headerParts.join(" - "), model.aspects].join("\n"),
  ];

  for (const section of model.sections) {
    const cards = section.cards.map((card) => `${card.quantity}x ${card.name}`);
    blocks.push([section.title, ...cards].join("\n"));
  }

  return blocks.join("\n\n");
}

export function formatDeckShareMarkdown(model: DeckShareModel): string {
  const blocks: string[] = [
    `# ${model.title}`,
    model.headerParts.map((part) => `**${part}**`).join(" - "),
    `**${model.aspects}**`,
  ];

  for (const section of model.sections) {
    const cards = section.cards.map(
      (card) => `* ${card.quantity}x ${card.name}`,
    );
    blocks.push([`## ${section.title}`, "", ...cards].join("\n"));
  }

  return blocks.join("\n\n");
}

function toShareCards(
  cards: Card[],
  getQuantity: (card: Card) => number,
): DeckShareCard[] {
  return [...cards].sort(bySetPosition).map((card) => ({
    quantity: getQuantity(card),
    name: displayAttribute(card, "name"),
  }));
}

function isRewardUnlocked(deck: ResolvedDeck, code: string) {
  return (
    (deck.rewards?.[code] ?? 0) > 0 ||
    (deck.slots?.[code] ?? 0) > 0 ||
    (deck.displaced?.[code] ?? 0) > 0
  );
}

function rewardQuantity(deck: ResolvedDeck, code: string) {
  return (
    (deck.slots?.[code] ?? 0) ||
    (deck.rewards?.[code] ?? 0) ||
    (deck.displaced?.[code] ?? 0) ||
    1
  );
}

function bySetPosition(a: Card, b: Card) {
  const posA = Number(a.set_position ?? Number.POSITIVE_INFINITY);
  const posB = Number(b.set_position ?? Number.POSITIVE_INFINITY);

  if (Number.isNaN(posA) || Number.isNaN(posB) || posA === posB) {
    return displayAttribute(a, "name").localeCompare(
      displayAttribute(b, "name"),
    );
  }

  return posA - posB;
}
