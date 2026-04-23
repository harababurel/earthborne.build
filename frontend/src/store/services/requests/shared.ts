export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
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
