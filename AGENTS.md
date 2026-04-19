# Agent guide

Read this first if you are an AI agent (Claude Code, Gemini CLI, etc.) working in this repo.

## What this project is

`earthborne.build` is a web-based deckbuilder for **Earthborne Rangers**, a cooperative LCG. The codebase is adapted from [`arkham.build`](https://github.com/fspoettel/arkham.build) (AGPL-3.0). The Earthborne-specific schema, data pipeline, and rules reference are in place; some inherited arkham.build code paths still live in the frontend.

## Repo layout

`npm` workspace with three packages:

- `frontend/` — React 19 + Vite SPA
- `backend/` — Hono + SQLite (`better-sqlite3`) + Kysely; migrations via dbmate
- `shared/` — Zod schemas and DTOs used by both

Top-level helpers:

- `scripts/` — one-off Node scripts (e.g. the Living Valley docs scrapers)
- `docs/` — project documentation (see index below)

## Documentation index

Start with these:

- [`README.md`](./README.md) — install, common commands, dev flow
- [`docs/architecture.md`](./docs/architecture.md) — frontend/backend/data-pipeline overview
- [`docs/api.md`](./docs/api.md) — backend endpoints and env vars
- [`docs/metadata.md`](./docs/metadata.md) — card data sources and normalization
- [`docs/deployment.md`](./docs/deployment.md) — self-hosted deployment
- [`docs/translations.md`](./docs/translations.md) — i18n workflow
- [`docs/adaptation-plan.md`](./docs/adaptation-plan.md) — historical and ongoing arkham → earthborne adaptation
- [`docs/rules-reference-retrospective.md`](./docs/rules-reference-retrospective.md) — how the embedded `/rules` reference was built
- [`docs/card-data-issues.md`](./docs/card-data-issues.md) — known data quirks
- [`docs/scraper-caching-plan.md`](./docs/scraper-caching-plan.md) — pending plan for caching the Living Valley scrapers

`CLAUDE.md` exists for Claude-specific context but is also safe for other agents to read.

## Behavior

- Keep answers short and concise.
- Don't start implementing, designing, or modifying code unless explicitly asked to.
- When given a plan document to execute, follow it as written; do not invent extra scope.

## Code style

- Newspaper style: public/primary functions at the top of the file, private/utility functions at the bottom.
- Comment sparsely. Comments should explain the **why**, not the what.
- Match the surrounding code's style; do not introduce a new convention to fix a small thing.

## TypeScript rules

- Imports go at the top of the file. Valid exception: dynamic `import()`.
- No `any`. Prefer `unknown` or `never` when a narrow type cannot be provided.

## React rules

- No hardcoded UI text. Use `react-i18next` with a key in `frontend/src/locales/en.json`.
- No inline styles. Valid exception: dynamic CSS custom properties.

## Git conventions

- **Never** add `Co-Authored-By`, `Generated-By`, or any other trailer attributing commits to Claude, Gemini, or any AI tool. Commits must look like a human wrote them.
- Prefer new commits over `--amend`.
- Do not use `--no-verify`, `--no-gpg-sign`, or any flag that bypasses hooks/signing.
- Stage specific files; avoid `git add -A` / `git add .`.

## Verification before declaring work done

When you change code, run the scoped checks for whatever you touched:

- Lint: `npx biome check <files>` or `npm run lint` for everything
- Frontend typecheck: `npm run check -w frontend`
- Frontend build: `npm run build -w frontend`
- Backend typecheck: `npm run check -w backend`
- Backend tests: `npm run test -w backend`
- Shared tests: `npm run test -w shared`

Plans in `docs/` may also list their own per-task verification steps — follow those when present.
