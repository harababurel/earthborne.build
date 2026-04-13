# Deployment Guide

Self-hosted deployment on a Linux server with nginx as a reverse proxy.

## Architecture

- **Frontend** — Vite build output (`frontend/dist/`), served as static files by nginx
- **Backend** — Node.js process managed by systemd, proxied by nginx
- **Database** — SQLite file at `backend/earthborne.db` (runtime artifact, not in git)
- **Card data** — ingested from a local clone of `github.com/zzorba/rangers-card-data`

## Prerequisites

- Node.js 24+ installed on the server
- nginx installed and running
- The project cloned to `/srv/earthborne.build`

## Initial setup

### 1. Install dependencies

```bash
cd /srv/earthborne.build
npm ci
```

### 2. Clone card data

```bash
git clone https://github.com/zzorba/rangers-card-data /srv/rangers-card-data
```

### 3. Create the backend env file

```bash
cat > /srv/earthborne.build/backend/.env << 'EOF'
PORT=8686
NODE_ENV=production
CORS_ORIGINS=https://earthborne.yourdomain.com
ADMIN_API_KEY=REPLACE_WITH_A_RANDOM_SECRET
SQLITE_PATH=/srv/earthborne.build/backend/earthborne.db
DATABASE_URL=sqlite:/srv/earthborne.build/backend/earthborne.db
DBMATE_MIGRATIONS_DIR=src/db/migrations
CARD_DATA_DIR=/srv/rangers-card-data
EOF
```

Replace `earthborne.yourdomain.com` with your actual domain and generate a real secret for `ADMIN_API_KEY`:

```bash
openssl rand -hex 32
```

### 4. Run the database migration

```bash
cd /srv/earthborne.build/backend
npm run db:migrate
```

Creates `earthborne.db` with all tables.

### 5. Ingest cards

```bash
npm run ingest:cards
```

Inserts 260 cards across 5 packs (core, loa, sib, sos, sotv).

### 6. Create the frontend env file

```bash
cat > /srv/earthborne.build/frontend/.env << 'EOF'
VITE_API_URL=https://earthborne.yourdomain.com/v2
VITE_API_LEGACY_URL=https://earthborne.yourdomain.com/v2
VITE_CARD_IMAGE_URL=https://img.rangersdb.com
VITE_PAGE_NAME=earthborne.build
VITE_SHOW_PREVIEW_BANNER=false
EOF
```

> `VITE_CARD_IMAGE_URL` currently points to RangersDB's image CDN. Update this when self-hosting card images.

### 7. Build the frontend

```bash
cd /srv/earthborne.build
npm run build --workspace=frontend
```

Output: `frontend/dist/`

### 8. Create the systemd service

```bash
sudo tee /etc/systemd/system/earthborne-backend.service << 'EOF'
[Unit]
Description=Earthborne Rangers Backend
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/srv/earthborne.build/backend
EnvironmentFile=/srv/earthborne.build/backend/.env
ExecStart=node --experimental-strip-types src/main.ts
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable earthborne-backend
sudo systemctl start earthborne-backend
```

Verify:

```bash
sudo systemctl status earthborne-backend
```

### 9. Configure nginx

See [nginx configuration](#nginx-configuration) below.

---

## nginx configuration

```nginx
server {
    server_name earthborne.yourdomain.com;

    # Serve frontend static files
    root /srv/earthborne.build/frontend/dist;
    index index.html;

    # SPA fallback for React Router
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API calls to the backend
    location /v2/ {
        proxy_pass http://localhost:8686;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # SSL — managed by certbot
    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/earthborne.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/earthborne.yourdomain.com/privkey.pem;
}

server {
    listen 80;
    server_name earthborne.yourdomain.com;
    return 301 https://$host$request_uri;
}
```

---

## Updating the deployment

### Pull new code

```bash
cd /srv/earthborne.build
git pull
npm ci
```

### Apply schema migrations (if any)

```bash
cd /srv/earthborne.build/backend
npm run db:migrate
```

### Update card data

```bash
cd /srv/rangers-card-data
git pull
cd /srv/earthborne.build/backend
npm run ingest:cards
```

### Rebuild the frontend (if frontend changed)

```bash
cd /srv/earthborne.build
npm run build --workspace=frontend
```

nginx serves the files directly from `frontend/dist/` so no restart is needed after a frontend rebuild.

### Restart the backend (if backend changed)

```bash
sudo systemctl restart earthborne-backend
```
