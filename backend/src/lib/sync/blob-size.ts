import { HTTPException } from "hono/http-exception";

export const MAX_REVISIONED_BLOB_BYTES = 64 * 1024;

export function assertRevisionedBlobSize(value: string, label: string) {
  if (Buffer.byteLength(value, "utf8") <= MAX_REVISIONED_BLOB_BYTES) return;

  throw new HTTPException(400, {
    message: `${label} is too large`,
  });
}
