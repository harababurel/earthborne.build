import type { Metadata } from "../slices/metadata.types";

/**
 * ER has no local card patches — all card data comes from the backend.
 * This function is a no-op kept for API compatibility with app.ts.
 */
export function applyLocalData(metadata: Metadata): Metadata {
  return metadata;
}
