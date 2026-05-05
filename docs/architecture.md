# Architecture

`earthborne.build` is a client-heavy single-page app. Most user data lives in the browser, while the backend provides canonical card metadata and a few supporting APIs.

## Frontend

- React SPA served from `frontend/dist`
- Local state persisted in IndexedDB
- Routing handled client-side with `wouter`
- Card data, pack and set metadata, fan-made project info, shared deck search, and version checks fetched from the backend

The app was adapted from `arkham.build`. Deck sharing is now handled by the local backend (`/v2/public/share`). Some other upstream sync/auth code paths still exist in the frontend but are not backed by any service in this repo.

### Deck validation

Deckbuilding validation is intentionally limited to starter construction. A starter deck must satisfy the Earthborne Rangers construction shape enforced by the creation wizard: exactly 30 cards, valid card copy limits, legal background/specialty access, 4 personality picks, 5 chosen-background picks, 5 chosen-specialty picks, and 1 outside-interest pick.

Once a valid starter deck receives a quantity edit, it is treated as evolved and starter construction validation is no longer enforced. Evolved decks are identified either by campaign state (`rewards`, `displaced`, or `maladies`) or by `meta.deckbuilding_state === "evolved"`. This matches campaign play, where the initial construction rules no longer constrain later deck changes.

## Backend

The Node.js backend in `backend/` is responsible for:

- serving ingested Earthborne Rangers cards, packs, and card sets
- deck sharing (create, read, update, delete)
- public shared deck search and directory
- serving fan-made project info records
- serving locally hosted card images from disk
- reporting the ingested card count and data timestamps via `/version`

It is a single Hono service backed by SQLite. There are no separate Cloudflare functions, Postgres services, or background cron services in this repository.

## Data pipeline

Card data is pulled from a local checkout of `harababurel/rangers-card-data` and ingested into SQLite with `backend/src/scripts/ingest-cards.ts`.

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
