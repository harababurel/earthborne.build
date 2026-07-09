import type { Context, MiddlewareHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import type { HonoEnv } from "../hono-env.ts";

type Bucket = { count: number; resetAt: number };

type RateLimitOptions = {
  scope: string;
  limit: number;
  windowMs: number;
  bodyKey?: (body: Record<string, unknown>) => string | undefined;
};

const buckets = new Map<string, Bucket>();

setInterval(() => {
  const now = Date.now();

  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}, 60_000).unref();

export function rateLimit(
  options: RateLimitOptions,
): MiddlewareHandler<HonoEnv> {
  return async (c, next) => {
    const keys = [`${options.scope}:ip:${getClientIp(c) ?? "unknown"}`];

    if (options.bodyKey) {
      const body = await c.req.raw
        .clone()
        .json()
        .catch(() => undefined);
      const extra =
        body && typeof body === "object"
          ? options.bodyKey(body as Record<string, unknown>)
          : undefined;

      if (extra) {
        keys.push(`${options.scope}:key:${extra.toLowerCase()}`);
      }
    }

    const now = Date.now();

    for (const key of keys) {
      let bucket = buckets.get(key);

      if (!bucket || bucket.resetAt <= now) {
        bucket = { count: 0, resetAt: now + options.windowMs };
        buckets.set(key, bucket);
      }

      bucket.count += 1;

      if (bucket.count > options.limit) {
        c.header(
          "Retry-After",
          String(Math.ceil((bucket.resetAt - now) / 1000)),
        );
        throw new HTTPException(429, {
          message: "Too many attempts. Please try again later.",
        });
      }
    }

    await next();
  };
}

export function resetRateLimits() {
  buckets.clear();
}

function getClientIp(c: Context<HonoEnv>) {
  return (
    c.req.header("cf-connecting-ip") ??
    // Only trust this behind a reverse proxy; the email/key bucket still
    // throttles credential attacks if a direct client spoofs this header.
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim()
  );
}
