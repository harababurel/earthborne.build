import type { Card } from "@earthborne-build/shared";
import type { TFunction } from "i18next";
import {
  locationSymbolUrls,
  locationSymbolUrlsByNormalizedName,
} from "@/assets/symbols";
import { getCampaignGuideEntryHrefById } from "@/components/card/campaign-guide-entry";
import type { Cycle } from "@/store/schemas/cycle.schema";
import type { Pack } from "@/store/schemas/pack.schema";
import { assert } from "./assert";

const ER_STAT_TOKENS = new Set(["FIT", "AWA", "FOC", "SPI"]);

const ER_INLINE_SVG_TOKENS = new Set(["buck"]);

const LEGACY_ICON_TOKENS = new Set(["action", "reaction", "free"]);

// Tokens that map directly to a class in the core Earthborne icon set.
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
  "aspiration",
  "conditional",
]);

const BUCK_ICON_HTML = [
  '<span class="core-buck">',
  '<svg aria-hidden="true" focusable="false" viewBox="0 0 64 64">',
  '<path fill="currentColor" d="M32 6.5c1.7 0 3.2.9 4.1 2.4l22 38.2c1.8 3.2-.5 7.2-4.1 7.2H10c-3.7 0-5.9-4-4.1-7.2l22-38.2c.9-1.5 2.4-2.4 4.1-2.4Z"/>',
  "</svg>",
  "</span>",
].join("");

const OBJECTIVE_LINE_BREAK = "\u0000OBJECTIVE_LINE_BREAK\u0000";

export function splitMultiValue(s: string | null | undefined) {
  if (!s) return [];
  return s.split(/[./]/).reduce<string[]>((acc, curr) => {
    const value = curr.trim().replace(/^¬/, "");
    if (value) acc.push(value);
    return acc;
  }, []);
}

// Stub — ER has no faction color system; will be replaced with aspect colors.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getCardColor(card: Card, _prop = "color") {
  const aspect = card.energy_aspect ?? card.aspect_requirement_type;
  if (aspect) return `color-${aspect}`;
  return "color-neutral";
}

type CardBackType = "player" | "path" | "challenge" | "card";

const DEFAULT_PLAYER_CARD_BACK_URL = "/assets/ranger-card-back-art.png";
const DEFAULT_PATH_CARD_BACK_URL = "/assets/path-card-back-art.png";
const DEFAULT_CHALLENGE_CARD_BACK_URL = "/assets/challenge-card-back-art.png";

export function cardBackType(card: Card): CardBackType {
  if (card.double_sided) return "card";
  if (card.category_id === "challenge") return "challenge";
  if (card.category_id && card.category_id !== "ranger") return "path";
  return "player";
}

export function cardBackTypeUrl(card: Card) {
  const type = cardBackType(card);
  if (type === "player") return DEFAULT_PLAYER_CARD_BACK_URL;
  if (type === "path") return DEFAULT_PATH_CARD_BACK_URL;
  if (type === "challenge") return DEFAULT_CHALLENGE_CARD_BACK_URL;
  return `${import.meta.env.VITE_CARD_IMAGE_URL}/back_${type}.jpg`;
}

export function isLandscapeCard(card: Card) {
  return card.category_id === "location";
}

export function imageUrl(code: string) {
  return `${import.meta.env.VITE_CARD_IMAGE_URL}/${code}`;
}

export function cardImageUrl(source: string) {
  if (source.startsWith("/images/")) {
    const code = source.split("/").pop();
    return code ? imageUrl(code) : source;
  }
  if (/^(https?:)?\/\//.test(source) || source.startsWith("/")) {
    return source;
  }
  return imageUrl(source);
}

export function cardFrontImageSource(card: Card, useMiniRoleArt: boolean) {
  if (
    useMiniRoleArt &&
    card.type_code === "role" &&
    card.category_id === "ranger" &&
    card.alt_image_url
  ) {
    return card.alt_image_url;
  }

  return card.image_url ?? card.code;
}

export function cardFrontImageUrl(card: Card, useMiniRoleArt: boolean) {
  return cardImageUrl(cardFrontImageSource(card, useMiniRoleArt));
}

export function cardIllustrator(card: Card, useMiniRoleArt: boolean) {
  if (
    useMiniRoleArt &&
    card.type_code === "role" &&
    card.category_id === "ranger" &&
    card.alt_image_url &&
    card.alt_illustrator
  ) {
    return card.alt_illustrator;
  }

  return card.illustrator;
}

export function thumbnailUrl(code: string) {
  return `${import.meta.env.VITE_CARD_IMAGE_URL}/${code}?variant=thumb`;
}

export function parseCardTextHtml(
  cardText: string,
  opts?: {
    bullets?: boolean;
    newLines?: "replace" | "skip";
    packCode?: string;
    splitParagraphs?: boolean;
  },
) {
  let parsed = cardText;

  if (opts?.bullets) {
    parsed = parsed.replaceAll(/^\s?(-|–)/gm, `<i class="icon-bullet"></i>`);
  }

  if (opts?.splitParagraphs) {
    parsed = preserveObjectiveLineBreaks(parsed);
  }

  parsed = linkCampaignGuideEntries(parsed, opts?.packCode);

  parsed = parsed
    .replaceAll("<e>", '<span class="card-notable-event">')
    .replaceAll("</e>", "</span>")
    .replaceAll("<f>", '<span class="card-flavor-text">')
    .replaceAll("</f>", "</span>")
    .replaceAll("<o>", '<span class="card-objective-text">')
    .replaceAll("</o>", "</span>")
    .replaceAll("<c>", '<span class="card-choice-text">')
    .replaceAll("</c>", "</span>")
    .replaceAll(/<hr\s*\/?>/g, "<hr class='break'>")
    .replaceAll(/\[\[(.*?)\]\]/g, "<b><em>$1</em></b>")
    .replaceAll(/(\\?)\[((?:\w|_)+?)\]/g, (match, esc, token: string) => {
      if (esc === "\\") {
        return match.slice(1);
      }

      const t = token === "right_arrow" ? "conditional" : token;
      if (ER_INLINE_SVG_TOKENS.has(t)) {
        return BUCK_ICON_HTML;
      }
      if (ER_CORE_FONT_TOKENS.has(t)) {
        return `<span class="core-${t}"></span>`;
      }
      if (ER_STAT_TOKENS.has(t)) {
        return `<b class="color-${t}">${t}</b>`;
      }

      if (LEGACY_ICON_TOKENS.has(t)) {
        return `<i class="icon-${t}"></i>`;
      }

      return match;
    });

  parsed = parsed.replace(/(<l>[^<]*<\/l>)+/g, (group) => {
    const items = [...group.matchAll(/<l>([^<]*)<\/l>/g)].map((m) => m[1]);
    const cells = items
      .map((content) => formatLocationCellHtml(content))
      .join("");
    return `<span class="card-location-row" style="--location-cols: ${items.length}">${cells}</span>`;
  });

  if (opts?.splitParagraphs) {
    parsed = parsed
      .split(/\r?\n/)
      .map((line) => (/^<hr/.test(line.trim()) ? line : `<p>${line}</p>`))
      .join("")
      .replaceAll("<p></p>", "")
      .replaceAll(OBJECTIVE_LINE_BREAK, "<br>");
  } else if (opts?.newLines !== "skip") {
    parsed = parsed.replaceAll(/\r?\n/g, "<br>");
  }

  return parsed;
}

// Turns an inline `[guide] <id>` reference into a link to its campaign guide
// entry. Unresolved ids and escaped `\[guide]` tokens are left untouched so the
// generic token pass renders them as a plain icon.
function linkCampaignGuideEntries(content: string, packCode?: string) {
  return content.replace(
    /(\\?)\[guide\]\s?(\d+(?:\.\d+)?[A-Za-z]?)/g,
    (match, esc: string, entry: string) => {
      if (esc === "\\") return match;

      const href = getCampaignGuideEntryHrefById(entry, packCode);
      if (!href) return match;

      return `<a class="card-guide-link" href="${href}"><span class="core-guide"></span> ${entry}</a>`;
    },
  );
}

function preserveObjectiveLineBreaks(content: string) {
  return content.replace(/<o>([\s\S]*?)<\/o>/g, (match) =>
    match.replaceAll(/\r?\n/g, OBJECTIVE_LINE_BREAK),
  );
}

function formatLocationCellHtml(content: string) {
  const formatted = content.replace(
    /(^|\s)(\S)/g,
    '$1<span class="card-location-initial">$2</span>',
  );
  const symbolUrl =
    locationSymbolUrls[content as keyof typeof locationSymbolUrls] ??
    locationSymbolUrlsByNormalizedName[content.toLowerCase()];
  const symbol = symbolUrl
    ? `<img class="card-location-symbol" src="${symbolUrl}" alt="" aria-hidden="true" loading="lazy">`
    : "";

  return `<span class="card-location-cell">${symbol}<span class="card-location-name">${formatted}</span></span>`;
}

export function parseCustomizationTextHtml(customizationText: string) {
  return parseCardTextHtml(customizationText).replaceAll(/□/g, "");
}

export function parseCardTitle(title: string) {
  return title.replaceAll(/\[((?:\w|_)+?)\]/g, `<i class="icon-$1"></i>`);
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

export function cardLimit(card: Card, limitOverride?: number) {
  return limitOverride ?? card.deck_limit ?? 0;
}

export function cardUses(card: Card) {
  if (card.token_count != null && card.token_name) {
    return {
      count: card.token_count,
      name: card.token_name,
    };
  }
  return undefined;
}

export function displayAttribute(
  card: Card | undefined,
  key: "text" | "name" | "traits" | "flavor",
) {
  return card?.[key] ?? "";
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
