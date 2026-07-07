export interface EmailTemplate {
  subject: string;
  text: string;
}

type PasswordResetEmailParams = {
  resetUrl: string;
};

export function passwordResetEmailTemplate(
  params: PasswordResetEmailParams,
): EmailTemplate {
  return {
    subject: "Reset your earthborne.build password",
    text: `Password Reset Request

You requested to reset your earthborne.build password. Click the link below to continue:
${params.resetUrl}

This link will expire in 1 hour.

If you didn't request a password reset, you can safely ignore this email.`,
  };
}

type VerificationEmailParams = {
  token: string;
  verificationUrl: string;
};

export function verificationEmailTemplate(
  params: VerificationEmailParams,
): EmailTemplate {
  return {
    subject: "Verify your earthborne.build email address",
    text: `Welcome to earthborne.build!

Please verify your email address by clicking the link below:
${params.verificationUrl}

Or copy and paste this verification token:
${params.token}

This link and token will expire in 24 hours.`,
  };
}
