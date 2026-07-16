/// <reference types="vitest/config" />
import path from "node:path";
import { loadEnvFile } from "node:process";
import { defineConfig } from "vitest/config";

loadEnvFile(path.join(import.meta.dirname, ".env.test"));

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./src/tests/test-setup.ts"],
    hookTimeout: 60000,
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      all: true,
      thresholds: {
        statements: 60,
        branches: 40,
        functions: 75,
        lines: 60,
      },
    },
  },
});
