# backend

Backend for `earthborne.build`.

## Overview

- Runtime: Node.js `24.x`
- Framework: [Hono](https://hono.dev/)
- Database: SQLite via [Kysely](https://kysely.dev/)
- Migrations: [dbmate](https://github.com/amacneil/dbmate)
- Tests: [Vitest](https://vitest.dev/)

The service currently exposes Earthborne Rangers card, pack, fan-made project info, image, health, and version endpoints. It does not include the old `arkham.build` Cloudflare, auth, share, or recommendation APIs.

## Commands

```sh
# typecheck
npm run check

# start in watch mode
npm run dev

# start with inspector
npm run dev:inspect

# run tests
npm run test

# apply SQLite migrations
npm run db:migrate

# ingest card data from a local rangers-card-data checkout
CARD_DATA_DIR=/path/to/rangers-card-data npm run ingest:cards

# download card images into IMAGE_DIR
IMAGE_DIR=/path/to/earthborne.images/cards npm run download:images
```

## Local setup

```sh
cp .env.example .env
npm install
npm run db:migrate
CARD_DATA_DIR=/path/to/rangers-card-data npm run ingest:cards
npm run dev
```

Useful files:

- `src/app.ts`: route registration
- `src/lib/config.ts`: env schema
- `src/db/migrations/`: SQLite schema history
- `config/yaak/`: API request workspace

## Deployment

For a simple Linux deployment with `systemd` and `nginx`, see:

- [docs/deployment.md](../docs/deployment.md)
- [docs/earthborne.service](../docs/earthborne.service)
- [docs/nginx.conf.example](../docs/nginx.conf.example)
