# Plan: card metadata localization

## Goal

When the user selects a language, the interface switches to it. Card metadata uses the `rangers-card-data` translation where one exists and falls back to English otherwise, field by field. Card images stay English.

## Implementation status (2026-10-02)

| Phase | Status | Evidence / remaining work |
| --- | --- | --- |
| 1: UI languages | Implemented | `a46d00ef`: supported locale files completed, Italian added, unused locales removed, and language selector updated. |
| 2: backend storage and ingest | Implemented | `7d1fa31c`: translation table, PO parser, transactional ingest, coverage logging, update timestamp, and parser/loading tests added. |
| 3: API | Implemented | Locale-aware cards, packs, sets, and version responses; English fallback; shared schema additions; real in-memory database integration tests. |
| 4: frontend | Implemented; live verification blocked | Locale-aware startup/refetch, translated trait display, bilingual name search/BuildQL, and English export/share names. Frontend typecheck, build, and tests pass; dev site returns 502. |
| 5: docs | Updated | UI, ingest, API parameters, frontend behavior, and adding-language instructions documented. |

The implementation commits do not establish completion of every verification step below. Visual checks of each language and local ingest row-count checks still need confirmation. The frontend now requests card metadata in the selected language. Phase 4's live Spanish checks remain pending because `https://dev.harababurel.com` returned 502 during verification on 2026-10-02.

## Decisions

- **Locales:** `en`, `de`, `es`, `fr`, `it`, `ru`. These are the languages with card data in `rangers-card-data/i18n/`; `pseudo` is excluded.
- **Unused UI files:** delete `ko.json`, `pl.json`, `zh.json`, `zh-cn.json` (arkham.build leftovers with no card data). Add `it.json`.
- **Outdated translations:** about 15% of `.po` entries have an English source (`msgid`) that no longer matches the current English text. Most differences are formatting (`\n` vs `<hr>`), some are errata. Normalize the formatting, then use the translation anyway. Ingest logs a count of outdated entries so they can be fixed upstream.
- **Traits stay English in the data.** Filters, BuildQL, deck rules (`"Task"`, `"Expert"`), and persisted filter state compare English trait strings. Traits are translated only for display, through the existing `common.traits.*` UI keys. Those keys are filled from the official per-card trait translations in the `.po` files, so there is one source of truth.
- **Values derived from English stay English.** The backend computes `keywords`, `is_unique` and `is_expert` from the English text before any translation is applied.
- **Export and share text uses English names**, so exported files work across languages and with other tools.
- **Search** matches both the translated name and the English name.
- **Out of scope:** card images, the rules reference, taboos (untranslated everywhere), and UI-only languages without card data.

## Phase 1: UI languages

1. Add `es`, `fr`, `it`, `ru` to `LOCALES` in `frontend/src/utils/constants.ts`. Delete the unused locale files.
2. Machine-translate `es`, `fr`, `ru` and the new `it` until every key in `en.json` is present and actually translated. Today 640–810 strings per file are identical to English, and about 230 keys are missing.
3. Fill the game-term keys (`common.type`, `common.traits`, `common.uses`, aspect and area labels) from the `.po` files rather than machine translation, so they match the printed cards. Do the same for `de` to keep it consistent.
4. Verify: `npx biome check`, `npm run check -w frontend`, then a visual check of each language on dev.harababurel.com.

## Phase 2: backend storage and ingest

1. Migration: add a `translation` table with columns `(locale, entity, entity_id, field, value)` and primary key `(locale, entity, entity_id, field)`. `entity` is one of card, pack, set, subset, token, type, aspect, area. Update `schema.sql` and `schema.types.ts`.
2. Add a `.po` parser module, using `gettext-parser` or a small custom parser. It must:
   - split `msgctxt` into `<id>.<field>`
   - skip entries with an empty `msgstr`
   - on duplicates (e.g. in `de/packs/core/core.po`), keep the first entry and warn
   - normalize line breaks to the `<hr>` markup used by the English data
3. In `ingest-cards.ts`:
   - Read `i18n/{de,es,fr,it,ru}/**/*.po`, excluding taboos.
   - Apply the `core` → `ebr` pack remap.
   - Insert the rows in the existing transaction, which also clears them first.
   - Store only fields the app uses:
     - cards: name, text, traits, flavor, and the sun/mountain/crest challenge text
     - tokens: name, plurals
     - packs: name, short_name
     - sets and subsets: name
     - types and areas: name
     - aspects: name, short_name
   - Log per-locale coverage and the outdated-entry count.
4. Write `translations_updated_at` to `app_metadata`.
5. Verify: a parser unit test, then run the ingest against the local checkout and check the row counts.

## Phase 3: API

1. Add an optional `?locale=` parameter to `/v2/public/cards`, `/cards/:code`, `/packs`, `/sets` and `/version`. A missing or unsupported locale means English.
2. In `card.ts`, `pack.ts` and `set.ts`, load the translations for the requested locale once as a map. Apply them in `transformCard` after the English-derived fields are computed. Card traits are not replaced.
3. Add `real_name` (the English name) to cards and packs in the shared schema, and include `token_name` and `token_plural` in the translated output.
4. `/version` returns the requested locale and the real `translation_updated_at`.
5. Tests against a real in-memory database (no mocks):
   - a translation is applied
   - a missing field falls back to English
   - an unknown locale returns English
   - English-derived values are unchanged
   - `/version` reports the requested locale
6. Verify: `npm run check -w backend`, `npm run test -w backend`, `npm run test -w shared`.

## Phase 4: frontend

1. In `queries.ts`, use the currently ignored `_locale` argument and send `?locale=`. Pass `settings.locale` to `init` in `main.tsx`, which doesn't do this today. Switching language already triggers a refetch through `applySettings`, and the persisted data-version key already includes the locale.
2. For packs, take `real_name` from the API instead of copying `name`.
3. Make every place that shows traits go through `selectTraitMapper`. `list-card-inner.tsx` and `card-modal.tsx` show raw traits today.
4. In `searching.ts`, index `real_name` alongside `name`. BuildQL `name` matches either.
5. In `deck-io.ts` and `deck-share.ts`, use `real_name`.
6. Verify:
   - `npm run check -w frontend`, `npm run build -w frontend`, and the frontend tests
   - on dev.harababurel.com in Spanish:
     - a core card is translated
     - an `sib` card shows English
     - images are unchanged
     - the trait filter still works
     - an exported deck uses English names

## Phase 5: docs

Update `docs/metadata.md` (`.po` ingest and the outdated-entry policy), `docs/api.md` (the `locale` parameter) and `docs/translations.md` (status and how to add a language).

## Risks

- **Translated text formatting:** markup and line breaks may render incorrectly. Spot-check each locale after Phase 2.
- **Composite trait keys:** `common.traits` has keys like `"Tool / Weapon"`. Check that the mapper covers every combination in the data, or switch it to translating each trait separately.

**Effort:** about 2–3 days. Phase 1 is mostly translation; Phases 2–4 are the core work.
