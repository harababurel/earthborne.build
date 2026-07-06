# Translations

UI translations live in `frontend/src/locales/*.json` and are loaded with `react-i18next`.

## Localization roadmap (German first)

The German localization effort is staged. Status as of 2026-07:

1. **UI strings** — ✅ done. Full `de.json` translation using official Frosted Games terminology; `de` is selectable in settings. Open follow-up: native-speaker review pass, tracked in [translations-de-review.md](./translations-de-review.md).
2. **Card text** — next up. Translations live in the `rangers-card-data` fork (`i18n/<locale>/**/*.po`, German partially complete). Requires: ingesting `.po` translations into the backend DB, a locale-aware cards API, and the frontend requesting card data in the app language with per-field English fallback.
3. **Rules reference** — later. The embedded `/rules` content (`frontend/src/assets/*.html`) is English scraper output; a German version needs the official German rulebook as scraper input (licensed text; source PDFs are kept locally, outside the repo).
4. **Localized card scans** — later, optional. Serve German card images when the app language is German; blocked on sourcing scans of the German printing.

Adding further languages repeats the same stages; the official-terminology groundwork must be redone per language (Earthborne Rangers is also localized in French, Italian, and Russian).

Supported locales are declared in [frontend/src/utils/constants.ts](../frontend/src/utils/constants.ts).

## Adding a locale

1. Copy `frontend/src/locales/en.json` to `frontend/src/locales/<locale>.json`.
2. Add the locale to `LOCALES` in `frontend/src/utils/constants.ts`.
3. Run `npm run i18n:sync -w frontend` to align keys with `en.json`.
4. Translate the new locale file.

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
