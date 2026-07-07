import { HTTPException } from "hono/http-exception";

export const MAX_REVISIONED_BLOB_BYTES = 64 * 1024;
export const MAX_SYNC_ITEM_BYTES = 2 * 1024 * 1024;

export function assertRevisionedBlobSize(value: string, label: string) {
  assertMaxBytes(value, MAX_REVISIONED_BLOB_BYTES, label);
}

export function assertSyncItemSize(value: string, label: string) {
  assertMaxBytes(value, MAX_SYNC_ITEM_BYTES, label);
}

function assertMaxBytes(value: string, maxBytes: number, label: string) {
  if (Buffer.byteLength(value, "utf8") <= maxBytes) return;

  throw new HTTPException(400, {
    message: `${label} is too large`,
  });
}
