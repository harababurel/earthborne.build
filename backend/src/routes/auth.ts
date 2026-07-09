import assert from "node:assert";
import { randomUUID } from "node:crypto";
import {
  type Campaign,
  type CompleteProfileRequest,
  CompleteProfileRequestSchema,
  CompleteProfileResponseSchema,
  type Deck,
  ForgotPasswordRequestSchema,
  LoginRequestSchema,
  ResendVerificationRequestSchema,
  ResetPasswordRequestSchema,
  SignupRequestSchema,
  UpdateCredentialsRequestSchema,
  VerifyEmailRequestSchema,
} from "@earthborne-build/shared";
import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { HTTPException } from "hono/http-exception";
import type { Transaction } from "kysely";
import { isUniqueIndexConstraintError } from "../db/db.helpers.ts";
import {
  accountNameExists,
  completeAccountProfile,
  createAccount,
  deleteAccount,
} from "../db/queries/auth/accounts.ts";
import {
  activatePendingAccountIdentityEmail,
  getAccountIdentity,
  getAccountIdentityByAccountId,
  getAccountIdentityByEmail,
  getAccountIdentityByEmailOrPendingEmail,
  getAccountIdentityByUsername,
  setPendingEmail,
  updateAccountIdentityVerified,
  updatePasswordHash,
} from "../db/queries/auth/identities.ts";
import {
  consumeVerificationToken,
  deleteVerificationTokensByAccountIdentityIdAndEmail,
  getVerificationTokenByHash,
  PASSWORD_RESET_TOKEN_EXPIRY_HOURS,
  replaceVerificationToken,
} from "../db/queries/auth/verification-tokens.ts";
import type { DB } from "../db/schema.types.ts";
import {
  assertEmailAvailable,
  assertVerificationTokenCooldown,
  isEmail,
  isVerificationTokenCooldownActive,
  throwInvalidResetTokenError,
} from "../lib/auth/assertions.ts";
import {
  DUMMY_PASSWORD_HASH,
  generateRandomToken,
  hashPassword,
  hashToken,
  verifyPassword,
} from "../lib/auth/crypto.ts";
import { rateLimit } from "../lib/auth/rate-limit.ts";
import { sessionAuth } from "../lib/auth/session-auth-middleware.ts";
import {
  clearSessionCookie as clearAuthSessionCookie,
  setSessionCookie,
} from "../lib/auth/session-cookie.ts";
import {
  createSession,
  deleteOtherSessionsByAccountId,
  deleteSession,
  deleteSessionsByAccountId,
} from "../lib/auth/sessions.ts";
import { assertTurnstileToken } from "../lib/auth/turnstile.ts";
import { sendVerificationEmail } from "../lib/auth/verification-email.ts";
import { chunkArray } from "../lib/chunk-array.ts";
import { passwordResetEmailTemplate } from "../lib/email/templates.ts";
import type { HonoEnv } from "../lib/hono-env.ts";
import {
  assertRevisionedBlobSize,
  assertSyncItemSize,
} from "../lib/sync/size-limits.ts";
import { zodValidator } from "../lib/validation.ts";

type CompleteProfileUploads = NonNullable<CompleteProfileRequest["uploads"]>;
type AuthTransaction = Transaction<DB>;

const router = new Hono<HonoEnv>();
const AUTH_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

router.post(
  "/signup",
  rateLimit({
    scope: "signup",
    limit: 5,
    windowMs: AUTH_RATE_LIMIT_WINDOW_MS,
    bodyKey: (body) => stringBodyValue(body, "email"),
  }),
  zodValidator("json", SignupRequestSchema),
  async (c) => {
    const db = c.get("db");
    const config = c.get("config");
    const { email, password, captchaToken } = c.req.valid("json");

    await assertTurnstileToken(c, captchaToken);
    await assertEmailAvailable(db, email);

    const passwordHash = await hashPassword(password);
    let accountIdentityId: string | null = null;

    try {
      await db.transaction().execute(async (tx) => {
        const { accountIdentity } = await createAccount(tx, {
          name: `email_${randomUUID()}`,
          email,
          passwordHash,
          profileCompletedAt: null,
        });
        accountIdentityId = accountIdentity.id;
      });
    } catch (error) {
      translateSignupConstraintError(error);
    }

    assert(accountIdentityId, "Account identity should exist after signup.");
    await sendVerificationEmail(db, {
      accountIdentityId,
      config,
      email,
      mailer: c.get("mailer"),
    });

    return new Response(null, { status: 201 });
  },
);

router.post(
  "/login",
  rateLimit({
    scope: "login",
    limit: 10,
    windowMs: AUTH_RATE_LIMIT_WINDOW_MS,
    bodyKey: (body) => stringBodyValue(body, "email"),
  }),
  zodValidator("json", LoginRequestSchema),
  async (c) => {
    const db = c.get("db");
    const config = c.get("config");
    const { email, password } = c.req.valid("json");

    const accountIdentity = await getAccountIdentityByEmail(db, email);
    const passwordHash = accountIdentity?.password_hash ?? DUMMY_PASSWORD_HASH;
    const passwordOk = await verifyPassword(password, passwordHash);

    if (
      !accountIdentity?.password_hash ||
      !accountIdentity.email ||
      !passwordOk
    ) {
      throw new HTTPException(401, { message: "Invalid email or password" });
    }

    if (!accountIdentity.verified_at) {
      throw new HTTPException(403, { message: "Account is not verified" });
    }

    const session = await createSession(
      db,
      accountIdentity.account_id,
      config.SESSION_EXPIRY_HOURS,
    );

    setSessionCookie(c, session.token);
    return new Response(null, { status: 200 });
  },
);

router.post(
  "/logout",
  sessionAuth({ requireCompleteProfile: false }),
  async (c) => {
    c.set("skipSessionCookieRefresh", true);

    const sessionToken = getCookie(c, c.get("config").SESSION_COOKIE_NAME);
    if (sessionToken) {
      await deleteSession(c.get("db"), sessionToken);
    }

    clearAuthSessionCookie(c);
    return new Response(null, { status: 200 });
  },
);

router.post(
  "/verify-email",
  rateLimit({
    scope: "verify-email",
    limit: 10,
    windowMs: AUTH_RATE_LIMIT_WINDOW_MS,
  }),
  zodValidator("json", VerifyEmailRequestSchema),
  async (c) => {
    const { token } = c.req.valid("json");

    await c
      .get("db")
      .transaction()
      .execute(async (tx) => {
        const verificationToken = await consumeVerificationToken(
          tx,
          hashToken(token),
          "email_verification",
        );

        if (!verificationToken?.account_identity_id) {
          throw new HTTPException(400, {
            message: "Invalid or expired verification token",
          });
        }

        const accountIdentity = await getAccountIdentity(
          tx,
          verificationToken.account_identity_id,
        );

        if (!accountIdentity) {
          throw new HTTPException(400, {
            message: "Invalid or expired verification token",
          });
        }

        if (accountIdentity.pending_email === verificationToken.email) {
          await assertEmailAvailable(
            tx,
            verificationToken.email,
            accountIdentity.id,
          );
          await activatePendingAccountIdentityEmail(
            tx,
            accountIdentity.id,
            verificationToken.email,
          );
          return;
        }

        if (accountIdentity.email !== verificationToken.email) {
          throw new HTTPException(400, {
            message: "Invalid or expired verification token",
          });
        }

        await updateAccountIdentityVerified(
          tx,
          verificationToken.account_identity_id,
        );
      });

    return new Response(null, { status: 200 });
  },
);

router.post(
  "/resend-verification",
  rateLimit({
    scope: "resend-verification",
    limit: 5,
    windowMs: AUTH_RATE_LIMIT_WINDOW_MS,
    bodyKey: (body) => stringBodyValue(body, "email"),
  }),
  zodValidator("json", ResendVerificationRequestSchema),
  async (c) => {
    const { email } = c.req.valid("json");
    const accountIdentity = await getAccountIdentityByEmailOrPendingEmail(
      c.get("db"),
      email,
    );

    const shouldResend =
      !!accountIdentity &&
      ((accountIdentity.email === email && !accountIdentity.verified_at) ||
        accountIdentity.pending_email === email);

    if (shouldResend) {
      const cooldownActive = await isVerificationTokenCooldownActive(
        c.get("db"),
        email,
        "email_verification",
      );

      if (!cooldownActive) {
        await sendVerificationEmail(c.get("db"), {
          accountIdentityId: accountIdentity.id,
          config: c.get("config"),
          email,
          mailer: c.get("mailer"),
        });
      }
    }

    return new Response(null, { status: 200 });
  },
);

router.post(
  "/forgot-password",
  rateLimit({
    scope: "forgot-password",
    limit: 5,
    windowMs: AUTH_RATE_LIMIT_WINDOW_MS,
    bodyKey: (body) => stringBodyValue(body, "emailOrUsername"),
  }),
  zodValidator("json", ForgotPasswordRequestSchema),
  async (c) => {
    const { emailOrUsername } = c.req.valid("json");
    const db = c.get("db");
    const accountIdentity = isEmail(emailOrUsername)
      ? await getAccountIdentityByEmail(db, emailOrUsername)
      : await getAccountIdentityByUsername(db, emailOrUsername);
    const email = accountIdentity?.email;

    if (accountIdentity?.verified_at && email) {
      const cooldownActive = await isVerificationTokenCooldownActive(
        db,
        email,
        "password_reset",
      );

      if (!cooldownActive) {
        const token = generateRandomToken();

        await replaceVerificationToken(db, {
          accountIdentityId: accountIdentity.id,
          email,
          tokenHash: hashToken(token),
          tokenType: "password_reset",
          expiryHours: PASSWORD_RESET_TOKEN_EXPIRY_HOURS,
        });

        const template = passwordResetEmailTemplate({
          resetUrl: `${c.get("config").FRONTEND_URL}/auth/reset-password?token=${encodeURIComponent(token)}`,
        });
        await c.get("mailer").send(email, template.subject, template.text);
      }
    }

    return new Response(null, { status: 200 });
  },
);

router.post(
  "/reset-password",
  rateLimit({
    scope: "reset-password",
    limit: 10,
    windowMs: AUTH_RATE_LIMIT_WINDOW_MS,
  }),
  zodValidator("json", ResetPasswordRequestSchema),
  async (c) => {
    const { token, password } = c.req.valid("json");
    const db = c.get("db");
    const tokenHash = hashToken(token);

    if (!(await getVerificationTokenByHash(db, tokenHash, "password_reset"))) {
      throwInvalidResetTokenError();
    }

    const passwordHash = await hashPassword(password);

    await db.transaction().execute(async (tx) => {
      const verificationToken = await consumeVerificationToken(
        tx,
        tokenHash,
        "password_reset",
      );

      if (!verificationToken?.account_identity_id) {
        throwInvalidResetTokenError();
      }

      const accountIdentity = await getAccountIdentity(
        tx,
        verificationToken.account_identity_id,
      );

      if (!accountIdentity) {
        throwInvalidResetTokenError();
      }

      await updatePasswordHash(tx, accountIdentity.id, passwordHash);
      await deleteSessionsByAccountId(tx, accountIdentity.account_id);
    });

    return new Response(null, { status: 200 });
  },
);

router.get("/me", sessionAuth({ requireCompleteProfile: false }), async (c) => {
  const account = c.get("account");
  const identity = await getAccountIdentityByAccountId(c.get("db"), account.id);

  return c.json({
    account: {
      id: account.id,
      name: account.name,
      profileComplete: account.profile_completed_at != null,
    },
    identities: identity
      ? [
          {
            provider: "email",
            email: identity.email,
            pendingEmail: identity.pending_email,
            verified: identity.verified_at != null,
          },
        ]
      : [],
  });
});

router.patch(
  "/credentials",
  sessionAuth(),
  zodValidator("json", UpdateCredentialsRequestSchema),
  async (c) => {
    const db = c.get("db");
    const account = c.get("account");
    const { currentPassword, newEmail, newPassword } = c.req.valid("json");
    const identity = await getAccountIdentityByAccountId(db, account.id);

    if (!identity?.email || !identity.password_hash) {
      throw new HTTPException(400, { message: "Email identity not found" });
    }

    if (!(await verifyPassword(currentPassword, identity.password_hash))) {
      throw new HTTPException(400, {
        message: "Current password is incorrect",
      });
    }

    const nextEmail =
      newEmail && newEmail !== identity.email ? newEmail : undefined;
    const currentToken = getCookie(c, c.get("config").SESSION_COOKIE_NAME);

    if (nextEmail) {
      await assertEmailAvailable(db, nextEmail, identity.id);
      await assertVerificationTokenCooldown(
        db,
        nextEmail,
        "email_verification",
      );
    }

    if (!nextEmail && !newPassword) {
      throw new HTTPException(400, {
        message: "No credential changes requested",
      });
    }

    const passwordHash = newPassword ? await hashPassword(newPassword) : null;
    const previousPendingEmail = identity.pending_email;

    await db.transaction().execute(async (tx) => {
      if (passwordHash) {
        await updatePasswordHash(tx, identity.id, passwordHash);

        if (currentToken) {
          await deleteOtherSessionsByAccountId(tx, account.id, currentToken);
        }
      }

      if (!nextEmail) return;

      if (previousPendingEmail && previousPendingEmail !== nextEmail) {
        await deleteVerificationTokensByAccountIdentityIdAndEmail(
          tx,
          identity.id,
          previousPendingEmail,
          "email_verification",
        );
      }

      await setPendingEmail(tx, identity.id, nextEmail);
    });

    if (nextEmail) {
      await sendVerificationEmail(db, {
        accountIdentityId: identity.id,
        config: c.get("config"),
        email: nextEmail,
        mailer: c.get("mailer"),
      });
    }

    return new Response(null, { status: 200 });
  },
);

router.delete("/credentials/pending-email", sessionAuth(), async (c) => {
  const account = c.get("account");
  const db = c.get("db");
  const identity = await getAccountIdentityByAccountId(db, account.id);

  if (!identity) {
    throw new HTTPException(400, { message: "Email identity not found" });
  }

  const pendingEmail = identity.pending_email;

  if (!pendingEmail) {
    throw new HTTPException(400, { message: "No pending email found" });
  }

  await db.transaction().execute(async (tx) => {
    await deleteVerificationTokensByAccountIdentityIdAndEmail(
      tx,
      identity.id,
      pendingEmail,
      "email_verification",
    );
    await setPendingEmail(tx, identity.id, null);
  });

  return new Response(null, { status: 200 });
});

router.delete(
  "/",
  sessionAuth({ requireCompleteProfile: false }),
  async (c) => {
    c.set("skipSessionCookieRefresh", true);
    await deleteAccount(c.get("db"), c.get("account").id);
    clearAuthSessionCookie(c);
    return new Response(null, { status: 204 });
  },
);

router.post(
  "/complete-profile",
  sessionAuth({ requireCompleteProfile: false }),
  zodValidator("json", CompleteProfileRequestSchema),
  async (c) => {
    const account = c.get("account");
    const payload = c.req.valid("json");

    if (account.profile_completed_at != null) {
      throw new HTTPException(409, {
        message: "Profile is already completed",
      });
    }

    const response = await c
      .get("db")
      .transaction()
      .execute(async (tx) => {
        if (await accountNameExists(tx, payload.username, account.id)) {
          throw new HTTPException(400, {
            message: "Username is already taken",
          });
        }

        const completed = await completeAccountProfile(
          tx,
          account.id,
          payload.username,
        );

        if (completed.numUpdatedRows === 0n) {
          throw new HTTPException(409, {
            message: "Profile is already completed",
          });
        }

        const uploads = await applyCompleteProfileUploads(
          tx,
          account.id,
          payload.uploads,
        );

        return CompleteProfileResponseSchema.parse({ uploads });
      });

    return c.json(response);
  },
);

export default router;

async function applyCompleteProfileUploads(
  db: AuthTransaction,
  accountId: string,
  uploads: CompleteProfileRequest["uploads"],
) {
  if (!uploads) return undefined;

  const deckUpload = await uploadAccountDecks(db, accountId, uploads.decks);
  const campaignUpload = await uploadAccountCampaigns(
    db,
    accountId,
    uploads.campaigns,
    deckUpload.deckIdMap,
  );
  const folders = await uploadFolders(
    db,
    accountId,
    uploads.folders,
    deckUpload.deckIdMap,
  );
  const settings = await uploadSettings(db, accountId, uploads.settings);
  const achievements = await uploadAchievements(
    db,
    accountId,
    uploads.achievements,
  );

  return {
    deckIdMap: deckUpload.deckIdMap,
    campaignIdMap: campaignUpload.campaignIdMap,
    decks: deckUpload.decks,
    campaigns: campaignUpload.campaigns,
    folders,
    settings,
    achievements,
  };
}

async function uploadAccountDecks(
  db: AuthTransaction,
  accountId: string,
  decks: Deck[] | undefined,
) {
  if (!decks?.length) return {};

  assertUniqueUploadedIds(decks, "Uploaded decks must have unique ids");
  const deckIdMap = await createItemIdMap(db, "account_deck", decks);
  const now = new Date().toISOString();
  const rows: { id: string; revision: string; data: string }[] = [];

  for (const chunk of chunkArray(decks, 500)) {
    rows.push(
      ...(await db
        .insertInto("account_deck")
        .values(
          chunk.map((deck) => {
            const mapped = remapDeck(deck, deckIdMap);
            const data = JSON.stringify(mapped);
            assertSyncItemSize(data, "Uploaded deck");
            return {
              id: String(mapped.id),
              account_id: accountId,
              revision: randomUUID(),
              data,
              created_at: parseUploadedTimestamp(mapped.date_creation, now),
              updated_at: parseUploadedTimestamp(mapped.date_update, now),
            };
          }),
        )
        .returning(["id", "revision", "data"])
        .execute()),
    );
  }

  return {
    deckIdMap: omitUnchangedMappings(deckIdMap),
    decks: rows.map((row) => ({
      data: JSON.parse(row.data),
      revision: row.revision,
    })),
  };
}

async function uploadAccountCampaigns(
  db: AuthTransaction,
  accountId: string,
  campaigns: Campaign[] | undefined,
  deckIdMap: Record<string, string> | undefined,
) {
  if (!campaigns?.length) return {};

  assertUniqueUploadedIds(campaigns, "Uploaded campaigns must have unique ids");
  const campaignIdMap = await createItemIdMap(
    db,
    "account_campaign",
    campaigns,
  );
  const now = new Date().toISOString();
  const rows: { id: string; revision: string; data: string }[] = [];

  for (const chunk of chunkArray(campaigns, 500)) {
    rows.push(
      ...(await db
        .insertInto("account_campaign")
        .values(
          chunk.map((campaign) => {
            const mapped = remapCampaign(campaign, campaignIdMap, deckIdMap);
            const data = JSON.stringify(mapped);
            assertSyncItemSize(data, "Uploaded campaign");
            return {
              id: String(mapped.id),
              account_id: accountId,
              revision: randomUUID(),
              data,
              created_at: parseUploadedTimestamp(mapped.date_creation, now),
              updated_at: parseUploadedTimestamp(mapped.date_update, now),
            };
          }),
        )
        .returning(["id", "revision", "data"])
        .execute()),
    );
  }

  return {
    campaignIdMap: omitUnchangedMappings(campaignIdMap),
    campaigns: rows.map((row) => ({
      data: JSON.parse(row.data),
      revision: row.revision,
    })),
  };
}

async function uploadFolders(
  db: AuthTransaction,
  accountId: string,
  folders: CompleteProfileUploads["folders"],
  deckIdMap: Record<string, string> | undefined,
) {
  if (!folders) return undefined;

  const revision = randomUUID();
  const state = remapFolderState(folders, deckIdMap);
  const serialized = serializeProfileBlob(state, "Folders");

  await db
    .insertInto("account_folder")
    .values({
      account_id: accountId,
      revision,
      state: serialized,
    })
    .onConflict((oc) => oc.column("account_id").doNothing())
    .execute();

  return { state, revision };
}

async function uploadSettings(
  db: AuthTransaction,
  accountId: string,
  settings: CompleteProfileUploads["settings"],
) {
  if (!settings) return undefined;

  const revision = randomUUID();
  const serialized = serializeProfileBlob(settings, "Settings");

  await db
    .insertInto("account_settings")
    .values({
      account_id: accountId,
      revision,
      settings: serialized,
    })
    .onConflict((oc) => oc.column("account_id").doNothing())
    .execute();

  return { settings, revision };
}

async function uploadAchievements(
  db: AuthTransaction,
  accountId: string,
  achievements: CompleteProfileUploads["achievements"],
) {
  if (!achievements) return undefined;

  const revision = randomUUID();
  const serialized = serializeProfileBlob(achievements, "Achievements");

  await db
    .insertInto("account_achievements")
    .values({
      account_id: accountId,
      revision,
      state: serialized,
    })
    .onConflict((oc) => oc.column("account_id").doNothing())
    .execute();

  return { state: achievements, revision };
}

async function createItemIdMap(
  db: AuthTransaction,
  table: "account_deck" | "account_campaign",
  items: { id: string | number }[],
) {
  const ids = items.map((item) => String(item.id));
  const existingIds = new Set<string>();
  for (const chunk of chunkArray(ids, 500)) {
    const rows = await db
      .selectFrom(table)
      .select(["id"])
      .where("id", "in", chunk)
      .execute();
    for (const row of rows) existingIds.add(row.id);
  }
  const reservedIds = new Set(ids);
  const idMap: Record<string, string> = {};

  for (const id of ids) {
    idMap[id] = existingIds.has(id)
      ? await createUniqueItemId(db, table, reservedIds)
      : id;
  }

  return idMap;
}

async function createUniqueItemId(
  db: AuthTransaction,
  table: "account_deck" | "account_campaign",
  reservedIds: Set<string>,
) {
  let id = randomUUID();

  while (reservedIds.has(id) || (await itemIdExists(db, table, id))) {
    id = randomUUID();
  }

  reservedIds.add(id);
  return id;
}

async function itemIdExists(
  db: AuthTransaction,
  table: "account_deck" | "account_campaign",
  id: string,
) {
  return !!(await db
    .selectFrom(table)
    .select(["id"])
    .where("id", "=", id)
    .executeTakeFirst());
}

function assertUniqueUploadedIds(
  items: { id: string | number }[],
  message: string,
) {
  const ids = new Set<string>();

  for (const item of items) {
    const id = String(item.id);

    if (ids.has(id)) {
      throw new HTTPException(400, { message });
    }

    ids.add(id);
  }
}

function parseUploadedTimestamp(value: string, fallback: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
}

function remapDeck(deck: Deck, deckIdMap: Record<string, string>): Deck {
  const id = deckIdMap[String(deck.id)];
  assert(id, `Missing mapped id for deck ${String(deck.id)}.`);
  return { ...deck, id, source: "account" };
}

function remapCampaign(
  campaign: Campaign,
  campaignIdMap: Record<string, string>,
  deckIdMap: Record<string, string> | undefined,
): Campaign {
  const id = campaignIdMap[String(campaign.id)];
  assert(id, `Missing mapped id for campaign ${String(campaign.id)}.`);

  return {
    ...campaign,
    id,
    deck_ids: campaign.deck_ids.map(
      (deckId) => deckIdMap?.[String(deckId)] ?? deckId,
    ),
    previous_campaign_id: remapOptionalId(
      campaign.previous_campaign_id,
      campaignIdMap,
    ),
    next_campaign_id: remapOptionalId(campaign.next_campaign_id, campaignIdMap),
  };
}

function remapOptionalId(
  id: string | number | null | undefined,
  idMap: Record<string, string>,
) {
  if (id == null) return id;
  return idMap[String(id)] ?? id;
}

function remapFolderState(
  folders: CompleteProfileUploads["folders"],
  deckIdMap: Record<string, string> | undefined,
) {
  assert(folders, "Missing folder state.");

  const deckFolders: NonNullable<
    CompleteProfileUploads["folders"]
  >["deckFolders"] = {};

  for (const [deckId, folderId] of Object.entries(folders.deckFolders)) {
    deckFolders[deckIdMap?.[deckId] ?? deckId] = folderId;
  }

  return {
    ...folders,
    deckFolders,
  };
}

function omitUnchangedMappings(idMap: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(idMap).filter(([from, to]) => from !== to),
  );
}

function serializeProfileBlob(value: unknown, label: string) {
  const serialized = JSON.stringify(value);
  assertRevisionedBlobSize(serialized, label);
  return serialized;
}

function stringBodyValue(body: Record<string, unknown>, key: string) {
  const value = body[key];
  return typeof value === "string" ? value : undefined;
}

export function translateSignupConstraintError(error: unknown): never {
  if (isUniqueIndexConstraintError(error)) {
    throw new HTTPException(400, {
      message: "An account is already registered for this email",
    });
  }

  throw error;
}
