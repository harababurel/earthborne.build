# API

The backend is a small Node.js service built with Hono. It uses SQLite for storage and exposes a small set of Earthborne-specific endpoints.

## Base routes

- `GET /up`
  Health check. Returns `ok`.

- `GET /version`
  Returns the current ingested data version payload:

  ```json
  {
    "card_count": 260,
    "cards_updated_at": "2026-04-29T12:00:00.000Z",
    "locale": "en",
    "translation_updated_at": "2026-04-29T12:00:00.000Z"
  }
  ```

## Public API

All public data endpoints live under `/v2/public`.

### Cards

- `GET /v2/public/cards`
  Returns all ingested cards as `{ data: Card[] }`.

- `GET /v2/public/cards/:code`
  Returns a single card by code.
  Returns `404` if the card does not exist.

### Packs

- `GET /v2/public/packs`
  Returns all ingested packs as `{ data: Pack[] }`.

### Card sets

- `GET /v2/public/sets`
  Returns all ingested card sets as `{ data: CardSet[] }`.

### Deck sharing

- `POST /v2/public/share`
  Creates a new shared deck. Returns the created `Decklist` record with its `id`.

- `GET /v2/public/share/history/:id`
  Returns the shared deck with the given `id`, or `404` if not found.

- `PUT /v2/public/share/:id`
  Updates an existing shared deck. Requires the same `client_id` that created it.

- `DELETE /v2/public/share/:id`
  Deletes a shared deck. Requires the same `client_id` that created it.

### Decklists

- `GET /v2/public/decklists`
  Searches for shared decklists. Supports the following query parameters:
  - `name`: Filter by deck name (LIKE match)
  - `role_code`: Filter by Ranger Role card code
  - `aspect_code`: Filter by Ranger Aspect card code
  - `background`: Filter by Background type
  - `specialty`: Filter by Specialty type
  - `tags`: Filter by deck tags (LIKE match)
  - `required[]`: Array of card codes that must be in the deck
  - `excluded[]`: Array of card codes that must not be in the deck
  - `limit`: Number of results to return (default 10)
  - `offset`: Number of results to skip (default 0)

  Returns `{ data: DecklistSearchResult[], meta: { total: number, limit: number, offset: number } }`.

### Fan-made project info

- `GET /v2/public/fan-made-project-info`
  Returns all fan-made project info records as `{ data: FanMadeProjectInfo[] }`.

- `GET /v2/public/fan-made-project-info/:id`
  Returns a single project info record.
  Returns `404` if the project does not exist.

## Admin API

- `POST /admin/fan_made_project_info`
  Requires `Authorization: Bearer <ADMIN_API_KEY>`.
  Accepts a `FanMadeProjectInfo` payload without the `id` field and upserts it into SQLite.

## Images

- `GET /images/:code`
  Reads `IMAGE_DIR/{pack_id}/{code}.jpg` from disk and serves it as `image/jpeg`.
  Returns:

  - `503` if `IMAGE_DIR` is not configured
  - `404` if the card or image is missing

## Environment variables

The backend reads the following env vars:

- `ADMIN_API_KEY`: bearer token for admin routes
- `CORS_ORIGINS`: allowed CORS origins
- `HOSTNAME`: hostname to bind to, defaults to `localhost`
- `IMAGE_DIR`: optional image root used by `/images/:code`
- `NODE_ENV`: `development`, `production`, or `test`
- `PORT`: HTTP port
- `SQLITE_PATH`: SQLite file path

Operational scripts also use:

- `CARD_DATA_DIR`: local `rangers-card-data` checkout for `ingest:cards`
- `DATABASE_URL`: dbmate SQLite URL for migrations
- `DBMATE_MIGRATIONS_DIR`: migration directory for dbmate
- `DBMATE_SCHEMA_FILE`: schema dump path for dbmate

See [backend/.env.example](../backend/.env.example) for a complete example.
