# Translations

UI translations live in `frontend/src/locales/*.json` and are loaded with `react-i18next`.

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
