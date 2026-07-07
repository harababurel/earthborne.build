import type { Context, MiddlewareHandler } from "hono";
import { bodyLimit } from "hono/body-limit";

const DEFAULT_BODY_LIMIT_BYTES = 500 * 1024;
const COMPLETE_PROFILE_BODY_LIMIT_BYTES = 10 * 1024 * 1024;

export function bodyLimitMiddleware(): MiddlewareHandler {
  return (c, next) => {
    const maxSize = getBodyLimit(c);

    return bodyLimit({
      maxSize,
      onError: (c) => {
        c.status(413);
        return c.json({ message: "Request body is too large." });
      },
    })(c, next);
  };
}

function getBodyLimit(c: Context) {
  if (
    c.req.method === "POST" &&
    c.req.path === "/v2/account/auth/complete-profile"
  ) {
    return COMPLETE_PROFILE_BODY_LIMIT_BYTES;
  }

  return DEFAULT_BODY_LIMIT_BYTES;
}
