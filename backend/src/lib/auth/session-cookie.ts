import type { Context } from "hono";
import { deleteCookie, setCookie } from "hono/cookie";
import type { HonoEnv } from "../hono-env.ts";

export function setSessionCookie(c: Context<HonoEnv>, sessionToken: string) {
  const config = c.get("config");

  setCookie(c, config.SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: config.NODE_ENV === "production",
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
