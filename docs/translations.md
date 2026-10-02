# Translations

UI translations live in `frontend/src/locales/*.json` and are loaded with `react-i18next`.

## Localization status

Status as of 2026-10-02. The implementation is tracked in [card-localization-plan.md](./card-localization-plan.md).

1. **UI strings** — implemented for `en`, `de`, `es`, `fr`, `it`, and `ru`, all selectable in settings. Spanish, French, Italian, and Russian UI translations were completed, with game-term keys aligned to the card-data PO files. German uses official Frosted Games terminology; its native-speaker review remains tracked in [translations-de-review.md](./translations-de-review.md). Spanish desktop and mobile views have been inspected; visual checks of the other languages remain.
2. **Card metadata** — storage, ingest, API, and frontend implemented. The backend imports `i18n/<locale>/**/*.po` into the translation table and records coverage and outdated-source counts. Cards, packs, sets, and `/version` accept `?locale=` with per-field English fallback; cards and packs retain their English names as `real_name`. The frontend uses the saved language on startup, refetches on language changes, translates trait displays while retaining English filter/rules values, searches both names (including BuildQL), and exports/shares English card names. Frontend checks and live Spanish verification pass, including English fallback, images, search, trait filtering, and export/share names. The local ingest imported 828 cards and 4,817 translation rows.
3. **Rules reference** — later. The embedded `/rules` content (`frontend/src/assets/*.html`) is English scraper output; a German version needs the official German rulebook as scraper input (licensed text; source PDFs are kept locally, outside the repo).
4. **Localized card scans** — later, optional. Serve German card images when the app language is German; blocked on sourcing scans of the German printing.

Card images remain English. Rules-reference translation and localized scans are outside the current card-metadata plan.

Supported locales are declared in [frontend/src/utils/constants.ts](../frontend/src/utils/constants.ts).

## Adding a locale

1. Copy `frontend/src/locales/en.json` to `frontend/src/locales/<locale>.json`.
2. Add the locale to `LOCALES` in `frontend/src/utils/constants.ts`.
3. Run `npm run i18n:sync -w frontend` to align keys with `en.json`.
4. Translate the new locale file.
5. Use official card-data translations for game terms (`common.type`, `common.traits`, `common.uses`, aspects, and areas) where available.
6. Run the frontend checks and inspect the language on `https://dev.harababurel.com` for layout and text issues.

For card metadata, add the locale's PO files to the `rangers-card-data` checkout, add the locale to `LOCALES` in `backend/src/scripts/card-translations.ts`, and update `resolveLocale` in `backend/src/db/queries/translation.ts`. Re-run ingest and inspect its coverage report, then verify translated cards and English fallback in the frontend.

## Updating translations

When UI text changes:

1. update `frontend/src/locales/en.json`
2. run `npm run i18n:sync -w frontend`
3. fill in translated values for the affected locale files

## How `i18n:sync` works

`frontend/scripts/i18n-sync.ts` treats `en.json` as the canonical source and:

- adds missing keys to other locales
- preserves existing translated values when the key still exists
- removes keys that no longer exist in `en.json`

## Legacy script

`npm run i18n:pull -w frontend` still exists in the repo, but it is inherited from the upstream `arkham.build` project and pulls translation data from Arkham-specific sources. It is not part of the current Earthborne Rangers translation workflow.
