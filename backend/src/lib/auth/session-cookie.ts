import type { Context } from "hono";
import { deleteCookie, setCookie } from "hono/cookie";
import type { HonoEnv } from "../hono-env.ts";

export function setSessionCookie(c: Context<HonoEnv>, sessionToken: string) {
  const config = c.get("config");

  setCookie(c, config.SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    // Keyed off the public URL too, so a missing NODE_ENV on an HTTPS
    // deployment can't silently downgrade the session cookie.
    secure:
      config.NODE_ENV === "production" ||
      config.FRONTEND_URL.startsWith("https://"),
    sameSite: "Strict",
    maxAge: config.SESSION_EXPIRY_HOURS * 60 * 60,
    path: "/",
  });
}

export function clearSessionCookie(c: Context<HonoEnv>) {
  deleteCookie(c, c.get("config").SESSION_COOKIE_NAME, {
    path: "/",
  });
}
