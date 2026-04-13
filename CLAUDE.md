# earthborne.build — Claude Code Context

## What this project is

A web-based deckbuilder for **Earthborne Rangers**, the cooperative LCG by Earthborne Games. This codebase is adapted from [arkham.build](https://github.com/fspoettel/arkham.build), an open-source deckbuilder for Arkham Horror: The Card Game, licensed under AGPL-3.0.

The goal is a full-featured deckbuilder at **earthborne.build** — card browsing, deck creation, deck sharing, local storage, all tailored to Earthborne Rangers.

## Project status

This is an early-stage adaptation. The codebase is the original arkham.build source. The bulk of the Arkham-specific game logic, schema, and terminology still needs to be replaced with Earthborne Rangers equivalents.

See `docs/adaptation-plan.md` for the full analysis of what needs changing and the recommended order of work.

## Tech stack

- **Frontend**: React 19 + TypeScript + Vite, Zustand (state), TanStack Query (data fetching), Wouter (routing), react-i18next (i18n)
- **Backend**: Hono (Node.js HTTP framework) + PostgreSQL + Kysely
- **Monorepo**: npm workspaces — `frontend/`, `backend/`, `shared/`, `functions/`
- **Infra**: Cloudflare Pages/Functions (frontend + OG previews), Kamal + DigitalOcean (backend)
- **Testing**: Vitest (unit), Playwright (E2E), Testcontainers (backend integration)
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
