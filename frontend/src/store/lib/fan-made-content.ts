import {
  type FanMadeCard,
  type FanMadeProject,
  FanMadeProjectSchema,
} from "@arkham-build/shared";
import { z } from "zod";
import type { Deck } from "@/store/schemas/deck.schema";
import {
  cardToApiFormat,
  cycleToApiFormat,
  packToApiFormat,
} from "@/utils/arkhamdb-json-format";
import type { StoreState } from "../slices";
import type { Metadata } from "../slices/metadata.types";
import { decodeDeckMeta } from "./deck-meta";
import type { DeckFanMadeContent } from "./types";

export function parseFanMadeProject(data: unknown): FanMadeProject {
  return z.parse(FanMadeProjectSchema, data);
}

export function validateFanMadeProject(project: FanMadeProject): void {
  const errors = [];

  const setCodes = new Set(project.data.sets.map((set) => set.code));
  const cards: Record<string, FanMadeCard> = {};

  for (const card of project.data.cards) {
    // Check that the card references a known set from the project.
    if (card.set_code && !setCodes.has(card.set_code)) {
      errors.push(
        `Card ${card.code} references unknown set: ${card.set_code}`,
      );
    }

    cards[card.code] = card;
  }

  if (errors.length) {
    const message = `${project.meta.name} failed validation.\n${errors.join("\n")}`;
    throw new Error(message);
  }
}

export function cloneMetadata(metadata: StoreState["metadata"]) {
  return {
    ...metadata,
    cards: { ...metadata.cards },
    encounterSets: { ...metadata.encounterSets },
    packs: { ...metadata.packs },
    cycles: { ...metadata.cycles },
  };
}

export function addProjectToMetadata(meta: Metadata, project: FanMadeProject) {
  // Create a synthetic cycle entry for the fan-made project.
  if (!meta.cycles[project.meta.code]) {
    meta.cycles[project.meta.code] = cycleToApiFormat({
      code: project.meta.code,
      name: project.meta.name,
      position: 999,
      official: false,
    });
  }

  // Create a synthetic pack entry for the fan-made project.
  const packCode = `fan_${project.meta.code}`;
  if (!meta.packs[packCode]) {
    meta.packs[packCode] = packToApiFormat({
      code: packCode,
      name: project.meta.name,
      cycle_code: project.meta.code,
      official: false,
      position: 1,
    });
  }

  for (const card of project.data.cards) {
    if (!meta.cards[card.code]) {
      meta.cards[card.code] = cardToApiFormat({
        ...card,
        pack_code: packCode,
      });
    }
  }
}

export function buildCacheFromDecks(decks: Deck[]) {
  return decks.reduce(
    (acc, deck) => {
      const meta = decodeDeckMeta(deck);

      const content = meta.fan_made_content;

      if (!content) return acc;

      if (content.cards) {
        for (const key of Object.keys(content.cards)) {
          acc.cards[key] = content.cards[key];
        }
      }

      if (content.cycles) {
        for (const key of Object.keys(content.cycles)) {
          acc.cycles[key] = content.cycles[key];
        }
      }

      if (content.packs) {
        for (const key of Object.keys(content.packs || {})) {
          acc.packs[key] = content.packs[key];
        }
      }

      if (content.encounter_sets) {
        for (const key of Object.keys(content.encounter_sets)) {
          acc.encounter_sets[key] = content.encounter_sets[key];
        }
      }

      return acc;
    },
    {
      cards: {},
      cycles: {},
      packs: {},
      encounter_sets: {},
    } as DeckFanMadeContent,
  );
}

export function extractHiddenSlots(deck: Deck, metadata: Metadata) {
  const meta = decodeDeckMeta(deck);

  const hiddenSlots: Record<string, unknown> = {
    slots: {},
    investigator_code: deck.investigator_code,
  };

  for (const key of ["slots", "sideSlots", "ignoreDeckLimitSlots"] as const) {
    const slots = Object.entries(deck[key] ?? {});
    if (!slots.length) continue;

    for (const [code, quantity] of slots) {
      const isFanMade = meta.fan_made_content?.cards?.[code];

      if (isFanMade) {
        (hiddenSlots[key] as Record<string, number>) ??= {};
        (hiddenSlots[key] as Record<string, number>)[code] = quantity;
        delete deck[key]?.[code];
      }
    }
  }

  meta.hidden_slots = hiddenSlots;
  deck.meta = JSON.stringify(meta);
}

export function applyHiddenSlots(deck: Deck, metadata: Metadata) {
  const meta = decodeDeckMeta(deck);
  if (!meta.hidden_slots) return;

  const hiddenSlots = meta.hidden_slots as Record<string, unknown>;

  for (const key of ["slots", "sideSlots", "ignoreDeckLimitSlots"] as const) {
    const slots = Object.entries(
      (hiddenSlots[key] as Record<string, number>) ?? {},
    );
    if (!slots.length) continue;

    for (const [code, quantity] of slots) {
      deck[key] ??= {};
      deck[key][code] = quantity;
    }
  }

  if (
    typeof hiddenSlots.investigator_code === "string" &&
    hiddenSlots.investigator_code !== deck.investigator_code
  ) {
    deck.investigator_code = hiddenSlots.investigator_code;
    deck.investigator_name =
      meta.fan_made_content?.cards?.[hiddenSlots.investigator_code as string]?.name ||
      metadata.cards[hiddenSlots.investigator_code as string]?.name ||
      deck.investigator_name;
  }

  delete meta.hidden_slots;
  deck.meta = JSON.stringify(meta);
}
