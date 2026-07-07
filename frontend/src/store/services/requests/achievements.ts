import {
  type AchievementsResponse,
  AchievementsResponseSchema,
  type AchievementsWriteRequest,
  AchievementsWriteRequestSchema,
} from "@earthborne-build/shared";
import type { HttpClient } from "../http-client";
import { ApiError } from "./shared";

export class AchievementsConflictError extends ApiError {
  remote: AchievementsResponse | null;

  constructor(error: ApiError) {
    super(error.message, error.status, error.cause);
    this.name = "AchievementsConflictError";
    this.remote = parseConflictCause(error.cause);
  }
}

export async function fetchAchievements(
  client: HttpClient,
): Promise<AchievementsResponse | null> {
  try {
    const res = await client.request("/v2/account/achievements", {
      credentials: "include",
    });

    return AchievementsResponseSchema.parse(await res.json());
  } catch (error) {
    // 404 = the account has never saved this blob.
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export async function putAchievements(
  client: HttpClient,
  payload: AchievementsWriteRequest,
): Promise<AchievementsResponse> {
  try {
    const res = await client.request("/v2/account/achievements", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(AchievementsWriteRequestSchema.parse(payload)),
      credentials: "include",
    });

    return AchievementsResponseSchema.parse(await res.json());
  } catch (error) {
    if (error instanceof ApiError && error.status === 409) {
      throw new AchievementsConflictError(error);
    }

    throw error;
  }
}

export function isAchievementsConflictError(
  error: unknown,
): error is AchievementsConflictError {
  return error instanceof AchievementsConflictError;
}

function parseConflictCause(cause: unknown): AchievementsResponse | null {
  const result = AchievementsResponseSchema.safeParse(cause);
  return result.success ? result.data : null;
}
