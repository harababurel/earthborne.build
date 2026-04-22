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
    try {
      const err = await res.json();
      if (err.message) {
        message = err.message;
      }
    } catch (_) {
      // Ignore JSON parse error, use default message.
    }
    throw new ApiError(message, res.status);
  }

  return res;
}
