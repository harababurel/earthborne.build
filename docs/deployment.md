# Deployment Guide

This project currently supports a simple self-hosted deployment:

- frontend: static files from `frontend/dist`
- backend: Node.js process managed by `systemd`
- database: SQLite file on local disk
- reverse proxy: `nginx`

## Requirements

- Linux server
- Node.js `24.x`
- `nginx`
- project checkout at `/srv/earthborne.build` or similar
- local clone of `https://github.com/harababurel/rangers-card-data`

## 1. Install dependencies

```bash
cd /srv/earthborne.build
npm ci
```

npm 12 blocks dependency install scripts unless they are listed in the root
`package.json` under `allowScripts`. `better-sqlite3` is approved there because
it compiles a native addon during install — without it the backend starts and
immediately dies with `Could not locate the bindings file`. If you ever see that
error, check `npm install-scripts ls` first; anything unreviewed there means the
addon was silently skipped, and `npm rebuild better-sqlite3` fixes it once the
package is approved.

Approvals are pinned to exact versions, so **bumping `better-sqlite3`, `sharp`,
or `lefthook` invalidates them.** Re-run `npm install-scripts approve <pkg>`
after any such upgrade, or the next clean install produces a backend that will
not boot.

## 2. Clone card data

```bash
git clone https://github.com/harababurel/rangers-card-data /srv/rangers-card-data
```

## 3. Configure the backend

```bash
cp /srv/earthborne.build/backend/.env.example /srv/earthborne.build/backend/.env
```

Update at least:

- `CORS_ORIGINS`
- `FRONTEND_URL`
- `PORT`
- `SQLITE_PATH`
- `DBMATE_SCHEMA_FILE` — point it outside the repo (see below)
- `CARD_DATA_DIR`
- `IMAGE_DIR`
- `ADMIN_API_KEY`
- `SESSION_COOKIE_NAME`
- `SESSION_EXPIRY_HOURS`
- email/SMTP settings when account email delivery should work
- `TURNSTILE_SECRET_KEY` if signup captcha verification is enabled; leave it
  empty to run signup without Turnstile

Example values:

```dotenv
CORS_ORIGINS="https://earthborne.yourdomain.com"
FRONTEND_URL="https://earthborne.yourdomain.com"
PORT="8686"
SQLITE_PATH="/srv/earthborne.build/backend/earthborne.db"
DATABASE_URL="sqlite:/srv/earthborne.build/backend/earthborne.db"
DBMATE_MIGRATIONS_DIR="src/db/migrations"
DBMATE_SCHEMA_FILE="/tmp/earthborne-schema.sql"
CARD_DATA_DIR="/srv/rangers-card-data"
IMAGE_DIR="/srv/earthborne.images/cards"
ADMIN_API_KEY="replace-with-a-random-secret"
SESSION_COOKIE_NAME="eb_session"
SESSION_EXPIRY_HOURS="720"
FROM_EMAIL="noreply@earthborne.yourdomain.com"
FROM_NAME="earthborne.build"
SMTP_HOST="smtp.yourdomain.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="smtp-user"
SMTP_PASS="smtp-password"
TURNSTILE_SECRET_KEY=""
```

Generate a secret with:

```bash
openssl rand -hex 32
```

`DBMATE_SCHEMA_FILE` deliberately points outside the repo on a server. dbmate
rewrites that file on every `db:migrate`, and the dump it produces from a live
database differs cosmetically from the committed one (table ordering, whitespace
SQLite preserves from each `CREATE`). Pointing it at the tracked
`src/db/schema.sql` leaves the working tree dirty after every migration, and the
next `git pull` aborts with "local changes would be overwritten". The committed
schema is a development artifact; a server has no use for a regenerated copy.
If you already hit this, `git checkout -- backend/src/db/schema.sql` discards the
regenerated dump safely.

Turnstile is disabled when `TURNSTILE_SECRET_KEY` is unset or empty. To enable
signup captcha verification, create a Cloudflare Turnstile widget, set the
backend `TURNSTILE_SECRET_KEY` to its secret key, and set the frontend
`VITE_TURNSTILE_SITE_KEY` to the matching site key.

## 4. Apply migrations and ingest cards

```bash
cd /srv/earthborne.build/backend
npm run db:migrate
npm run ingest:cards
```

## 5. Optionally mirror card images locally

```bash
cd /srv/earthborne.build/backend
npm run download:images
```

This populates `IMAGE_DIR/{pack_id}/{code}.jpg`. Missing images for some non-player card types are expected and skipped.

## 6. Configure the frontend

```bash
cp /srv/earthborne.build/frontend/.env.example /srv/earthborne.build/frontend/.env
```

For a same-origin deployment, a minimal config is:

```dotenv
VITE_API_URL=""
VITE_API_LEGACY_URL=""
VITE_CARD_IMAGE_URL="/images"
VITE_PAGE_NAME="earthborne.build"
VITE_TURNSTILE_SITE_KEY=""
VITE_ADMIN_EMAIL=""
```

`VITE_API_LEGACY_URL` is still read by some inherited frontend code. Leaving it empty keeps it same-origin, but it does not add missing legacy endpoints.
Leave `VITE_TURNSTILE_SITE_KEY` empty unless the backend also has
`TURNSTILE_SECRET_KEY` configured.

## 7. Build the frontend

```bash
cd /srv/earthborne.build
npm run build -w frontend
```

## 8. Install the systemd service

Use the sample unit in [docs/earthborne.service](./earthborne.service), then:

```bash
sudo cp /srv/earthborne.build/docs/earthborne.service /etc/systemd/system/earthborne.service
sudo systemctl daemon-reload
sudo systemctl enable --now earthborne
sudo systemctl status earthborne
```

Adjust `User`, `WorkingDirectory`, `EnvironmentFile`, and `ExecStart` as needed for your server.

## 9. Configure nginx

Use [docs/nginx.conf.example](./nginx.conf.example) as the starting point.

Important routes:

- `/` serves the SPA
- `/v2`, `/version`, `/admin`, and `/up` proxy to the backend
- `/images/` proxies to the backend when local image hosting is enabled

For split-origin deployments, `CORS_ORIGINS` must include the frontend origin
exactly. Account login and sync use HTTP-only cookies with `SameSite=Strict`, so
same-origin deployment is the simplest production shape.

## Updating a deployment

```bash
cd /srv/earthborne.build
git pull
npm run build -w frontend

cd /srv/earthborne.build/backend
npm run db:migrate
sudo systemctl restart earthborne
```

Three steps are conditional, and running them when they are not needed is not
free:

- **`npm ci`** — only when `package-lock.json` changed in the pull. It deletes
  `node_modules` wholesale, which means `better-sqlite3` has to compile its
  native addon again; if that step is blocked or fails, the backend will not
  start (see §1). Check with `git diff --stat HEAD@{1} -- package-lock.json`.
- **`npm run ingest:cards`** — only when card data changed. It is unrelated to
  application code.
- **`npm run build -w frontend`** — only when frontend or shared code changed,
  though it is cheap and harmless to run every time.

`npm run db:migrate` is safe to run unconditionally: it is a no-op when there
are no pending migrations. Run it **before** restarting the service, so the new
code never meets an older schema.

If you mirror images locally, rerun `npm run download:images` after ingesting new card data.

## Backups and privacy

SQLite now stores account credentials, session hashes, email addresses, pending
email addresses, verification tokens, account-synced decks and campaigns,
settings, folders, achievements, and account-linked share ownership. Treat
database backups as containing PII and protect, retain, and delete them
accordingly.

## Known limitations

- Email delivery requires SMTP configuration in production. Without
  `SMTP_HOST`, verification and password reset emails are logged by the backend
  process.
- Account cookies use `Secure` in production, so production account flows must
  run over HTTPS.
