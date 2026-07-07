import {
  DeckBatchResponseSchema,
  type DeckConflictResponse,
  DeckConflictResponseSchema,
  type DeckCreateRequest,
  DeckCreateRequestSchema,
  type DeckWriteRequest,
  DeckWriteRequestSchema,
  type ItemBatchRequest,
  ItemBatchRequestSchema,
  type ItemDeleteRequest,
  ItemDeleteRequestSchema,
  type SyncedDeck,
  type SyncManifestResponse,
  SyncManifestResponseSchema,
  type WriteResponse,
  WriteResponseSchema,
} from "@earthborne-build/shared";
import type { HttpClient } from "../http-client";
import { ApiError } from "./shared";

export class DeckConflictError extends ApiError {
  remote: DeckConflictResponse | null;

  constructor(error: ApiError) {
    super(error.message, error.status, error.cause);
    this.name = "DeckConflictError";
    this.remote = parseConflictCause(error.cause);
  }
}

export async function fetchSyncManifest(
  client: HttpClient,
): Promise<SyncManifestResponse> {
  const res = await client.request("/v2/account/sync/manifest", {
    credentials: "include",
  });

  return SyncManifestResponseSchema.parse(await res.json());
}

export async function fetchDeckBatch(
  client: HttpClient,
  payload: ItemBatchRequest,
): Promise<SyncedDeck[]> {
  const res = await client.request("/v2/account/decks/batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(ItemBatchRequestSchema.parse(payload)),
    credentials: "include",
  });

  const parsed = DeckBatchResponseSchema.parse(await res.json());
  return parsed.decks;
}

export async function postDeck(
  client: HttpClient,
  payload: DeckCreateRequest,
): Promise<WriteResponse> {
  const res = await client.request("/v2/account/decks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(DeckCreateRequestSchema.parse(payload)),
    credentials: "include",
  });

  return WriteResponseSchema.parse(await res.json());
}

export async function putDeck(
  client: HttpClient,
  id: string,
  payload: DeckWriteRequest,
): Promise<WriteResponse> {
  try {
    const res = await client.request(`/v2/account/decks/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(DeckWriteRequestSchema.parse(payload)),
      credentials: "include",
    });

    return WriteResponseSchema.parse(await res.json());
  } catch (error) {
    if (error instanceof ApiError && error.status === 409) {
      throw new DeckConflictError(error);
    }

    throw error;
  }
}

export async function deleteDeck(
  client: HttpClient,
  id: string,
  payload: ItemDeleteRequest,
): Promise<void> {
  try {
    await client.request(`/v2/account/decks/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ItemDeleteRequestSchema.parse(payload)),
      credentials: "include",
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 409) {
      throw new DeckConflictError(error);
    }

    throw error;
  }
}

export function isDeckConflictError(
  error: unknown,
): error is DeckConflictError {
  return error instanceof DeckConflictError;
}

function parseConflictCause(cause: unknown): DeckConflictResponse | null {
  const result = DeckConflictResponseSchema.safeParse(cause);
  return result.success ? result.data : null;
}
