import {
  type DecklistSearchRequest,
  DecklistSearchRequestSchema,
  type DecklistSearchResponse,
  decodeSearch,
  encodeSearch,
} from "@arkham-build/shared";
import { apiV2Request } from "./shared";

export type DecklistsFiltersState = {
  filters: Omit<DecklistSearchRequest, "offset" | "limit">;
  limit: number;
  offset: number;
};

export async function searchDecklists(params: URLSearchParams) {
  const res = await apiV2Request(`/v2/public/decklists?${params.toString()}`);

  return res.json() as Promise<DecklistSearchResponse>;
}

export function deckSearchQuery(
  params: Partial<Omit<DecklistsFiltersState, "filters">> & {
    filters?: Partial<DecklistsFiltersState["filters"]>;
  },
  limit = 10,
) {
  const { filters, ...rest } = params;
  const search = encodeSearch({
    ...filters,
    ...rest,
    limit,
  });
  return search;
}

export function parseDeckSearchQuery(
  search: URLSearchParams,
): DecklistsFiltersState {
  const queries = Array.from(search.keys()).reduce(
    (acc, key) => {
      const values = search.getAll(key);
      acc[key] = values.length > 1 ? values : [values[0]];
      return acc;
    },
    {} as Record<string, string[]>,
  );

  const { limit, offset, ...filters } = decodeSearch(
    DecklistSearchRequestSchema,
    queries,
  );

  return {
    filters,
    limit,
    offset,
  };
}
