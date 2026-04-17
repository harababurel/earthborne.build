# Architecture

`earthborne.build` is a client-heavy single-page app. Most user data lives in the browser, while the backend provides canonical card metadata and a few supporting APIs.

## Frontend

- React SPA served from `frontend/dist`
- Local state persisted in IndexedDB
- Routing handled client-side with `wouter`
- Card data, pack metadata, and version checks fetched from the backend

The app was adapted from `arkham.build`, so some upstream sync/share/auth code paths still exist in the frontend. They are optional and depend on external legacy services, not on the local backend in this repo.

## Backend

The Node.js backend in `backend/` is responsible for:

- serving ingested Earthborne Rangers cards
- serving ingested pack metadata
- serving fan-made project info records
- serving locally hosted card images from disk
- reporting the ingested card count via `/version`

It is a single Hono service backed by SQLite. There are no separate Cloudflare functions, Postgres services, or background cron services in this repository.

## Data pipeline

Card data is pulled from a local checkout of `zzorba/rangers-card-data` and ingested into SQLite with `backend/src/scripts/ingest-cards.ts`.

Optional local image hosting is handled separately:

1. ingest card data into SQLite
2. run `download-images.ts` to mirror card art into `IMAGE_DIR`
3. expose `/images/:code` through the backend and reverse proxy

## Shared package

`shared/` contains schemas and DTOs used across the app, including:

- Earthborne Rangers card schema
- decklist and recommendation DTOs inherited from the upstream codebase
- fan-made project schemas

Not every shared type is backed by the current local backend; some remain for compatibility with inherited frontend code.
