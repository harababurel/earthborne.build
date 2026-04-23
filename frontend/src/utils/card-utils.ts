import type { Card } from "@arkham-build/shared";
import type { TFunction } from "i18next";
import type { Cycle } from "@/store/schemas/cycle.schema";
import type { Pack } from "@/store/schemas/pack.schema";
import { assert } from "./assert";

const ER_STAT_TOKENS = new Set(["FIT", "AWA", "FOC", "SPI"]);

// Tokens that map directly to a class in the "core" icon font from rangersdb.
const ER_CORE_FONT_TOKENS = new Set([
  "conflict",
  "connection",
  "reason",
  "exploration",
  "harm",
  "progress",
  "ranger",
  "per_ranger",
  "guide",
  "sun",
  "crest",
  "mountain",
  "conditional",
]);

export function splitMultiValue(s: string | null | undefined) {
  if (!s) return [];
  return s.split(/[./]/).reduce<string[]>((acc, curr) => {
    const value = curr.trim().replace(/^¬/, "");
    if (value) acc.push(value);
    return acc;
  }, []);
}

// Stub — ER has no skill icons.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function hasSkillIcons(_card: Card) {
  return false;
}

// Stub — ER has no faction color system; will be replaced with aspect colors.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getCardColor(card: Card, _prop = "color") {
  const aspect = card.energy_aspect ?? card.aspect_requirement_type;
  if (aspect) return `color-${aspect}`;
  return "color-neutral";
}

// Stub — ER cards are not displayed sideways.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function sideways(_card: Card) {
  return false;
}

type CardBackType = "player" | "card";

const DEFAULT_PLAYER_CARD_BACK_URL = "/assets/ranger-card-back-art.png";
const DEFAULT_PATH_CARD_BACK_URL = "/assets/path-card-back-art.png";

export function cardBackType(card: Card): CardBackType {
  if (card.double_sided) return "card";
  return "player";
}

export function cardBackTypeUrl(card: Card) {
  const type = cardBackType(card);
  if (type === "player") {
    if (card.category_id === "path") return DEFAULT_PATH_CARD_BACK_URL;
    return DEFAULT_PLAYER_CARD_BACK_URL;
  }
  return `${import.meta.env.VITE_CARD_IMAGE_URL}/back_${type}.jpg`;
}

// In ER, double-sided cards are not "reversed" in the AH sense.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function reversed(_card: Card) {
  return false;
}

export function imageUrl(code: string) {
  return `${import.meta.env.VITE_CARD_IMAGE_URL}/${code}`;
}

export function thumbnailUrl(code: string) {
  return `${import.meta.env.VITE_CARD_IMAGE_URL}/${code}`;
}

export function parseCardTextHtml(
  cardText: string,
  opts?: {
    bullets?: boolean;
    newLines?: "replace" | "skip";
  },
) {
  let parsed = cardText;

  if (opts?.bullets) {
    parsed = parsed.replaceAll(/^\s?(-|–)/gm, `<i class="icon-bullet"></i>`);
  }

  parsed = parsed
    .replaceAll(/\[\[(.*?)\]\]/g, "<b><em>$1</em></b>")
    .replaceAll(/(\\?)\[((?:\w|_)+?)\]/g, (match, esc, token: string) => {
      if (esc === "\\") {
        return match.slice(1);
      }

      const t = token === "right_arrow" ? "conditional" : token;
      if (ER_CORE_FONT_TOKENS.has(t)) {
        return `<span class="core-${t}"></span>`;
      }
      if (ER_STAT_TOKENS.has(t)) {
        return `<b class="color-${t}">${t}</b>`;
      }

      if (/^\d+$/.test(token)) {
        return match;
      }

      return `<i class="icon-${token}"></i>`;
    });

  if (opts?.newLines !== "skip") {
    parsed = parsed.replaceAll("\n", "<hr class='break'>");
  }

  return parsed;
}

export function parseCustomizationTextHtml(customizationText: string) {
  return parseCardTextHtml(customizationText).replaceAll(/□/g, "");
}

export function parseCardTitle(title: string) {
  return title.replaceAll(/\[((?:\w|_)+?)\]/g, `<i class="icon-$1"></i>`);
}

// Stub — ER has no exile slots.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function decodeExileSlots(
  _s: string | null | undefined,
): Record<string, number> {
  return {};
}

// In ER, "special" cards are non-deck-buildable: role, aspect, path cards etc.
export function isSpecialCard(card: Card) {
  const deckBuildableTypes = new Set([
    "moment",
    "attachment",
    "gear",
    "being",
    "feature",
    "attribute",
  ]);
  return !deckBuildableTypes.has(card.type_code);
}

// In ER, the closest analog to "enemy" is the "being" card type.
export function isEnemyLike(card: Card) {
  return card.type_code === "being";
}

// In ER, cards have a single canonical code.
export function getCanonicalCardCode(card: Card) {
  return card.code;
}

// Stub — ER has no weaknesses/basic weakness mechanic.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function isRandomBasicWeaknessLike(_card: Card) {
  return false;
}

// Stub — ER has no static investigator concept.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function isStaticInvestigator(_card: Card) {
  return false;
}

export function cardLimit(card: Card, limitOverride?: number) {
  return limitOverride ?? card.deck_limit ?? 0;
}

// Stub — ER has no "uses" mechanic.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function cardUses(_card: Card) {
  return undefined;
}

export function displayAttribute(
  card: Card | undefined,
  key: "text" | "name" | "traits" | "flavor",
) {
  return card?.[key] ?? "";
}

// Stub — ER has no cycle/standalone-pack distinction; always return the pack.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function cycleOrPack(_cycle: Cycle, pack: Pack) {
  return pack;
}

export function numericalIcon(num: string | number | null | undefined) {
  if (num == null) return "icon-numNull";
  if (num === -2) return "icon-x";
  if (num === -3) return "icon-star";
  if (num === -4) return "x-icon-question-mark";
  return `icon-num${num}`;
}

export function numericalStr(num: string | number | null | undefined) {
  if (num == null) return "-";
  if (num === -2) return "X";
  if (num === -3) return "*";
  if (num === -4) return "?";
  return `${num}`;
}

// In ER, all cards from the official data source are official.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function official(_card: Card | Pack | Cycle) {
  return true;
}

export function cardUrl(card: Card) {
  return `~/card/${card.code}`;
}

export function oldFormatCardUrl(card: Card) {
  const baseUrl = cardUrl(card);
  return `${baseUrl}?old_format=true`;
}

// Stub — ER has no card pool extension mechanic.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function canShowCardPoolExtension(_card: Card) {
  return false;
}

export function doubleSidedBackCard(card: Card, t: TFunction) {
  if (!card.double_sided) return undefined;

  const nameFallback = t("common.card_back", {
    name: displayAttribute(card, "name"),
  });

  return {
    ...card,
    name: nameFallback,
    flavor: card.flavor ?? "",
    text: card.text ?? "",
    traits: card.traits ?? "",
  };
}

export function deckCreateLink(card: Card) {
  assert(card.type_code === "role", "only role cards can create decks");
  return `/deck/create/${card.code}`;
}
