import { z } from "zod";

export const configSchema = z.object({
  ADMIN_API_KEY: z.string(),
  CORS_ORIGINS: z.string(),
  HOSTNAME: z.string().default("localhost"),
  IMAGE_DIR: z.string().optional(),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().min(1).max(65535),
  SQLITE_PATH: z.string().default("./earthborne.db"),
});

export type Config = z.infer<typeof configSchema>;

export function configFromEnv(
  overrides?: Record<string, string | number>,
): Config {
  const config = configSchema.parse({ ...process.env, ...overrides });
  return config;
}
