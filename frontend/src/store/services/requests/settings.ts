import {
  type SettingsResponse,
  SettingsResponseSchema,
  type SettingsWriteRequest,
  SettingsWriteRequestSchema,
} from "@earthborne-build/shared";
import type { HttpClient } from "../http-client";
import { ApiError } from "./shared";

export class SettingsConflictError extends ApiError {
  remote: SettingsResponse | null;

  constructor(error: ApiError) {
    super(error.message, error.status, error.cause);
    this.name = "SettingsConflictError";
    this.remote = parseConflictCause(error.cause);
  }
}

export async function fetchSettings(
  client: HttpClient,
): Promise<SettingsResponse> {
  const res = await client.request("/v2/account/settings", {
    credentials: "include",
  });

  return SettingsResponseSchema.parse(await res.json());
}

export async function putSettings(
  client: HttpClient,
  payload: SettingsWriteRequest,
): Promise<SettingsResponse> {
  try {
    const res = await client.request("/v2/account/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(SettingsWriteRequestSchema.parse(payload)),
      credentials: "include",
    });

    return SettingsResponseSchema.parse(await res.json());
  } catch (error) {
    if (error instanceof ApiError && error.status === 409) {
      throw new SettingsConflictError(error);
    }

    throw error;
  }
}

export function isSettingsConflictError(
  error: unknown,
): error is SettingsConflictError {
  return error instanceof SettingsConflictError;
}

function parseConflictCause(cause: unknown): SettingsResponse | null {
  const result = SettingsResponseSchema.safeParse(cause);
  return result.success ? result.data : null;
}
