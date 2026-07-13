import {
  BACKGROUND_TYPES,
  type BackgroundType,
  type Card,
  type RangersDbDeck,
  SPECIALTY_TYPES,
  type SpecialtyType,
} from "@earthborne-build/shared";

/**
 * Import of RangersDB decks, either fetched via their API (by id / URL) or
 * pasted as their plaintext/markdown deck export. Produces the state needed
 * to drop the user into the deck creation wizard's review step.
 */

export type DeckCreateImport = {
  name: string;
  aspectCode?: string;
  background?: BackgroundType;
  specialty?: SpecialtyType;
  roleCode?: string;
  personalitySlots: Record<string, number>;
  backgroundSlots: Record<string, number>;
  specialtySlots: Record<string, number>;
  outsideInterestSlots: Record<string, number>;
};

export type RangersDbImportIssue =
  | { type: "unknown_code"; value: string }
  | { type: "unmatched_card"; value: string }
  | { type: "unsupported_card"; value: string }
  | { type: "name_conflict"; value: string; theirs: string; ours: string }
  | { type: "missing_background"; value?: string }
  | { type: "missing_specialty"; value?: string }
  | { type: "missing_role"; value?: string }
  | { type: "missing_aspects" };

export type RangersDbImportResult = {
  payload: DeckCreateImport;
  issues: RangersDbImportIssue[];
  /** Identity (aspect, background, specialty, role) fully resolved. */
  valid: boolean;
};

export function parseRangersDbDeckId(input: string): number | undefined {
  const trimmed = input.trim();
  if (!trimmed) return undefined;

  if (/^\d+$/.test(trimmed)) {
    const id = Number.parseInt(trimmed, 10);
    return Number.isSafeInteger(id) && id > 0 ? id : undefined;
  }

  const match = trimmed.match(
    /^(?:https?:\/\/)?(?:www\.)?rangersdb\.com\/(?:[a-z-]+\/)?decks\/view\/(\d+)(?:[/?#]|$)/i,
  );

  return match ? Number.parseInt(match[1], 10) : undefined;
}

export function rangersDbDeckUrl(id: number) {
  return `https://rangersdb.com/decks/view/${id}`;
}

export function rangersDbDeckToImport(
  cards: Record<string, Card>,
  deck: RangersDbDeck,
): RangersDbImportResult {
  const issues: RangersDbImportIssue[] = [];

  const background = parseBackgroundType(deck.meta?.background ?? "");
  if (!background) {
    issues.push({
      type: "missing_background",
      value: deck.meta?.background ?? undefined,
    });
  }

  const specialty = parseSpecialtyType(deck.meta?.specialty ?? "");
  if (!specialty) {
    issues.push({
      type: "missing_specialty",
      value: deck.meta?.specialty ?? undefined,
    });
  }

  const roleCard = deck.meta?.role ? cards[deck.meta.role] : undefined;
  const roleCode = roleCard?.type_code === "role" ? roleCard.code : undefined;
  if (!roleCode) {
    issues.push({ type: "missing_role", value: deck.meta?.role ?? undefined });
  } else if (roleCard) {
    pushNameConflict(issues, roleCard, deck.cards?.[roleCard.code]);
  }

  const aspectCode =
    deck.awa != null && deck.spi != null && deck.fit != null && deck.foc != null
      ? findAspectCard(cards, {
          awa: deck.awa,
          spi: deck.spi,
          fit: deck.fit,
          foc: deck.foc,
        })
      : undefined;
  if (!aspectCode) {
    issues.push({ type: "missing_aspects" });
  }

  const payload: DeckCreateImport = {
    name: deck.name,
    aspectCode,
    background,
    specialty,
    roleCode,
    personalitySlots: {},
    backgroundSlots: {},
    specialtySlots: {},
    outsideInterestSlots: {},
  };

  for (const [code, quantity] of Object.entries(deck.slots ?? {})) {
    if (quantity <= 0) continue;

    const card = cards[code];
    if (!card) {
      issues.push({ type: "unknown_code", value: code });
      continue;
    }

    if (assignToSlots(payload, card, quantity)) {
      pushNameConflict(issues, card, deck.cards?.[code]);
    } else {
      issues.push({ type: "unsupported_card", value: card.name });
    }
  }

  return finalizeResult(payload, issues);
}

export function parseRangersDbDeckText(
  cards: Record<string, Card>,
  text: string,
): RangersDbImportResult {
  const issues: RangersDbImportIssue[] = [];
  const lines = text
    .split("\n")
    .map(stripMarkdown)
    .filter((line) => line && !/^-{3,}$/.test(line));

  const name = lines[0] ?? "";
  const rest = lines.slice(1);

  let backgroundValue: string | undefined;
  let specialtyValue: string | undefined;
  let roleValue: string | undefined;
  let aspects:
    | { awa: number; spi: number; fit: number; foc: number }
    | undefined;
  const cardLines: { name: string; quantity: number }[] = [];

  for (const line of rest) {
    const cardLine = line.match(/^(\d+)\s*x\s+(.+)$/i);
    if (cardLine) {
      cardLines.push({
        name: cardLine[2].trim(),
        quantity: Number.parseInt(cardLine[1], 10),
      });
      continue;
    }

    const statsLine = parseAspectStats(line);
    if (statsLine) {
      aspects ??= statsLine;
      continue;
    }

    // Identity header: "Traveler - Spirit Speaker - Keeper of the Grove".
    const identity = line.split(/\s+-\s+/);
    if (
      identity.length === 3 &&
      !backgroundValue &&
      parseBackgroundType(identity[0])
    ) {
      [backgroundValue, specialtyValue, roleValue] = identity;
      continue;
    }

    // Section headers ("Background: Traveler") as a fallback identity source.
    const section = line.match(/^(Background|Specialty):\s*(.+)$/i);
    if (section) {
      if (/background/i.test(section[1])) backgroundValue ??= section[2];
      else specialtyValue ??= section[2];
    }
  }

  const background = parseBackgroundType(backgroundValue ?? "");
  if (!background) {
    issues.push({ type: "missing_background", value: backgroundValue });
  }

  const specialty = parseSpecialtyType(specialtyValue ?? "");
  if (!specialty) {
    issues.push({ type: "missing_specialty", value: specialtyValue });
  }

  const roleCode = roleValue
    ? findCardByName(cards, roleValue, (card) => card.type_code === "role")
        ?.code
    : undefined;
  if (!roleCode) {
    issues.push({ type: "missing_role", value: roleValue });
  }

  const aspectCode = aspects ? findAspectCard(cards, aspects) : undefined;
  if (!aspectCode) {
    issues.push({ type: "missing_aspects" });
  }

  const payload: DeckCreateImport = {
    name,
    aspectCode,
    background,
    specialty,
    roleCode,
    personalitySlots: {},
    backgroundSlots: {},
    specialtySlots: {},
    outsideInterestSlots: {},
  };

  for (const { name: cardName, quantity } of cardLines) {
    const card = findCardByName(
      cards,
      cardName,
      (candidate) => !!candidate.category && candidate.type_code !== "role",
    );

    if (!card) {
      issues.push({ type: "unmatched_card", value: cardName });
      continue;
    }

    if (!assignToSlots(payload, card, quantity)) {
      issues.push({ type: "unsupported_card", value: card.name });
    }
  }

  return finalizeResult(payload, issues);
}

function finalizeResult(
  payload: DeckCreateImport,
  issues: RangersDbImportIssue[],
): RangersDbImportResult {
  return {
    payload,
    issues,
    valid:
      !!payload.name &&
      !!payload.aspectCode &&
      !!payload.background &&
      !!payload.specialty &&
      !!payload.roleCode,
  };
}

/**
 * Buckets a card into the deck creation slot groups. Personality cards and
 * cards from the chosen background/specialty go to their respective groups;
 * other background/specialty cards count as outside interest. Rewards and
 * maladies have no place in deck creation and are rejected.
 */
function assignToSlots(
  payload: DeckCreateImport,
  card: Card,
  quantity: number,
): boolean {
  if (card.type_code === "role" || card.type_code === "aspect") return false;

  if (card.category === "personality") {
    payload.personalitySlots[card.code] = quantity;
  } else if (
    payload.background &&
    card.background_type === payload.background
  ) {
    payload.backgroundSlots[card.code] = quantity;
  } else if (payload.specialty && card.specialty_type === payload.specialty) {
    payload.specialtySlots[card.code] = quantity;
  } else if (card.category === "background" || card.category === "specialty") {
    payload.outsideInterestSlots[card.code] = quantity;
  } else {
    return false;
  }

  return true;
}

/**
 * RangersDB tracks a different fork of `rangers-card-data`, so a shared code
 * may reference a different card there. The card is imported either way, but
 * the mismatch is surfaced so the user can double-check it during review.
 */
function pushNameConflict(
  issues: RangersDbImportIssue[],
  ours: Card,
  theirName: string | undefined,
) {
  if (!theirName) return;
  if (normalizeCardName(theirName) === normalizeCardName(ours.name)) return;

  issues.push({
    type: "name_conflict",
    value: ours.code,
    theirs: theirName,
    ours: ours.name,
  });
}

function findAspectCard(
  cards: Record<string, Card>,
  values: { awa: number; spi: number; fit: number; foc: number },
) {
  return Object.values(cards).find(
    (card) =>
      card.type_code === "aspect" &&
      card.aspect_awareness === values.awa &&
      card.aspect_spirit === values.spi &&
      card.aspect_fitness === values.fit &&
      card.aspect_focus === values.foc,
  )?.code;
}

function parseAspectStats(line: string) {
  const stats: Record<string, number> = {};

  for (const match of line.matchAll(/(\d+)\s*(AWA|SPI|FIT|FOC)/gi)) {
    stats[match[2].toUpperCase()] = Number.parseInt(match[1], 10);
  }

  if (Object.keys(stats).length !== 4) return undefined;

  return { awa: stats.AWA, spi: stats.SPI, fit: stats.FIT, foc: stats.FOC };
}

function parseBackgroundType(value: string): BackgroundType | undefined {
  const slug = slugify(value);
  return BACKGROUND_TYPES.find((type) => type === slug);
}

function parseSpecialtyType(value: string): SpecialtyType | undefined {
  const slug = slugify(value);
  return SPECIALTY_TYPES.find((type) => type === slug);
}

function findCardByName(
  cards: Record<string, Card>,
  name: string,
  predicate: (card: Card) => boolean,
) {
  const normalized = normalizeCardName(name);
  return Object.values(cards).find(
    (card) => predicate(card) && normalizeCardName(card.name) === normalized,
  );
}

function slugify(value: string) {
  return normalizeCardName(value).replace(/[^a-z0-9]+/g, "_");
}

function normalizeCardName(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function stripMarkdown(line: string) {
  return line
    .trim()
    .replace(/^[-*+]\s+/, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/(^|\s)_([^_]+)_(?=\s|$|[.,:;])/g, "$1$2")
    .trim();
}
