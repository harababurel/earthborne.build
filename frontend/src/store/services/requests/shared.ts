export class ApiError extends Error {
  status: number;
  override cause?: unknown;

  constructor(message: string, status: number, cause?: unknown) {
    super(message);
    this.status = status;
    this.cause = cause;
  }
}

export async function apiV2Request(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const res = await fetch(`${import.meta.env.VITE_API_URL}${path}`, options);

  if (!res.ok) {
    let message = res.statusText || `Request failed with status ${res.status}`;
    const contentType = res.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      try {
        const err = await res.json();
        if (err.message) {
          message = err.message;
        }
      } catch (_) {
        // Ignore JSON parse error, use default message.
      }
    } else if (contentType?.includes("text/html")) {
      message = `Server returned HTML instead of JSON. This might be a misconfigured API URL or a 404 error handled by the frontend. (Status: ${res.status})`;
    }
    throw new ApiError(message, res.status);
  }

  const contentType = res.headers.get("content-type");
  if (!contentType?.includes("application/json")) {
    throw new ApiError(
      `Expected JSON response but received ${contentType || "unknown"}. This usually indicates a routing issue.`,
      200,
    );
  }

  return res;
}

export async function requestApi(
  apiUrl: string,
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const { headers, ...restOptions } = options;
  const mergedHeaders = new Headers(headers);

  if (options.body && !mergedHeaders.has("Content-Type")) {
    mergedHeaders.set("Content-Type", "application/json");
  }

  const res = await fetch(`${apiUrl}${path}`, {
    ...restOptions,
    headers: mergedHeaders,
    credentials: "include",
  });

  if (!res.ok) {
    throw await createApiError(res);
  }

  return res;
}

async function createApiError(res: Response): Promise<ApiError> {
  const payload = await parseErrorPayload(res);
  const message = getErrorMessage(payload, res.statusText);
  const cause = getErrorCause(payload);

  return new ApiError(message, res.status, cause);
}

async function parseErrorPayload(res: Response): Promise<unknown> {
  const contentType = res.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    try {
      return await res.json();
    } catch {
      return null;
    }
  }

  try {
    const text = await res.text();
    return text ? { message: text } : null;
  } catch {
    return null;
  }
}

function getErrorMessage(payload: unknown, fallback: string): string {
  if (
    payload &&
    typeof payload === "object" &&
    "message" in payload &&
    typeof payload.message === "string"
  ) {
    return payload.message;
  }

  return fallback || "Request failed";
}

function getErrorCause(payload: unknown): unknown {
  if (payload && typeof payload === "object" && "cause" in payload) {
    return payload.cause;
  }

  return undefined;
}
