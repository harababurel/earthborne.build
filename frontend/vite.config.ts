/// <reference types="vitest/config" />
import { execFileSync } from "node:child_process";
import path from "node:path";
import react from "@vitejs/plugin-react";
import autoprefixer from "autoprefixer";
import { bundleStats } from "rollup-plugin-bundle-stats";
import { defineConfig, type Plugin } from "vite";

process.env.VITE_APP_BUILD ||= getAppBuild();
process.env.VITE_APP_BUILD_TIME ||= getAppBuildTime(process.env.VITE_APP_BUILD);
process.env.VITE_APP_BUILD_URL ||= getAppBuildUrl(process.env.VITE_APP_BUILD);

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
    esToolkitCompatEsm(),
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
      include: ["src/**/*.{ts,tsx}"],
      all: true,
      thresholds: {
        statements: 15,
        branches: 10,
        functions: 10,
        lines: 15,
      },
    },
  },
});

// recharts imports es-toolkit via deep paths (e.g. `es-toolkit/compat/get`),
// whose package export only ships a CommonJS shim — there is no `import`
// condition for the `./compat/*` subpath. Rolldown's CJS->ESM interop then
// miscompiles es-toolkit's internal require cycle into self-referential
// `var x = x()`, which throws "x is not a function" at runtime in production
// builds (dev is unaffected because it is not bundled this way). Redirect those
// deep imports to es-toolkit's ESM barrel, which Rolldown handles correctly and
// still tree-shakes down to the used functions.
function esToolkitCompatEsm(): Plugin {
  const prefix = "es-toolkit/compat/";
  const virtual = "\0es-toolkit-compat:";
  return {
    name: "es-toolkit-compat-esm",
    enforce: "pre",
    resolveId(id) {
      if (id.startsWith(prefix)) {
        const name = id.slice(prefix.length);
        if (name && !name.includes("/")) return virtual + name;
      }
      return null;
    },
    load(id) {
      if (id.startsWith(virtual)) {
        const name = id.slice(virtual.length);
        return `export { ${name} as default, ${name} } from "es-toolkit/compat";`;
      }
      return null;
    },
  };
}

function getAppBuild(): string {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim();
  } catch {
    return "development";
  }
}

function getAppBuildTime(build: string | undefined): string {
  const ref = build && build !== "development" ? build : "HEAD";

  try {
    return execFileSync("git", ["show", "-s", "--format=%cI", ref], {
      encoding: "utf8",
    }).trim();
  } catch {
    return new Date().toISOString();
  }
}

function getAppBuildUrl(build: string): string {
  if (build === "development") return "";

  try {
    const remoteUrl = execFileSync("git", ["remote", "get-url", "origin"], {
      encoding: "utf8",
    }).trim();
    const githubUrl = getGithubUrl(remoteUrl);

    return githubUrl ? `${githubUrl}/commit/${build}` : "";
  } catch {
    return "";
  }
}

function getGithubUrl(remoteUrl: string): string | null {
  const sshMatch = /^git@github\.com:(?<repo>[^/]+\/[^/]+?)(?:\.git)?$/.exec(
    remoteUrl,
  );
  const httpsMatch =
    /^https:\/\/github\.com\/(?<repo>[^/]+\/[^/]+?)(?:\.git)?$/.exec(
      remoteUrl,
    );
  const repo = sshMatch?.groups?.repo ?? httpsMatch?.groups?.repo;

  return repo ? `https://github.com/${repo}` : null;
}
