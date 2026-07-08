import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHttpClient } from "@/store/services/http-client";
import {
  makeAuthenticatedAuth,
  makeCampaignSyncItem,
  makeData,
  makeSyncItem,
  makeSyncState,
  makeTestDeck,
} from "@/test/factories";
import { getMockStore } from "@/test/get-mock-store";

const REV_A = "11111111-1111-4111-8111-111111111111";
const REV_B = "22222222-2222-4222-8222-222222222222";
const REV_C = "33333333-3333-4333-8333-333333333333";

const UPDATED_AT = "2026-07-07T15:00:00.000Z";
const SYNCED_AT = new Date("2026-07-07T13:00:00.000Z").getTime();
const DIRTY_UPDATE = "2026-07-07T14:00:00.000Z";

type Route = {
  method: string;
  path: string;
  response: () => Response;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function emptyManifest() {
  return json({ decks: [], campaigns: [] });
}

describe("sync slice", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let routes: Route[];

  beforeEach(() => {
    routes = [];
    fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      const route = routes.find(
        (r) => r.method === method && url.endsWith(r.path),
      );
      if (!route) {
        return Promise.reject(new Error(`No mock route for ${method} ${url}`));
      }
      return Promise.resolve(route.response());
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  function makeClient(store: Awaited<ReturnType<typeof getMockStore>>) {
    return createHttpClient({
      apiUrl: "http://api",
      onUnauthorized: () => store.getState().handleUnauthorized(),
    });
  }

  function requests(method: string, path: string) {
    return fetchMock.mock.calls.filter(
      ([input, init]) =>
        (init?.method ?? "GET") === method && String(input).endsWith(path),
    );
  }

  it("uploads local-only decks during sync (mirror-everything)", async () => {
    const store = await getMockStore();
    store.setState({
      auth: makeAuthenticatedAuth(),
      data: makeData({
        decks: { "deck-1": makeTestDeck({ id: "deck-1" }) },
      }),
      sync: makeSyncState(),
    });

    routes.push(
      { method: "GET", path: "/sync/manifest", response: emptyManifest },
      {
        method: "POST",
        path: "/v2/account/decks",
        response: () => json({ revision: REV_A }, 201),
      },
    );

    await store.getState().syncDecks(makeClient(store));

    expect(requests("POST", "/v2/account/decks")).toHaveLength(1);
    expect(store.getState().sync.decks.items["deck-1"]).toMatchObject({
      status: "synced",
      version: REV_A,
    });
    expect(store.getState().sync.decks.status).toBe("synced");
  });

  it("downloads remote-only decks and removes remotely-deleted decks", async () => {
    const store = await getMockStore();
    store.setState({
      auth: makeAuthenticatedAuth(),
      data: makeData({
        decks: { "deck-gone": makeTestDeck({ id: "deck-gone" }) },
      }),
      sync: makeSyncState({
        deckItems: { "deck-gone": makeSyncItem({ version: REV_A }) },
      }),
    });

    routes.push(
      {
        method: "GET",
        path: "/sync/manifest",
        response: () =>
          json({
            decks: [{ id: "deck-new", revision: REV_B, updatedAt: UPDATED_AT }],
            campaigns: [],
          }),
      },
      {
        method: "POST",
        path: "/v2/account/decks/batch",
        response: () =>
          json({
            decks: [
              {
                data: makeTestDeck({ id: "deck-new", name: "Remote deck" }),
                revision: REV_B,
                updatedAt: UPDATED_AT,
              },
            ],
          }),
      },
    );

    await store.getState().syncDecks(makeClient(store));

    const state = store.getState();
    expect(state.data.decks["deck-gone"]).toBeUndefined();
    expect(state.sync.decks.items["deck-gone"]).toBeUndefined();
    expect(state.data.decks["deck-new"]).toMatchObject({
      name: "Remote deck",
      source: "account",
    });
    expect(state.sync.decks.items["deck-new"]).toMatchObject({
      status: "synced",
      version: REV_B,
    });
    // The deck collection is keyed by data.history — without an entry the
    // downloaded deck is invisible.
    expect(state.data.history["deck-new"]).toEqual([]);
    expect(state.data.history["deck-gone"]).toBeUndefined();
  });

  it("does not mirror unmodified starter decks, but syncs them once modified", async () => {
    const starter = makeTestDeck({
      id: "starter-1",
      tags: "premade",
      date_creation: "2026-01-01T00:00:00.000Z",
      date_update: "2026-01-01T00:00:00.000Z",
    });

    const store = await getMockStore();
    store.setState({
      auth: makeAuthenticatedAuth(),
      data: makeData({
        decks: { "starter-1": starter },
        history: { "starter-1": [] },
      }),
      sync: makeSyncState(),
    });

    routes.push(
      { method: "GET", path: "/sync/manifest", response: emptyManifest },
      {
        method: "POST",
        path: "/v2/account/decks",
        response: () => json({ revision: REV_A }, 201),
      },
    );

    await store.getState().syncDecks(makeClient(store));
    expect(requests("POST", "/v2/account/decks")).toHaveLength(0);

    store.setState({
      data: makeData({
        decks: {
          "starter-1": { ...starter, date_update: "2026-07-07T12:00:00.000Z" },
        },
        history: { "starter-1": [] },
      }),
    });

    await store.getState().syncDecks(makeClient(store));
    expect(requests("POST", "/v2/account/decks")).toHaveLength(1);
  });

  it("performs the first blob write when the account has none", async () => {
    const store = await getMockStore();
    store.setState({
      auth: makeAuthenticatedAuth(),
      sync: makeSyncState({
        settings: { accountId: null, revision: null },
      }),
    });

    routes.push(
      {
        method: "GET",
        path: "/v2/account/settings",
        response: () => json({ message: "Settings not found" }, 404),
      },
      {
        method: "PUT",
        path: "/v2/account/settings",
        response: () => json({ settings: { locale: "en" }, revision: REV_A }),
      },
    );

    await store.getState().loadRemoteSettings(makeClient(store));

    const putBody = JSON.parse(
      String(requests("PUT", "/v2/account/settings").at(-1)?.[1]?.body),
    );
    expect(putBody.expectedRevision).toBeNull();
    expect(store.getState().sync.settings).toMatchObject({
      status: "synced",
      revision: REV_A,
    });
  });

  it("surfaces a conflict for dirty decks changed remotely, leaving both copies alone", async () => {
    const store = await getMockStore();
    store.setState({
      auth: makeAuthenticatedAuth(),
      data: makeData({
        decks: {
          "deck-1": makeTestDeck({
            id: "deck-1",
            name: "Local edit",
            date_update: DIRTY_UPDATE,
          }),
        },
      }),
      sync: makeSyncState({
        deckItems: {
          "deck-1": makeSyncItem({ version: REV_A, lastSyncedAt: SYNCED_AT }),
        },
      }),
    });

    routes.push({
      method: "GET",
      path: "/sync/manifest",
      response: () =>
        json({
          decks: [{ id: "deck-1", revision: REV_B, updatedAt: UPDATED_AT }],
          campaigns: [],
        }),
    });

    await store.getState().syncDecks(makeClient(store));

    const state = store.getState();
    expect(state.data.decks["deck-1"].name).toBe("Local edit");
    expect(state.sync.decks.items["deck-1"]).toMatchObject({
      status: "conflict",
      version: REV_A,
      conflict: { kind: "update", remoteVersion: REV_B },
    });
    expect(state.sync.decks.status).toBe("conflict");
    // The conflicted deck must not be downloaded over the local copy.
    expect(requests("POST", "/v2/account/decks/batch")).toHaveLength(0);
  });

  it("keeps dirtiness when a reconciliation push fails, then retries on the next sync", async () => {
    const store = await getMockStore();
    store.setState({
      auth: makeAuthenticatedAuth(),
      data: makeData({
        decks: {
          "deck-1": makeTestDeck({ id: "deck-1", date_update: DIRTY_UPDATE }),
        },
      }),
      sync: makeSyncState({
        deckItems: {
          "deck-1": makeSyncItem({ version: REV_A, lastSyncedAt: SYNCED_AT }),
        },
      }),
    });

    const manifestRoute: Route = {
      method: "GET",
      path: "/sync/manifest",
      response: () =>
        json({
          decks: [{ id: "deck-1", revision: REV_A, updatedAt: UPDATED_AT }],
          campaigns: [],
        }),
    };

    routes.push(manifestRoute, {
      method: "PUT",
      path: "/v2/account/decks/deck-1",
      response: () => json({ message: "boom" }, 500),
    });

    await store.getState().syncDecks(makeClient(store));

    expect(store.getState().sync.decks.items["deck-1"]).toMatchObject({
      status: "error",
      version: REV_A,
      lastSyncedAt: SYNCED_AT,
    });

    // Second sync retries the push; this time it succeeds.
    routes = [
      manifestRoute,
      {
        method: "PUT",
        path: "/v2/account/decks/deck-1",
        response: () => json({ revision: REV_B }),
      },
    ];

    await store.getState().syncDecks(makeClient(store));

    expect(store.getState().sync.decks.items["deck-1"]).toMatchObject({
      status: "synced",
      version: REV_B,
    });
  });

  it("turns a push 409 into a conflict and resolves it by keeping the local version", async () => {
    const store = await getMockStore();
    store.setState({
      auth: makeAuthenticatedAuth(),
      data: makeData({
        decks: {
          "deck-1": makeTestDeck({ id: "deck-1", name: "Local edit" }),
        },
      }),
      sync: makeSyncState({
        deckItems: { "deck-1": makeSyncItem({ version: REV_A }) },
      }),
    });

    const client = makeClient(store);

    routes.push({
      method: "PUT",
      path: "/v2/account/decks/deck-1",
      response: () =>
        json(
          {
            message: "Stored deck revision does not match",
            cause: {
              data: makeTestDeck({ id: "deck-1", name: "Remote edit" }),
              revision: REV_B,
            },
          },
          409,
        ),
    });

    await expect(store.getState().pushDeck(client, "deck-1")).rejects.toThrow();

    expect(store.getState().sync.decks.items["deck-1"]).toMatchObject({
      status: "conflict",
      conflict: { kind: "update", remoteVersion: REV_B },
    });

    // "Keep this device's version": PUT with the server's current revision.
    routes = [
      {
        method: "PUT",
        path: "/v2/account/decks/deck-1",
        response: () => json({ revision: REV_C }),
      },
    ];

    await store.getState().resolveDeckConflictWithPush(client, "deck-1");

    const putBody = JSON.parse(
      String(requests("PUT", "/v2/account/decks/deck-1").at(-1)?.[1]?.body),
    );
    expect(putBody.expectedRevision).toBe(REV_B);
    expect(putBody.data.name).toBe("Local edit");
    expect(store.getState().sync.decks.items["deck-1"]).toMatchObject({
      status: "synced",
      version: REV_C,
    });
    expect(store.getState().data.decks["deck-1"].name).toBe("Local edit");
  });

  it("resolves a conflict by taking the server version", async () => {
    const store = await getMockStore();
    store.setState({
      auth: makeAuthenticatedAuth(),
      data: makeData({
        decks: {
          "deck-1": makeTestDeck({ id: "deck-1", name: "Local edit" }),
        },
      }),
      sync: makeSyncState({
        deckItems: {
          "deck-1": makeSyncItem({
            status: "conflict",
            version: REV_A,
            conflict: { kind: "update", remoteVersion: REV_B },
          }),
        },
      }),
    });

    routes.push({
      method: "POST",
      path: "/v2/account/decks/batch",
      response: () =>
        json({
          decks: [
            {
              data: makeTestDeck({ id: "deck-1", name: "Remote edit" }),
              revision: REV_B,
              updatedAt: UPDATED_AT,
            },
          ],
        }),
    });

    await store
      .getState()
      .resolveDeckConflictWithRefresh(makeClient(store), "deck-1");

    expect(store.getState().data.decks["deck-1"].name).toBe("Remote edit");
    expect(store.getState().sync.decks.items["deck-1"]).toMatchObject({
      status: "synced",
      version: REV_B,
    });
  });

  it("treats a missing remote deck as deleted when pushing a deletion", async () => {
    const store = await getMockStore();
    store.setState({
      auth: makeAuthenticatedAuth(),
      sync: makeSyncState({
        deckStatus: "error",
        deckItems: { "deck-1": makeSyncItem({ version: REV_A }) },
      }),
    });

    routes.push({
      method: "DELETE",
      path: "/v2/account/decks/deck-1",
      response: () => json({ message: "Deck not found" }, 404),
    });

    await expect(
      store.getState().pushDeckDeletion(makeClient(store), "deck-1", null),
    ).resolves.toBeUndefined();

    expect(store.getState().sync.decks.items["deck-1"]).toBeUndefined();
    expect(store.getState().sync.decks.status).not.toBe("error");
  });

  it("treats a missing remote campaign as deleted when pushing a deletion", async () => {
    const store = await getMockStore();
    store.setState({
      auth: makeAuthenticatedAuth(),
      sync: makeSyncState({
        campaignStatus: "error",
        campaignItems: {
          "campaign-1": makeCampaignSyncItem({ version: REV_A }),
        },
      }),
    });

    routes.push({
      method: "DELETE",
      path: "/v2/account/campaigns/campaign-1",
      response: () => json({ message: "Campaign not found" }, 404),
    });

    await expect(
      store
        .getState()
        .pushCampaignDeletion(makeClient(store), "campaign-1", null),
    ).resolves.toBeUndefined();

    expect(store.getState().sync.campaigns.items["campaign-1"]).toBeUndefined();
    expect(store.getState().sync.campaigns.status).not.toBe("error");
  });

  it("keeps non-404 deck deletion failures as sync errors", async () => {
    const store = await getMockStore();
    store.setState({
      auth: makeAuthenticatedAuth(),
      sync: makeSyncState({
        deckItems: { "deck-1": makeSyncItem({ version: REV_A }) },
      }),
    });

    routes.push({
      method: "DELETE",
      path: "/v2/account/decks/deck-1",
      response: () => json({ message: "boom" }, 500),
    });

    await expect(
      store.getState().pushDeckDeletion(makeClient(store), "deck-1", null),
    ).rejects.toThrow("boom");

    expect(store.getState().sync.decks.items["deck-1"]).toMatchObject({
      status: "error",
      version: REV_A,
    });
    expect(store.getState().sync.decks.status).toBe("error");
  });

  it("coalesces debounced campaign pushes per id", async () => {
    const store = await getMockStore();
    const campaignId = await store
      .getState()
      .createCampaign({ name: "Journey", cycle_id: "core" });

    store.setState({
      auth: makeAuthenticatedAuth(),
      sync: makeSyncState({
        campaignItems: {
          [campaignId]: makeCampaignSyncItem({ version: REV_A }),
        },
      }),
    });

    routes.push({
      method: "PUT",
      path: `/v2/account/campaigns/${campaignId}`,
      response: () => json({ revision: REV_B }),
    });

    vi.useFakeTimers();
    const client = makeClient(store);
    store.getState().scheduleCampaignPush(client, campaignId);
    store.getState().scheduleCampaignPush(client, campaignId);
    await vi.advanceTimersByTimeAsync(2500);
    vi.useRealTimers();

    expect(requests("PUT", `/v2/account/campaigns/${campaignId}`)).toHaveLength(
      1,
    );
    expect(store.getState().sync.campaigns.items[campaignId]).toMatchObject({
      status: "synced",
      version: REV_B,
    });
  });

  it("cancels pending debounced pushes on logout", async () => {
    const store = await getMockStore();
    const campaignId = await store
      .getState()
      .createCampaign({ name: "Journey", cycle_id: "core" });

    store.setState({
      auth: makeAuthenticatedAuth(),
      sync: makeSyncState({
        campaignItems: {
          [campaignId]: makeCampaignSyncItem({ version: REV_A }),
        },
      }),
    });

    vi.useFakeTimers();
    store.getState().scheduleCampaignPush(makeClient(store), campaignId);
    store
      .getState()
      .clearAccountState({ session: null, status: "unauthenticated" });
    await vi.advanceTimersByTimeAsync(2500);
    vi.useRealTimers();

    expect(requests("PUT", `/v2/account/campaigns/${campaignId}`)).toHaveLength(
      0,
    );
  });
});
