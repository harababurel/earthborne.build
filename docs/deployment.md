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
- local clone of `https://github.com/zzorba/rangers-card-data`

## 1. Install dependencies

```bash
cd /srv/earthborne.build
npm ci
```

## 2. Clone card data

```bash
git clone https://github.com/zzorba/rangers-card-data /srv/rangers-card-data
```

## 3. Configure the backend

```bash
cp /srv/earthborne.build/backend/.env.example /srv/earthborne.build/backend/.env
```

Update at least:

- `CORS_ORIGINS`
- `PORT`
- `SQLITE_PATH`
- `CARD_DATA_DIR`
- `IMAGE_DIR`
- `ADMIN_API_KEY`

Example values:

```dotenv
CORS_ORIGINS="https://earthborne.yourdomain.com"
PORT="8686"
SQLITE_PATH="/srv/earthborne.build/backend/earthborne.db"
DATABASE_URL="sqlite:/srv/earthborne.build/backend/earthborne.db"
DBMATE_MIGRATIONS_DIR="src/db/migrations"
DBMATE_SCHEMA_FILE="src/db/schema.sql"
CARD_DATA_DIR="/srv/rangers-card-data"
IMAGE_DIR="/srv/earthborne.images/cards"
ADMIN_API_KEY="replace-with-a-random-secret"
```

Generate a secret with:

```bash
openssl rand -hex 32
```

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
```

`VITE_API_LEGACY_URL` is still read by some inherited frontend code. Leaving it empty keeps it same-origin, but it does not add missing legacy endpoints.

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

## Updating a deployment

```bash
cd /srv/earthborne.build
git pull
npm ci
npm run build -w frontend

cd /srv/earthborne.build/backend
npm run db:migrate
npm run ingest:cards
sudo systemctl restart earthborne
```

If you mirror images locally, rerun `npm run download:images` after ingesting new card data.

## Known limitations

- The local backend does not implement the old `arkham.build` auth, remote share, or deck sync APIs.
- The frontend still contains code paths for those flows, so self-hosted deployments should treat them as unsupported unless a separate compatible legacy backend is provided.
