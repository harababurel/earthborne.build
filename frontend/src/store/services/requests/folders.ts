import {
  type FolderResponse,
  FolderResponseSchema,
  type FolderWriteRequest,
  FolderWriteRequestSchema,
} from "@earthborne-build/shared";
import type { HttpClient } from "../http-client";
import { ApiError } from "./shared";

export class FoldersConflictError extends ApiError {
  remote: FolderResponse | null;

  constructor(error: ApiError) {
    super(error.message, error.status, error.cause);
    this.name = "FoldersConflictError";
    this.remote = parseConflictCause(error.cause);
  }
}

export async function fetchFolders(
  client: HttpClient,
): Promise<FolderResponse> {
  const res = await client.request("/v2/account/folders", {
    credentials: "include",
  });

  return FolderResponseSchema.parse(await res.json());
}

export async function putFolders(
  client: HttpClient,
  payload: FolderWriteRequest,
): Promise<FolderResponse> {
  try {
    const res = await client.request("/v2/account/folders", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(FolderWriteRequestSchema.parse(payload)),
      credentials: "include",
    });

    return FolderResponseSchema.parse(await res.json());
  } catch (error) {
    if (error instanceof ApiError && error.status === 409) {
      throw new FoldersConflictError(error);
    }

    throw error;
  }
}

export function isFoldersConflictError(
  error: unknown,
): error is FoldersConflictError {
  return error instanceof FoldersConflictError;
}

function parseConflictCause(cause: unknown): FolderResponse | null {
  const result = FolderResponseSchema.safeParse(cause);
  return result.success ? result.data : null;
}
