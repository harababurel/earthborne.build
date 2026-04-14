import type {
  Card,
  FanMadeProject,
  FanMadeProjectInfo,
  SealedDeckResponse,
} from "@arkham-build/shared";
import {
  encodeSearch,
  type RecommendationsRequest,
  type RecommendationsResponse,
  RecommendationsResponseSchema,
} from "@arkham-build/shared";
import { assert } from "@/utils/assert";
import type { DataVersion } from "../schemas/data-version.schema";
import { type Deck, type Id, isDeck } from "../schemas/deck.schema";
import type { Pack } from "../schemas/pack.schema";
import type { History } from "../selectors/decks";
import type { Locale } from "../slices/settings.types";
import { ApiError, apiV2Request } from "./requests/shared";

/**
 * ER metadata response — packs only (no cycles, encounter sets, or taboo sets).
 */
export type MetadataResponse = {
  pack: Pack[];
};

export type DataVersionResponse = DataVersion;

export type AllCardResponse = Card[];

/**
 * ER API — metadata (packs)
 */

export async function queryMetadata(
  _locale: Locale = "en",
): Promise<MetadataResponse> {
  const res = await apiV2Request("/v2/public/packs");
  const { data }: { data: Array<{ id: string; name: string; short_name: string | null; position: number }> } = await res.json();

  const packs: Pack[] = data.map((p) => ({
    code: p.id,
    // ER has no cycles; use pack code as cycle_code placeholder.
    cycle_code: p.id,
    real_name: p.name,
    name: p.short_name ?? p.name,
    position: p.position,
    official: true,
  }));

  return { pack: packs };
}

export async function queryDataVersion(
  _locale: Locale = "en",
): Promise<DataVersion> {
  const res = await apiV2Request("/version");
  const { card_count }: { card_count: number } = await res.json();

  return {
    card_count,
    cards_updated_at: "2026-04-13T00:00:00",
    locale: "en",
    translation_updated_at: "2026-04-13T00:00:00",
  };
}

export async function queryCards(_locale: Locale = "en"): Promise<Card[]> {
  const res = await apiV2Request("/v2/public/cards");
  const { data }: { data: Card[] } = await res.json();
  return data;
}

/**
 * Public API
 */

type DeckResponse = {
  data: Deck;
  type: "deck" | "decklist";
};

export async function importDeck(clientId: string, input: string) {
  const res = await apiV2Request(
    `/public/import?q=${encodeURIComponent(input)}`,
    {
      headers: {
        "X-Client-Id": clientId,
      },
      method: "POST",
    },
  );

  const data: DeckResponse = await res.json();

  if (!isDeck(data.data)) {
    throw new Error("Could not import deck: invalid deck format.");
  }

  return data;
}

type ShareRead = {
  data: Deck;
  history: History;
};

export async function getShare(id: string): Promise<ShareRead> {
  const res = await apiV2Request(`/public/share_history/${id}`);
  const data = await res.json();
  return data;
}

export async function createShare(
  clientId: string,
  deck: Deck,
  history: History,
) {
  await apiV2Request("/public/share", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Client-Id": clientId,
    },
    body: JSON.stringify({ ...deck, history }),
  });
}

export async function updateShare(
  clientId: string,
  id: string,
  deck: Deck,
  history: History,
) {
  await apiV2Request(`/public/share/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-Client-Id": clientId,
    },
    body: JSON.stringify({
      ...deck,
      history,
    }),
  });
}

export async function deleteShare(clientId: string, id: string) {
  await apiV2Request(`/public/share/${id}`, {
    method: "DELETE",
    headers: {
      "X-Client-Id": clientId,
    },
  });
}

/**
 * Authenticated API
 */

function authenticatedRequest(path: string, options?: RequestInit) {
  return apiV2Request(path, {
    ...options,
    credentials: "include",
  });
}

type DecksResponse = {
  data: Deck[];
  lastModified: string | undefined;
};

export async function getDecks(
  clientId: string,
  lastSyncedDate?: string,
): Promise<DecksResponse | undefined> {
  const headers: Record<string, string> = {
    "X-Client-Id": clientId,
  };

  if (lastSyncedDate) {
    headers["If-Modified-Since"] = lastSyncedDate;
  }

  const res = await authenticatedRequest("/user/decks", { headers });

  return res.status === 304
    ? undefined
    : {
        data: await res.json(),
        lastModified: res.headers.get("Last-Modified")?.toString(),
      };
}

export async function newDeck(
  clientId: string,
  payload: Record<string, unknown>,
): Promise<Deck> {
  const res = await authenticatedRequest("/user/decks", {
    headers: {
      "Content-Type": "application/json",
      "X-Client-Id": clientId,
    },
    body: JSON.stringify({
      investigator: payload.investigator_code,
      name: payload.name,
      slots: payload.slots,
      meta: payload.meta,
    }),
    method: "POST",
  });

  return await res.json();
}

export async function updateDeck(
  clientId: string,
  deck: Record<string, unknown>,
): Promise<Deck> {
  const res = await authenticatedRequest(`/user/decks/${deck.id}`, {
    headers: {
      "Content-Type": "application/json",
      "X-Client-Id": clientId,
    },
    body: JSON.stringify(deck),
    method: "PUT",
  });

  return await res.json();
}

export async function deleteDeck(
  clientId: string,
  id: Id,
  allVersions?: boolean,
) {
  const path = `/user/decks/${id}`;

  await authenticatedRequest(allVersions ? `${path}?all=true` : path, {
    headers: {
      "X-Client-Id": clientId,
    },
    body: allVersions ? JSON.stringify({ all: true }) : undefined,
    method: "DELETE",
  });
}

export async function upgradeDeck(
  clientId: string,
  id: Id,
  payload: {
    xp: number;
    exiles?: string;
    meta?: string;
  },
) {
  const res = await authenticatedRequest(`/user/decks/${id}/upgrade`, {
    headers: {
      "Content-Type": "application/json",
      "X-Client-Id": clientId,
    },
    body: JSON.stringify(payload),
    method: "POST",
  });

  return await res.json();
}

export async function getRecommendations(
  req: RecommendationsRequest,
): Promise<RecommendationsResponse["data"]["recommendations"]> {
  const search = encodeSearch(req).toString();

  const res = await apiV2Request(
    `/v2/public/recommendations/${req.aspect_code}?${search}`,
    {
      method: "GET",
    },
  );

  const json = await res.json();
  return RecommendationsResponseSchema.parse(json).data.recommendations;
}

export async function querySealedDeck(id: string): Promise<SealedDeckResponse> {
  const res = await apiV2Request(`/v2/public/sealed-deck/${id}`);
  return await res.json();
}

export async function queryFanMadeProjects(): Promise<FanMadeProjectInfo[]> {
  const res = await apiV2Request("/v2/public/fan-made-project-info");
  const { data }: { data: FanMadeProjectInfo[] } = await res.json();
  return data.sort((a, b) => {
    return a.meta.name.localeCompare(b.meta.name);
  });
}

// ER has no ArkhamDB deck import. Stub for call-site compatibility.
export async function queryDeck(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _clientId: string | undefined,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _type: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _id: number,
): Promise<unknown[]> {
  return [];
}

export async function queryFanMadeProjectData(
  bucketPath: string,
): Promise<FanMadeProject> {
  const res = await fetch(
    `${import.meta.env.VITE_CARD_IMAGE_URL}/${bucketPath}?nonce=${Date.now()}`,
  );

  assert(res.ok, `Failed to fetch ${bucketPath}`);
  const data = await res.json();
  return data;
}
