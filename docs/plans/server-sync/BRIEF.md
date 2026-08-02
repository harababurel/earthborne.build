# Sync plan — the short version

**What we want:** decks, campaigns and folders that follow the user across
devices, instead of living only in one browser's storage. If a laptop dies or
a cache gets cleared, the collection survives.

**What doesn't change:** the app stays local-first. Everything keeps working
offline, saves are instant, and the browser copy remains the source of truth.
Sync is opt-in — a background process that reconciles the local copy with a
remote one, not a server the app depends on.

## The approach

The app already funnels every save through one persistence function. We hook
a sync engine in there: after a local save it pushes changed items to a
remote replica, and on startup/interval/focus it pulls what other devices
wrote. Each deck/campaign/folder syncs as a whole document. Conflicts are
rare (one person, two devices) and resolved by "newest edit wins" — and when
two devices genuinely edited the same thing, the loser is kept as a
"conflicted copy" rather than thrown away. Details:
[02-sync-engine.md](./02-sync-engine.md).

There are two interchangeable storage backends ("providers") behind that
engine:

1. **Self-hosted → our own backend.** Entities live in the deployment's
   SQLite next to the card data. Sign-up is just a username + password,
   hashed *in the browser* — the server never sees the password and stores no
   personal data at all. Same credentials on any device = same account, so
   it's recoverable and a play group can share one. Details:
   [01-backend.md](./01-backend.md).

2. **Hosted earthborne.build → Google sign-in + the user's own Google
   Drive.** The browser writes directly to a hidden app folder in the user's
   Drive; our server never touches their data or their Google tokens. Backup
   comes for free — the data is in their Google account. Details:
   [05-google-drive-provider.md](./05-google-drive-provider.md).

Which provider a deployment offers is build configuration. UI is one settings
section ([03-ui.md](./03-ui.md)); edge cases, hardening and rollout order are
in [04-hardening-and-rollout.md](./04-hardening-and-rollout.md).

## The trade-offs we're accepting

- **Whole-document sync, newest-wins.** No fancy merging. Simple to build and
  reason about; the cost is that two simultaneous edits to the *same* deck
  produce a duplicate to clean up instead of a merged deck. Fine for this
  app's usage pattern.
- **Username/password has no reset flow** (self-hosted). There's no email on
  file, on purpose. Forget the credentials → new account, re-upload from
  local (nothing is lost — local is the source of truth). The flip side of
  storing zero personal data.
- **Drive can't lock.** Google Drive has no reliable "only write if unchanged"
  operation, so on the hosted version, two devices writing the same deck
  within seconds of each other can silently drop one edit — where the
  self-hosted backend would catch it. That's the price of keeping user data
  entirely off our server. Judged acceptable for a solo deckbuilder.
- **Google verification is the schedule risk.** The Drive permission scope
  needs Google's app review before public use. The plan ships the self-hosted
  provider first and starts verification early, so the code is never waiting
  on us — only on Google.
- **Two providers is more surface than one.** Mitigated by a strict
  interface: the engine is identical for both, tested against the weaker
  (Drive-like) semantics from day one, and each provider is a thin adapter.

## Build order

Backend → engine + UI on the self-hosted provider (fully testable end-to-end
locally) → let it soak → Drive provider on top. Full sequencing in
[04-hardening-and-rollout.md](./04-hardening-and-rollout.md), architecture
overview in [README.md](./README.md).
