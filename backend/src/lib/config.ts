import { z } from "zod";

export const configSchema = z.object({
  ADMIN_API_KEY: z.string(),
  CORS_ORIGINS: z.string(),
  FROM_EMAIL: z.email().default("noreply@earthborne.build"),
  FROM_NAME: z.string().default("earthborne.build"),
  FRONTEND_URL: z.url().default("http://localhost:3000"),
  HOSTNAME: z.string().default("localhost"),
  IMAGE_DIR: z.string().optional(),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().min(1).max(65535),
  SESSION_COOKIE_NAME: z.string().default("eb_session"),
  SESSION_EXPIRY_HOURS: z.coerce.number().int().positive().default(720),
  SMTP_HOST: z
    .string()
    .optional()
    .transform((value) => value?.trim() || undefined),
  SMTP_PASS: z.string().default(""),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(1025),
  SMTP_SECURE: booleanString(false),
  SMTP_USER: z.string().default(""),
  SQLITE_PATH: z.string().default("./earthborne.db"),
  TURNSTILE_SECRET_KEY: z
    .string()
    .optional()
    .transform((value) => value?.trim() || undefined),
});

export type Config = z.infer<typeof configSchema>;

export function configFromEnv(
  overrides?: Record<string, string | number>,
): Config {
  const config = configSchema.parse({ ...process.env, ...overrides });
  return config;
}

function booleanString(defaultValue: boolean) {
  return z
    .enum(["true", "false"])
    .default(defaultValue ? "true" : "false")
    .transform((value) => value === "true");
}
