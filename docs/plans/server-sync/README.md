# Remote sync for decks & campaigns — implementation plan

Status: **proposed** (not started)

This plan adds optional remote storage and cross-device sync for user data
(decks, campaigns, folders). Local IndexedDB remains the source of truth for
the UI; a remote replica is what other devices converge on.

There are **two sync providers** behind one shared engine, chosen per
deployment:

| Deployment | Provider | Identity | Where user data lives |
| --- | --- | --- | --- |
| Self-hosted | `server` | username + password (client-side derived) | the deployment's own SQLite, next to card data |
| Hosted (earthborne.build) | `google-drive` | Google SSO | the user's own Drive `appDataFolder` — **no user data on the server**, backup by default |

The engine (dirty tracking, envelopes, sync cycle, conflicted copies, version
skew) is provider-agnostic. Providers implement a narrow pull/push interface
and differ in guarantees: the server provider has true compare-and-set;
the Drive provider is best-effort LWW (see 05 for the honest limits).

## Plan documents

New here? Start with [BRIEF.md](./BRIEF.md) — goals, approach and trade-offs
in plain language.

| Doc | Scope |
| --- | --- |
| [01-backend.md](./01-backend.md) | `server` provider backend: SQLite schema, sync API routes, auth, tests |
| [02-sync-engine.md](./02-sync-engine.md) | Provider-agnostic engine: sync slice, provider interface, dirty tracking, cycle, conflicts |
| [03-ui.md](./03-ui.md) | Settings UI (both providers), sync status, first-sync merge flow |
| [04-hardening-and-rollout.md](./04-hardening-and-rollout.md) | Version skew, starter-deck dedupe, docs, rollout order |
| [05-google-drive-provider.md](./05-google-drive-provider.md) | `google-drive` provider: Google SSO, Drive data layout, token lifecycle, degraded-conflict mode |

Dependency order: 01 → 02 → 03 for the server provider; 05 depends on 02 and
can land after the server provider ships (recommended — it validates the
engine against the provider with the strongest semantics first). 04 items
interleave once 02 works end-to-end.

Which providers a build offers is frontend deploy config (e.g.
`VITE_SYNC_PROVIDERS="server"` for self-host builds,
`"google-drive"` for the hosted instance; both is legal and renders as a
choice in settings).

## Architecture decision (recap)

**Chosen: async background sync layered on the existing persistence pipeline,
behind a pluggable provider interface.**

- Every mutating store action already funnels through `dehydrate()` in
  `frontend/src/store/persist/index.ts`. The sync engine hooks in there —
  none of the ~46 action call sites change.
- The app stays fully offline-capable. Sync is opt-in; when disabled or
  unreachable, behavior is identical to today.
- Rejected alternative: direct-save (server as source of truth per mutation).
  It would require threading loading/error/optimistic states through every
  store action and would break offline use.

## Sync model

- **Unit of sync: whole entities.** Three entity types:
  - `deck` — a `Deck` document plus a small sidecar (its history chain,
    folder assignment). Public-share markers stay per-device — the device
    that shared a deck owns its share (see 01). Envelope defined in 01.
  - `campaign` — a `Campaign` document.
  - `folder` — a `Folder` object from `data.folders`.
- **Not synced (initially):** `deckEdits` (unsaved in-progress edits),
  `undoHistory`, `settings`, `achievements`, `metadata` (card data — already
  server-provided). Settings/achievements can become entity types later
  without schema changes.
- **Identity (per provider):**
  - `server`: opt-in username + password, hashed **client-side** into a
    deterministic credential (account id from the normalized username, bearer
    token from a slow KDF over the password). Same credentials on any device
    yield the same account — recoverable and shareable (a play group can
    share one account). The server never sees the password and stores only a
    hash of the derived token. No email, no reset flow (see non-goals).
  - `google-drive`: Google SSO. Recovery and cross-device identity are the
    user's Google account; the hosted deployment stores no accounts at all.
- **Concurrency control:** provider-dependent, expressed as a capability flag.
  - `server`: per-entity `revision` (compare-and-set on push) plus a
    per-account monotonically increasing `seq` for cheap "changes since
    cursor" pulls. Stale writes are rejected — conflicts are guaranteed to
    be detected.
  - `google-drive`: Drive's changes feed provides the pull cursor, but Drive
    has no reliable compare-and-set, so conflict detection is best-effort
    (pull-before-push catches nearly all; a small lost-update window remains
    — documented in 05).
- **Conflict resolution:** last-write-wins by the entity's `date_update`,
  resolved client-side. The losing side of a genuine concurrent edit is
  preserved as a local "conflicted copy" (new id) instead of being discarded.
  No CRDTs / field merging — entities are small documents.
- **Deletes:** tombstones (a `deleted` flag on the server record; file
  removal reported by the changes feed on Drive), so deletions propagate
  instead of resurrecting on the next pull.

## Sync cycle (client)

```
trigger (init | debounce after local write | 60s interval | tab focus | retry)
  └─> pull changes since cursor ──> apply to store (skip decks with open edits)
  └─> compute dirty entities (local snapshot vs last-synced fingerprints)
  └─> push dirty batch (base revisions)
        ├─ ok        → record new revisions
        └─ conflict  → LWW by date_update; loser becomes conflicted copy; re-push
  └─> persist cursor + snapshot via existing dehydrate
```

## Key existing code the plan builds on

| Concern | Where |
| --- | --- |
| Persistence funnel (hook point) | `frontend/src/store/persist/index.ts` (`dehydrate`) |
| Applying external state to a live store | `tabSyncListener` in `frontend/src/main.tsx`, `frontend/src/store/persist/tab-sync.ts` |
| Client identity precedent | `app.clientId` (`frontend/src/store/slices/app.ts`, `selectClientId`) |
| JSON-blob entity storage precedent | `shared_deck` table, `backend/src/routes/sharing.ts` |
| API client with error handling | `frontend/src/store/services/requests/shared.ts` (`apiV2Request`) |
| Backend route wiring | `backend/src/app.ts` (`appFactory`) |
| Backend test harness (in-memory SQLite, no mocks) | `backend/src/tests/test-utils.ts` |
| State schema versioning / migrations | `frontend/src/store/persist/storage.ts` (`VERSION`), `persist/migrate.ts` |

## Out of scope

- Full account infrastructure (email, passkeys, password reset) for the
  `server` provider. Credentials are username + password with client-side
  derivation only; forgetting them means starting a new account. On the
  hosted deployment, recovery is simply the user's Google account.
- Server-mediated Drive access (the backend writing to Drive on the user's
  behalf). The Drive provider is strictly client ↔ Drive; the hosted server
  never holds user data **or** Google credentials (see 05 for the token
  lifecycle this implies).
- Syncing the deck-sharing feature's published decks (that is a separate,
  public-publishing concern and keeps working unchanged).
- Real-time / multiplayer editing. Interval + focus-triggered pull is enough
  for a solo deckbuilder moving between devices.
