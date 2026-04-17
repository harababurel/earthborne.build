# API

The backend is a small Node.js service built with Hono. It uses SQLite for storage and exposes a small set of Earthborne-specific endpoints.

## Base routes

- `GET /up`
  Health check. Returns `ok`.

- `GET /version`
  Returns the current ingested data version payload:

  ```json
  {
    "card_count": 260
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

See [backend/.env.example](../backend/.env.example) for a complete example.
