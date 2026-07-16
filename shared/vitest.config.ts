/// <reference types="vitest/config" />
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    coverage: {
      provider: "v8",
      include: ["src/**"],
      all: true,
      thresholds: {
        statements: 45,
        branches: 20,
        functions: 35,
        lines: 45,
      },
    },
  },
});
