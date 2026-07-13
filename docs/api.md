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
  Creates a new shared deck. Requires `X-Client-Id`. If the request includes
  a valid account session cookie, the share is linked to that account.

- `GET /v2/public/share/history/:id`
  Returns the shared deck with the given `id`, its history, and `author_name`
  when the share is linked to a completed account profile. Returns `404` if not
  found.

- `PUT /v2/public/share/:id`
  Updates an existing shared deck. Requires `X-Client-Id`; logged-in users can
  also update shares owned by their account.

- `DELETE /v2/public/share/:id`
  Deletes a shared deck. Requires `X-Client-Id`; logged-in users can also
  delete shares owned by their account.

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
  Results include `author_name` when a shared deck is linked to a completed
  account profile.

### RangersDB import

- `GET /v2/public/rangersdb/deck/:id`
  Fetches a deck from RangersDB by numeric id and returns it as
  `{ id, name, created_at, like_count, comment_count, user: { handle }, awa,
  spi, fit, foc, meta, slots, cards }`, where `cards` maps
  the deck's card codes to their RangersDB names (best-effort; used by the
  frontend to detect codes that reference a different card in our database,
  since RangersDB tracks a different fork of `rangers-card-data`). Proxied
  through the backend because RangersDB's GraphQL API restricts CORS to its
  own origin. Returns `404` when the deck does not exist or is not publicly
  accessible and `502` when RangersDB cannot be reached.

## Account API

Authenticated account endpoints live under `/v2/account` and require session
cookies with `credentials: "include"` from the frontend. Account CORS echoes
configured origins and allows credentials.

### Auth

- `POST /v2/account/auth/signup`
  Creates an email account and sends a verification email.

- `POST /v2/account/auth/login`
  Logs in with verified email credentials and sets the session cookie.

- `POST /v2/account/auth/logout`
  Deletes the current session and clears the session cookie.

- `GET /v2/account/auth/me`
  Returns the current account and email identity state.

- `POST /v2/account/auth/verify-email`
  Consumes an email verification token.

- `POST /v2/account/auth/resend-verification`
  Sends a fresh verification email when the target email is unverified or
  pending.

- `POST /v2/account/auth/forgot-password`
  Starts password reset for a verified email or username. Always returns 200.

- `POST /v2/account/auth/reset-password`
  Consumes a password reset token, changes the password, and deletes existing
  account sessions.

- `POST /v2/account/auth/complete-profile`
  Sets the public username and optionally uploads local decks, campaigns,
  folders, settings, and achievements.

- `PATCH /v2/account/auth/credentials`
  Changes password and/or starts an email change. Requires the current password.

- `DELETE /v2/account/auth/credentials/pending-email`
  Cancels a pending email change.

- `DELETE /v2/account/auth`
  Deletes the account, its sessions, credentials, synced data, and linked
  account ownership. Clears the session cookie.

### Profile

- `PATCH /v2/account/profile`
  Renames the account. Usernames are unique case-insensitively.

### Sync

- `GET /v2/account/sync/manifest`
  Returns deck and campaign ids, revisions, and update timestamps.

- `POST /v2/account/decks/batch`
- `POST /v2/account/campaigns/batch`
  Batch reads synced deck or campaign payloads by id.

- `POST /v2/account/decks`
- `POST /v2/account/campaigns`
  Creates a synced deck or campaign item.

- `PUT /v2/account/decks/:id`
- `PUT /v2/account/campaigns/:id`
  Updates a synced item with an expected revision. Revision mismatch returns
  `409` with the current remote item in the error cause.

- `DELETE /v2/account/decks/:id`
- `DELETE /v2/account/campaigns/:id`
  Deletes a synced item with an expected revision. Revision mismatch returns
  `409`.

- `GET /v2/account/folders`
- `PUT /v2/account/folders`
- `GET /v2/account/settings`
- `PUT /v2/account/settings`
- `GET /v2/account/achievements`
- `PUT /v2/account/achievements`
  Reads and writes revisioned account blobs.

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
- `FROM_EMAIL`: email sender address for verification and password reset mail
- `FROM_NAME`: email sender display name
- `FRONTEND_URL`: public frontend origin used in email links
- `HOSTNAME`: hostname to bind to, defaults to `localhost`
- `IMAGE_DIR`: optional image root used by `/images/:code`
- `NODE_ENV`: `development`, `production`, or `test`
- `PORT`: HTTP port
- `RANGERSDB_GRAPHQL_URL`: RangersDB GraphQL endpoint used by the deck import
  proxy, defaults to `https://gapi.rangersdb.com/v1/graphql`
- `SESSION_COOKIE_NAME`: account session cookie name
- `SESSION_EXPIRY_HOURS`: account session lifetime in hours
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`: SMTP
  settings. When `SMTP_HOST` is unset, emails are logged to the backend console.
- `SQLITE_PATH`: SQLite file path
- `TURNSTILE_SECRET_KEY`: optional Cloudflare Turnstile secret for signup
  captcha verification

Operational scripts also use:

- `CARD_DATA_DIR`: local `rangers-card-data` checkout for `ingest:cards`
- `DATABASE_URL`: dbmate SQLite URL for migrations
- `DBMATE_MIGRATIONS_DIR`: migration directory for dbmate
- `DBMATE_SCHEMA_FILE`: schema dump path for dbmate

See [backend/.env.example](../backend/.env.example) for a complete example.
