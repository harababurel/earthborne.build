/// <reference types="vitest/config" />
import path from "node:path";
import react from "@vitejs/plugin-react";
import autoprefixer from "autoprefixer";
import { bundleStats } from "rollup-plugin-bundle-stats";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    rolldownOptions: {
      output: {
        assetFileNames: "assets/[name].[hash][extname]",
        chunkFileNames: "assets/[name].[hash].js",
        entryFileNames: "assets/[name].[hash].js",
      },
    },
  },
  css: {
    postcss: {
      plugins: [autoprefixer()],
    },
  },
  plugins: [
    react(),
    bundleStats({
      baseline: true,
      silent: true,
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@test": path.resolve(__dirname, "../test"),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 3000,
    allowedHosts: true,
    proxy: {
      "/v2": "http://127.0.0.1:8686",
      "/admin": "http://127.0.0.1:8686",
      "/images": "http://127.0.0.1:8686",
      "/up": "http://127.0.0.1:8686",
      "/version": "http://127.0.0.1:8686",
    },
  },
  preview: {
    port: 3000,
  },
  test: {
    environment: "happy-dom",
    exclude: ["src/test/e2e/**", "node_modules/**"],
    setupFiles: "./src/test/setup.ts",
    passWithNoTests: true,
    coverage: {
      provider: "v8",
    },
  },
});
