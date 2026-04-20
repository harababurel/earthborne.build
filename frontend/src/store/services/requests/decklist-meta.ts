import {
  type DecklistMetaResponse,
  DecklistMetaResponseSchema,
} from "@arkham-build/shared";

export async function fetchArkhamDBDecklistMeta(
  _id: number,
): Promise<DecklistMetaResponse | undefined> {
  if (res.status === 404) return undefined;

  if (!res.ok) {
    throw new Error(`Failed to fetch decklist meta: ${res.statusText}`);
  }

  const json = await res.json();

  return DecklistMetaResponseSchema.parse(json);
}
