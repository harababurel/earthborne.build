import { z } from "zod";
import {
  AchievementsResponseSchema,
  AchievementsStateSchema,
  FolderResponseSchema,
  FolderStateSchema,
  SettingsResponseSchema,
  SettingsStateSchema,
  SyncableCampaignSchema,
  SyncableDeckSchema,
  SyncedCampaignUploadSchema,
  SyncedDeckUploadSchema,
} from "./sync.schema.ts";

// Alphanumeric characters, underscore, and hyphen only.
export const PATTERN_VALID_USERNAME = "^[a-zA-Z0-9_\\-]+$";
export const PASSWORD_MAX_LENGTH = 255;
export const PATTERN_VALID_PASSWORD = ".{8,255}";

export const CanonicalEmailSchema = z
  .string()
  .trim()
  .pipe(z.email().max(255))
  .transform((email) => email.toLowerCase());

export const SignupRequestSchema = z.object({
  email: CanonicalEmailSchema,
  password: z.string().min(8).max(PASSWORD_MAX_LENGTH),
  captchaToken: z.string().min(1).max(2048).optional(),
});
export type SignupRequest = z.infer<typeof SignupRequestSchema>;

export const LoginRequestSchema = z.object({
  email: CanonicalEmailSchema,
  password: z.string().max(PASSWORD_MAX_LENGTH),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const CreateEmailIdentityRequestSchema = z.object({
  email: CanonicalEmailSchema,
  password: z.string().min(8).max(PASSWORD_MAX_LENGTH),
});
export type CreateEmailIdentityRequest = z.infer<
  typeof CreateEmailIdentityRequestSchema
>;

export const UpdateCredentialsRequestSchema = z
  .object({
    currentPassword: z.string().min(1).max(PASSWORD_MAX_LENGTH),
    newEmail: CanonicalEmailSchema.nullish(),
    newPassword: z.string().min(8).max(PASSWORD_MAX_LENGTH).nullish(),
  })
  .refine((value) => value.newEmail != null || value.newPassword != null, {
    message: "At least one credential change is required",
  });
export type UpdateCredentialsRequest = z.infer<
  typeof UpdateCredentialsRequestSchema
>;

export const ForgotPasswordRequestSchema = z.object({
  emailOrUsername: z
    .string()
    .trim()
    .min(1)
    .max(255)
    .transform((value) => (value.includes("@") ? value.toLowerCase() : value)),
});
export type ForgotPasswordRequest = z.infer<typeof ForgotPasswordRequestSchema>;

export const ResetPasswordRequestSchema = z.object({
  token: z.string(),
  password: z.string().min(8).max(PASSWORD_MAX_LENGTH),
});
export type ResetPasswordRequest = z.infer<typeof ResetPasswordRequestSchema>;

export const VerifyEmailRequestSchema = z.object({
  token: z.string(),
});
export type VerifyEmailRequest = z.infer<typeof VerifyEmailRequestSchema>;

export const ResendVerificationRequestSchema = z.object({
  email: CanonicalEmailSchema,
});
export type ResendVerificationRequest = z.infer<
  typeof ResendVerificationRequestSchema
>;

export const EmailIdentitySchema = z.object({
  provider: z.literal("email"),
  email: z.email().max(255).nullable(),
  pendingEmail: z.email().max(255).nullable(),
  verified: z.boolean(),
});
export type EmailIdentity = z.infer<typeof EmailIdentitySchema>;

export const IdentitySchema = EmailIdentitySchema;
export type Identity = z.infer<typeof IdentitySchema>;

export const SessionResponseSchema = z.object({
  account: z.object({
    id: z.uuid(),
    name: z.string().max(64),
    profileComplete: z.boolean(),
  }),
  identities: z.array(IdentitySchema),
});
export type SessionResponse = z.infer<typeof SessionResponseSchema>;

export const CompleteProfileRequestSchema = z.object({
  username: z.string().min(3).max(64).regex(new RegExp(PATTERN_VALID_USERNAME)),
  uploads: z
    .object({
      decks: z.array(SyncableDeckSchema).max(5000).optional(),
      campaigns: z.array(SyncableCampaignSchema).max(1000).optional(),
      folders: FolderStateSchema.optional(),
      settings: SettingsStateSchema.optional(),
      achievements: AchievementsStateSchema.optional(),
    })
    .optional(),
});
export type CompleteProfileRequest = z.infer<
  typeof CompleteProfileRequestSchema
>;

export const CompleteProfileResponseSchema = z.object({
  uploads: z
    .object({
      deckIdMap: z.record(z.string(), z.string()).optional(),
      campaignIdMap: z.record(z.string(), z.string()).optional(),
      decks: z.array(SyncedDeckUploadSchema).optional(),
      campaigns: z.array(SyncedCampaignUploadSchema).optional(),
      folders: FolderResponseSchema.optional(),
      settings: SettingsResponseSchema.optional(),
      achievements: AchievementsResponseSchema.optional(),
    })
    .optional(),
});
export type CompleteProfileResponse = z.infer<
  typeof CompleteProfileResponseSchema
>;
