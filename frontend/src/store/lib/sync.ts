import type { StoreApi } from "zustand";
import { ApiError } from "../services/requests/shared";
import type { StoreState } from "../slices";

export const syncAdapters = {};

export function disconnectProviderIfUnauthorized(
  _provider: never,
  err: unknown,
  set: StoreApi<StoreState>["setState"],
) {
  if (err instanceof ApiError && err.status === 401) {
    set((state) => ({
      connections: {
        ...state.connections,
        data: {
          ...state.connections.data,
          [_provider]: {
            ...state.connections.data[_provider],
            status: "disconnected",
          },
        },
      },
    }));
  }
}
