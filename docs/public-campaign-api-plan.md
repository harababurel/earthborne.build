# Public campaign API — execution plan

Status: **phase 4 complete**
Created: 2026-07-25

---

## 1. Motivation & scope

Third-party tools (VTT plugins, trackers, companion apps) want to import an existing
campaign instead of making players re-enter it by hand. The integration constraint that
shapes the design: **such tools can typically only issue plain server-side GET requests
with no custom headers**, so anything requiring a session cookie or an `Authorization`
header is unusable for them.

This plan adds an opt-in, per-campaign "share publicly" toggle that exposes the campaign
and its linked party decks at an unauthenticated `GET` endpoint.

### 1.1 Decisions already made

1. **Accounts are required.** Sharing reads the campaign live from `account_campaign`.
   Local-only campaigns (users without an account) are out of scope — this feature is
   simply not offered to them. No anonymous upload path, no `X-Client-Id` ownership
   model like `shared_deck` uses.
2. **Live, not a snapshot.** The public endpoint reads the current synced row, so a
   campaign is shared once and stays current as play continues. This is the main reason
   accounts are required.
3. **Linked decks are included.** The payload resolves `campaign.deck_ids` against the
   owner's `account_deck` rows and embeds the decklists. A VTT needs the party decks to
   set up a table; without them the integration would need a second, per-deck share flow.
   Consequence: **publishing a campaign implicitly publishes its party decks**, and the
   UI must say so.
4. **The public payload is a versioned DTO, not the internal schema.** `CampaignSchema`
   and `DeckSchema` stay free to change without breaking external consumers.

### 1.2 Out of scope

- Sharing for users without an account.
- Any listing/discovery of public campaigns (no "browse public campaigns" page). The
  endpoint is link-only, keyed by campaign id.
- Write access of any kind from the public endpoint.
- A separate opt-in per deck.

---

## 2. How to use this document

1. **Execute phases in order.** Each phase ends with a checkpoint; all listed
   verification commands must pass before starting the next phase.
2. **Track progress in this file.** Change `[ ]` to `[x]` as tasks land, and update the
   `Status:` line when a phase completes (e.g. `Status: phase 2 complete`).
3. **Commit per task or small group of related tasks.** Stage specific files (never
   `git add -A`). Human-style commit messages, no AI-attribution trailers.
4. **Never run the dev server.** The project owner runs their own instance; verification
   here is typechecks, lint, and automated tests, plus manual QA at the phase 4
   checkpoint.
5. **No mocked database in backend tests** — the suite runs against real SQLite.

### 2.1 Verification commands

Run from the repo root:

```bash
npm run check -w backend        # backend typecheck
npm run test -w backend         # backend tests
npm run check -w frontend       # frontend typecheck
npm run build -w frontend       # frontend production build
npm run test -w frontend        # frontend unit tests
npm run test -w shared          # shared package tests
npx biome check <changed files> # lint specific files
```

---

## 3. Endpoint contract

### 3.1 Toggle (authenticated)

```
PUT /v2/account/campaigns/:id/visibility
Body: { "public": true }
→ 200 { "public": true }
→ 404 if the campaign does not exist or belongs to another account
```

Session-authenticated and owner-scoped, like the rest of `/v2/account/campaigns`.

**The toggle must not bump `revision`.** That column is the optimistic-concurrency token
for campaign data writes (`backend/src/db/queries/account-campaigns.ts:48`); bumping it
on a visibility change would make an in-flight edit on the same device fail with a 409.
The tradeoff is that other devices pick up the new flag on their next batch fetch rather
than immediately — acceptable for a toggle.

### 3.2 Public read (unauthenticated)

```
GET /v2/public/campaign/:id
→ 200 PublicCampaign
→ 404 if the campaign does not exist, or exists but is not public
```

The 404 must be **byte-identical** in both cases so private campaigns are not probeable.

Campaign ids are 15-character nanoids over a 62-character alphabet
(`frontend/src/utils/crypto.ts:3`), so keying the public route on the campaign id is
safe — the same exposure model `shared_deck` already uses for decks.

Mounted inside the existing `pub` group in `backend/src/app.ts:63`, so it inherits
`publicCorsMiddleware` and works from a browser too, not just server-side callers.

### 3.3 Payload

```jsonc
{
  "schema_version": 1,
  "campaign": {
    "id": "AbC123...",
    "name": "...",
    "cycle_id": "core",
    "expansions": [],
    "extended_calendar": false,
    "day": 4,
    "current_location": "...",
    "current_path_terrain": "...",
    "rewards": ["..."],
    "missions": [...],
    "history": [...],
    "calendar": [...],
    "events": [...],
    "notes": [...],
    "removed": [...],
    "date_creation": "...",
    "date_update": "..."
  },
  "decks": [
    {
      "id": "...",
      "name": "...",
      "aspect_code": "...",
      "role_code": "...",
      "background": "...",
      "specialty": "...",
      "slots": { "01001": 2 },
      "rewards": {},
      "displaced": {},
      "maladies": {},
      "date_creation": "...",
      "date_update": "..."
    }
  ]
}
```

Deliberately omitted:

- `deck_ids` — redundant once decks are embedded.
- `previous_campaign_id` / `next_campaign_id` — internal chaining; the referenced
  campaign is very likely not public, so these would be dangling references.
- `start_location` — internal undo bookkeeping for the first travel.
- Deck `user_id`, `source`, `tags`, `meta`, `problem`, `description_md` — internal
  bookkeeping, ArkhamDB residue, or free-form fields with no import value.
- Anything identifying the account (email, account id, display name).

---

## 4. Phase 1 — Database

- [x] **1.1** Add migration
      `backend/src/db/migrations/20260725000000_add_account_campaign_public.sql`:

      ```sql
      -- migrate:up

      ALTER TABLE account_campaign ADD COLUMN public INTEGER NOT NULL DEFAULT 0;

      -- migrate:down

      ALTER TABLE account_campaign DROP COLUMN public;
      ```

      No index: lookups are by primary key `id`, and nothing ever lists public campaigns.
      (Contrast `shared_deck.listed`, which is indexed because it filters a listing.)

- [x] **1.2** Run `npm run db:migrate -w backend` and commit the regenerated
      `backend/src/db/schema.sql`.

- [x] **1.3** Add `public: number;` to the `AccountCampaign` interface in
      `backend/src/db/schema.types.ts:171`. This file is **manually maintained** — it is
      not generated from the schema.

      Because the column is a plain `number` (the file uses no Kysely `Generated<>`
      convention), every insert site must pass it explicitly: `insertCampaignItem` and
      the bulk local-data upload in `backend/src/routes/auth.ts`. Both default to
      `public: 0` — imported campaigns start private.

- [x] **1.4** In `backend/src/db/queries/account-campaigns.ts`:
      - `setCampaignVisibility(db, accountId, id, isPublic)` — updates only `public`,
        scoped by `account_id`; returns whether a row matched. Must not touch `revision`
        or `updated_at`.
      - `getPublicCampaign(db, id)` — selects the campaign where `public = 1`, returning
        the row plus `account_id` for the deck join.
      - `getPublicCampaignDecks(db, accountId, deckIds)` — fetches the owner's
        `account_deck` rows for the given ids. Owner-scoping matters: a campaign must
        never be able to pull in another account's deck.

**Checkpoint 1:** `npm run check -w backend`, `npm run test -w backend`, lint changed files.

---

## 5. Phase 2 — Shared DTO

- [x] **2.1** Add `shared/src/dtos/public-campaign.schema.ts` with
      `PublicCampaignSchema` (`schema_version: z.literal(1)`, `campaign`, `decks`) as an
      **explicit** field list per §3.3 — not `CampaignSchema.omit(...)`, so that adding a
      field to the internal schema never silently leaks it publicly.

- [x] **2.2** Add mappers in the same file: `toPublicCampaign(campaign)` and
      `toPublicDeck(deck)`, each picking fields explicitly.

- [x] **2.3** Export from `shared/src/index.ts`.

- [x] **2.4** Tests in `shared/src/dtos/public-campaign.schema.spec.ts`:
      - a full campaign maps to the expected payload;
      - every omitted field in §3.3 is absent from the output (this is the leak
        regression test — assert on the exact key set);
      - the result parses against `PublicCampaignSchema`.

**Checkpoint 2:** `npm run test -w shared`, `npm run check -w backend`, lint.

---

## 6. Phase 3 — Routes

- [x] **3.1** Add `PUT /:id/visibility` to `backend/src/routes/account-campaigns.ts`,
      behind `sessionAuth()`, body validated with `zodValidator` against a new
      `CampaignVisibilityRequestSchema` in `shared/src/dtos/sync.schema.ts`. 404 when
      `setCampaignVisibility` matches no row.

- [x] **3.2** Expose `public` on the batch response and populate it in the `/batch`
      handler so the UI can render toggle state without an extra request.

      Deviation from the original wording: the flag went on a new
      `CampaignBatchItemSchema` (`SyncedCampaignSchema.extend`) rather than on
      `SyncedCampaignSchema` itself. That schema also describes the complete-profile
      upload echo (`shared/src/dtos/auth.schema.ts:131`), where visibility has no
      meaning — extending only the batch item keeps the upload contract untouched.

      Frontend reconciliation needed no changes; `fetchCampaignBatch` picks the new
      field up through `CampaignBatchResponseSchema`. Verified with
      `npm run check -w frontend`.

- [x] **3.3** Add `backend/src/routes/public-campaign.ts`: `GET /:id`, no auth, loads the
      campaign, parses `data`, resolves decks via `getPublicCampaignDecks`, maps through
      `toPublicCampaign`, returns it. Decks are returned in `deck_ids` order; ids with no
      matching row are skipped rather than erroring.

- [x] **3.4** Mount it in the `pub` group in `backend/src/app.ts:63` as
      `pub.route("/campaign", publicCampaignRouter)`.

- [x] **3.5** Integration tests in `backend/src/tests/public-campaign.spec.ts` (real
      SQLite, per repo policy). Cases:
      - public campaign returns 200 with campaign + linked decks;
      - non-public campaign returns 404, byte-identical to the unknown-id 404;
      - unknown id returns 404;
      - no auth headers are required for the 200 path;
      - a `deck_ids` entry owned by a *different* account is not included;
      - a dangling `deck_ids` entry is skipped, not a 500;
      - toggling visibility does not change `revision` or `updated_at`;
      - toggling another account's campaign returns 404;
      - after unsharing, the public read returns 404 again.

**Checkpoint 3:** `npm run check -w backend`, `npm run test -w backend`,
`npm run test -w shared`, lint. The endpoint is now usable on dev by external
integrators, ahead of any UI.

---

## 7. Phase 4 — Frontend

- [x] **4.1** Add `fetchCampaignVisibility` and `putCampaignVisibility` to
      `frontend/src/store/services/requests/campaigns.ts`, following the existing request
      helpers there.

- [x] **4.2** Deviation: no store action. Visibility is server-owned and lives outside
      the sync slice, so the section uses TanStack Query (`useQuery` + `useMutation`)
      keyed on the campaign id. Adding it to `CampaignSyncItemState` would have meant
      changing `makeSyncedItem`, which is shared with deck reconciliation.

      This is also why task 4.7 exists: a cached flag would go stale, so the section
      reads it from the server when the modal opens.

- [x] **4.3** Add the toggle to
      `frontend/src/components/campaign/modals/settings-modal.tsx`, alongside the
      existing `extend_calendar` checkbox. Only render it for signed-in users whose
      campaign is synced — a local-only campaign has nothing to share (§1.1).

- [x] **4.4** When sharing is on, show the public URL with a copy-to-clipboard control.

- [x] **4.5** i18n keys in `frontend/src/locales/en.json` under `campaign.settings.*`.
      The description must state plainly that **anyone with the link can read the
      campaign, including notes and events, and that the linked party decks are
      published too**. Notes and events are free text and routinely contain both
      personal remarks and campaign spoilers.

- [x] **4.6** Confirm before enabling (not before disabling), consistent with how
      `campaign.actions.delete_confirm` guards the other destructive-ish action in that
      modal.

- [x] **4.7** Added during phase 4: `GET /v2/account/campaigns/:id/visibility`
      (backend + tests), because the batch response reflects the flag only as of the
      last sync — see the note on 4.2.

**Checkpoint 4:** `npm run check -w frontend`, `npm run build -w frontend`,
`npm run test -w frontend`, lint. Then manual QA by the project owner: enable sharing,
fetch the URL with `curl` and no headers, disable, confirm 404.

---

## 8. Phase 5 — Documentation

- [ ] **5.1** Document both endpoints in `docs/api.md`, including the payload shape and
      the `schema_version` compatibility promise: additive changes bump nothing,
      breaking changes bump `schema_version` and ship as a new field/endpoint rather
      than mutating v1 in place.

- [ ] **5.2** Update the `Status:` line here to **complete** and note the shipped date.

**Checkpoint 5:** lint the changed docs; no code changes expected.
