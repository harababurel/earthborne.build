# earthborne.build — Claude Code Context

## What this project is

A web-based deckbuilder for **Earthborne Rangers**, the cooperative LCG by Earthborne Games. This codebase is adapted from [arkham.build](https://github.com/fspoettel/arkham.build), an open-source deckbuilder for Arkham Horror: The Card Game, licensed under AGPL-3.0.

The goal is a full-featured deckbuilder at **earthborne.build** — card browsing, deck creation, deck sharing, local storage, all tailored to Earthborne Rangers.

## Project status

Phases 1–3 of the adaptation are complete (schema, ArkhamDB removal, card data pipeline). The Earthborne Rangers card schema, ingestion, and SQLite-backed API are in place; the frontend still contains some inherited arkham.build code paths that have not yet been migrated.

See `docs/adaptation-plan.md` for the full analysis and per-phase status.

## Tech stack

- **Frontend**: React 19 + TypeScript + Vite, Zustand (state), TanStack Query (data fetching), Wouter (routing), react-i18next (i18n)
- **Backend**: Hono (Node.js HTTP framework) + SQLite (better-sqlite3) + Kysely; migrations via dbmate
- **Monorepo**: npm workspaces — `frontend/`, `backend/`, `shared/`
- **Infra**: self-hosted Linux (systemd + nginx); see `docs/deployment.md`
- **Testing**: Vitest (unit), Playwright (E2E)
- **Tooling**: Biome (lint/format), Lefthook (git hooks)

## Code conventions (inherited from arkham.build, keep these)

- Newspaper style: public functions first, utilities/helpers at the bottom of the file
- No hardcoded UI text — all user-visible strings go through react-i18next
- No inline styles except dynamic CSS custom properties
- No `any` types; prefer `unknown` or concrete types
- Sparse comments explaining *why*, not *what*
- No mocking the database in integration tests

## Git conventions

- Never add `Co-Authored-By`, `Generated-By`, or any other trailer/tag attributing commits to Claude, AI, or any AI-related tool. Commits should look like they were written by a human developer.

## Key directories

```
frontend/src/
  pages/          # Route-level page components
  components/     # Reusable UI components
  store/          # Zustand state + slices
  store/lib/      # Core game logic: deck validation, filtering, BuildQL
  locales/        # i18n translation files
shared/src/
  schemas/        # Zod schemas (card, decklist, etc.) — primary adaptation target
  dtos/           # API request/response types
backend/src/
  routes/         # API endpoints
  db/             # Kysely queries, migrations, seeds
```

## Adaptation priorities

When working on this project, follow the schema-first order described in `docs/adaptation-plan.md`. Do not rework UI components before the underlying data model is settled.

## License

AGPL-3.0. The source must remain publicly available. Retain original copyright notices and note modifications.
