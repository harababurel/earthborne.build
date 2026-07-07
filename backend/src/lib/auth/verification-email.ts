import type { Database } from "../../db/db.ts";
import {
  EMAIL_VERIFICATION_TOKEN_EXPIRY_HOURS,
  replaceVerificationToken,
} from "../../db/queries/auth/verification-tokens.ts";
import type { Config } from "../config.ts";
import type { Mailer } from "../email/mailer.ts";
import { verificationEmailTemplate } from "../email/templates.ts";
import { generateRandomToken, hashToken } from "./crypto.ts";

type SendVerificationEmailParams = {
  accountIdentityId: string;
  config: Config;
  email: string;
  mailer: Mailer;
};

export async function sendVerificationEmail(
  db: Database,
  params: SendVerificationEmailParams,
) {
  const token = generateRandomToken();

  await replaceVerificationToken(db, {
    accountIdentityId: params.accountIdentityId,
    email: params.email,
    tokenHash: hashToken(token),
    tokenType: "email_verification",
    expiryHours: EMAIL_VERIFICATION_TOKEN_EXPIRY_HOURS,
  });

  const template = verificationEmailTemplate({
    token,
    verificationUrl: `${params.config.FRONTEND_URL}/auth/verify-email?token=${token}`,
  });

  await params.mailer.send(params.email, template.subject, template.text);
}
