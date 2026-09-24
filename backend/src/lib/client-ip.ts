import type { Context } from "hono";
import type { HonoEnv } from "./hono-env.ts";

// X-Real-IP is overwritten by the reverse proxy with $remote_addr, so clients
// cannot forge it. X-Forwarded-For and CF-Connecting-IP are passed through
// from the client and must not be trusted for rate limiting.
export function getClientIp(c: Context<HonoEnv>) {
  return c.req.header("x-real-ip")?.trim() || undefined;
}
