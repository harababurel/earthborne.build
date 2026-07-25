import {
  CampaignBatchResponseSchema,
  type CampaignConflictResponse,
  CampaignConflictResponseSchema,
  type CampaignCreateRequest,
  CampaignCreateRequestSchema,
  CampaignVisibilityRequestSchema,
  type CampaignVisibilityResponse,
  CampaignVisibilityResponseSchema,
  type CampaignWriteRequest,
  CampaignWriteRequestSchema,
  type ItemBatchRequest,
  ItemBatchRequestSchema,
  type ItemDeleteRequest,
  ItemDeleteRequestSchema,
  type SyncedCampaign,
  type WriteResponse,
  WriteResponseSchema,
} from "@earthborne-build/shared";
import type { HttpClient } from "../http-client";
import { ApiError } from "./shared";

export class CampaignConflictError extends ApiError {
  remote: CampaignConflictResponse | null;

  constructor(error: ApiError) {
    super(error.message, error.status, error.cause);
    this.name = "CampaignConflictError";
    this.remote = parseConflictCause(error.cause);
  }
}

export async function fetchCampaignBatch(
  client: HttpClient,
  payload: ItemBatchRequest,
): Promise<SyncedCampaign[]> {
  const res = await client.request("/v2/account/campaigns/batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(ItemBatchRequestSchema.parse(payload)),
    credentials: "include",
  });

  const parsed = CampaignBatchResponseSchema.parse(await res.json());
  return parsed.campaigns;
}

export async function postCampaign(
  client: HttpClient,
  payload: CampaignCreateRequest,
): Promise<WriteResponse> {
  const res = await client.request("/v2/account/campaigns", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(CampaignCreateRequestSchema.parse(payload)),
    credentials: "include",
  });

  return WriteResponseSchema.parse(await res.json());
}

export async function putCampaign(
  client: HttpClient,
  id: string,
  payload: CampaignWriteRequest,
): Promise<WriteResponse> {
  try {
    const res = await client.request(`/v2/account/campaigns/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(CampaignWriteRequestSchema.parse(payload)),
      credentials: "include",
    });

    return WriteResponseSchema.parse(await res.json());
  } catch (error) {
    if (error instanceof ApiError && error.status === 409) {
      throw new CampaignConflictError(error);
    }

    throw error;
  }
}

export async function deleteCampaign(
  client: HttpClient,
  id: string,
  payload: ItemDeleteRequest,
): Promise<void> {
  try {
    await client.request(`/v2/account/campaigns/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ItemDeleteRequestSchema.parse(payload)),
      credentials: "include",
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 409) {
      throw new CampaignConflictError(error);
    }

    throw error;
  }
}

export async function fetchCampaignVisibility(
  client: HttpClient,
  id: string,
): Promise<CampaignVisibilityResponse> {
  const res = await client.request(`/v2/account/campaigns/${id}/visibility`, {
    credentials: "include",
  });

  return CampaignVisibilityResponseSchema.parse(await res.json());
}

export async function putCampaignVisibility(
  client: HttpClient,
  id: string,
  isPublic: boolean,
): Promise<CampaignVisibilityResponse> {
  const res = await client.request(`/v2/account/campaigns/${id}/visibility`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(
      CampaignVisibilityRequestSchema.parse({ public: isPublic }),
    ),
    credentials: "include",
  });

  return CampaignVisibilityResponseSchema.parse(await res.json());
}

export function isCampaignConflictError(
  error: unknown,
): error is CampaignConflictError {
  return error instanceof CampaignConflictError;
}

function parseConflictCause(cause: unknown): CampaignConflictResponse | null {
  const result = CampaignConflictResponseSchema.safeParse(cause);
  return result.success ? result.data : null;
}
