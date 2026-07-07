import type { MiddlewareHandler } from "hono";
import { getCookie } from "hono/cookie";
import { HTTPException } from "hono/http-exception";
import { findAccountForAuth } from "../../db/queries/auth/accounts.ts";
import type { HonoEnv, SessionAuthHonoEnv } from "../hono-env.ts";
import { setSessionCookie } from "./session-cookie.ts";
import { getSession, updateSessionActivity } from "./sessions.ts";

type SessionAuthOptions = {
  requireCompleteProfile?: boolean;
};

export function sessionAuth(
  options: SessionAuthOptions = {},
): MiddlewareHandler<SessionAuthHonoEnv> {
  return async (c, next) => {
    const { requireCompleteProfile = true } = options;
    const config = c.get("config");
    const db = c.get("db");

    const sessionToken = getCookie(c, config.SESSION_COOKIE_NAME);

    if (!sessionToken) {
      throw new HTTPException(401, { message: "Unauthorized" });
    }

    const session = await getSession(db, sessionToken);

    if (!session) {
      throw new HTTPException(401, { message: "Invalid or expired session" });
    }

    const account = await findAccountForAuth(db, session.account_id);

    if (!account) {
      throw new HTTPException(401, { message: "Account not found" });
    }

    if (requireCompleteProfile && account.profile_completed_at == null) {
      throw new HTTPException(403, { message: "Profile completion required" });
    }

    await updateSessionActivity(
      db,
      sessionToken,
      session.account_id,
      config.SESSION_EXPIRY_HOURS,
    );

    c.set("session", session);
    c.set("account", account);

    await next();

    if (!c.get("skipSessionCookieRefresh")) {
      setSessionCookie(c, sessionToken);
    }
  };
}

export function optionalSessionAuth(): MiddlewareHandler<HonoEnv> {
  return async (c, next) => {
    const config = c.get("config");
    const db = c.get("db");

    const sessionToken = getCookie(c, config.SESSION_COOKIE_NAME);

    if (!sessionToken) {
      await next();
      return;
    }

    const session = await getSession(db, sessionToken);

    if (!session) {
      await next();
      return;
    }

    const account = await findAccountForAuth(db, session.account_id);

    if (!account) {
      await next();
      return;
    }

    await updateSessionActivity(
      db,
      sessionToken,
      session.account_id,
      config.SESSION_EXPIRY_HOURS,
    );

    c.set("session", session);
    c.set("account", account);

    await next();

    if (!c.get("skipSessionCookieRefresh")) {
      setSessionCookie(c, sessionToken);
    }
  };
}
