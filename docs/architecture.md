# Architecture

`earthborne.build` is a client-heavy single-page app. Anonymous user data lives
in the browser; logged-in users can sync decks, campaigns, folders, settings,
and achievements to the backend account store.

## Frontend

- React SPA served from `frontend/dist`
- Local state persisted in IndexedDB
- Routing handled client-side with `wouter`
- Card data, pack and set metadata, fan-made project info, shared deck search,
  account auth, and account sync fetched from the backend

The app was adapted from `arkham.build`. Deck sharing and account sync are now
handled by the local backend.

### Deck validation

Deckbuilding validation is intentionally limited to starter construction. A starter deck must satisfy the Earthborne Rangers construction shape enforced by the creation wizard: exactly 30 cards, valid card copy limits, legal background/specialty access, 4 personality picks, 5 chosen-background picks, 5 chosen-specialty picks, and 1 outside-interest pick.

Once a valid starter deck receives a quantity edit, it is treated as evolved and starter construction validation is no longer enforced. Evolved decks are identified either by campaign state (`rewards`, `displaced`, or `maladies`) or by `meta.deckbuilding_state === "evolved"`. This matches campaign play, where the initial construction rules no longer constrain later deck changes.

## Backend

The Node.js backend in `backend/` is responsible for:

- serving ingested Earthborne Rangers cards, packs, and card sets
- email/password account signup, verification, login, session management,
  credentials updates, and account deletion
- account sync for decks, campaigns, folders, settings, and achievements
- deck sharing (create, read, update, delete)
- public shared deck search and directory, including account author attribution
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

## Account sync

Account sessions are stored server-side in SQLite and exposed to the browser as
HTTP-only cookies. Account routes use credentialed CORS, so frontend requests to
`/v2/account/*` and account-owned share writes send `credentials: "include"`.

Synced decks and campaigns are stored as JSON payloads with per-item revisions.
Folders, settings, and achievements are revisioned account blobs. The frontend
bootstraps an authenticated session by comparing local sync state to the
server manifest, pulling remote changes, pushing local-only data, and surfacing
revision conflicts for user resolution.

## Shared package

`shared/` contains schemas and DTOs used across the app, including:

- Earthborne Rangers card schema
- decklist, account auth, profile, and sync DTOs
- fan-made project schemas
