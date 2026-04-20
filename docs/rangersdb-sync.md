# RangersDB Deck Syncing Investigation

Based on an architectural investigation of both `arkham.build` and the `rangersdb.com` platform, here is an assessment of the feasibility of implementing deck syncing in `earthborne.build`.

## 1. Core Architecture Differences

- **ArkhamDB (Supported in `arkham.build`):** Uses a traditional PHP (Symfony) backend that natively implements an **OAuth2 provider** and a standard REST API. This makes 2-way syncing straightforward, as `arkham.build` can redirect users to ArkhamDB to authorize access and securely receive an API token.
- **RangersDB:** Is a modern React/Next.js application. Its backend relies on **Firebase Authentication** for user accounts and a **Hasura GraphQL API** (`https://gapi.rangersdb.com/v1/graphql`) for its database.

## 2. Reading Public Decks (Highly Feasible)

Implementing a feature to **import public decks** (e.g., pasting a RangersDB deck URL to load it into `earthborne.build`) is very feasible.

- The GraphQL API is open for public queries.
- A quick schema introspection shows that the `rangers_deck` type has fields incredibly similar to ArkhamDB (e.g., `slots`, `side_slots`, `extra_slots`, `meta`, `version`, `previous_deck`, `next_deck`).
- Because the data shape matches what the app already expects, building a read-only adapter would be quick.

## 3. User Authentication & 2-Way Syncing (Currently Blocked)

Implementing **2-way syncing** (publishing decks to RangersDB or reading a user's private decks) is **currently infeasible without developer collaboration**.

- Firebase Authentication is designed for 1st-party clients and does not provide an out-of-the-box OAuth2 flow for third-party apps to request access scopes.
- For `earthborne.build` to push decks to the GraphQL endpoint, it would require a valid Firebase JSON Web Token (JWT) belonging to the user.
- Since we cannot (and absolutely should not) ask users to enter their RangersDB username and password directly into our app, there is no secure way to acquire this token.

## Recommended Next Steps

If 2-way syncing is a strict requirement, the best path forward is to reach out to the developer of RangersDB (who appears to be active on GitHub under `Evgeny727`, maintaining the RangersCards Android app). We would need to request that they either:

1. Implement **Personal Access Tokens (PATs)** in the RangersDB UI that users can generate and paste into `earthborne.build`.
2. Build a lightweight OAuth wrapper around their Firebase Auth implementation.

In the meantime, we could confidently implement a read-only "Import from RangersDB URL" feature using their public GraphQL API.
