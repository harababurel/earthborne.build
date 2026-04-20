import type { StoreApi } from "zustand";
import { ApiError } from "../services/requests/shared";
import type { StoreState } from "../slices";
import type { Provider } from "../slices/connections.types";

export const syncAdapters = {};

export function disconnectProviderIfUnauthorized(
  provider: Provider,
  err: unknown,
  set: StoreApi<StoreState>["setState"],
) {
  if (err instanceof ApiError && err.status === 401) {
    set((state) => ({
      connections: {
        ...state.connections,
        data: {
          ...state.connections.data,
          [provider]: {
            ...state.connections.data[provider],
            status: "disconnected",
          },
        },
      },
    }));
  }
}
