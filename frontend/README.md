# frontend

Frontend for `earthborne.build`.

## Stack

- React `19`
- Vite `8`
- TypeScript
- Zustand for app state
- TanStack Query for remote data fetches
- `react-i18next` for UI translations

## Local setup

```sh
cp .env.example .env
npm install
npm run dev
```

The frontend expects the backend to provide:

- `GET /v2/public/cards`
- `GET /v2/public/packs`
- `GET /version`
- optionally `GET /images/:code`

## Commands

```sh
npm run dev
npm run build
npm run preview
npm run check
npm run test
npm run test:coverage
npm run i18n:sync
```

Additional scripts:

- `npm run analyze`: bundle analyzer
- `npm run fmt:rules`: format `src/assets/rules.html` (after regenerating it)
- `node ../scripts/scrape-reference-sections.mjs` (from repo root): crawl and regenerate `/rules` section assets from the official Living Valley docs
- `node ../scripts/scrape-rules.mjs` (from repo root): regenerate `src/assets/rules.html` from the official EBR rules glossary
- `npm run schema:fan-made-content`: emit the fan-made content JSON schema

## Notes

This app was adapted from `arkham.build`, and some upstream integration code still exists in the frontend for legacy sync/share/auth flows. Those flows require a compatible legacy backend and are not implemented by the local `backend/` package in this repository.
