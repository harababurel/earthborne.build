import type { Id } from "@earthborne-build/shared";
import { describe, expect, it } from "vitest";
import { makeSyncItem, makeTestDeck } from "@/test/factories";
import {
  applyRemoteDeckReconciliation,
  type ReconciliationItemPlan,
  reconcileItems,
} from "./sync-reconciliation";

describe("sync-reconciliation - reconcileItems()", () => {
  const localUpdateClean = "2026-07-07T12:00:00Z";
  const localUpdateDirty = "2026-07-07T14:00:00Z";
  const lastSyncedAt = new Date("2026-07-07T13:00:00Z").getTime();
  const matchRevision = "rev-12345";
  const mismatchRevision = "rev-54321";

  // Reusable fixtures creator
  const setupTest = ({
    hasLocal = false,
    isDirty = false,
    hasSync = false,
    remoteRevision = matchRevision,
    syncRevision = matchRevision,
  }: {
    hasLocal?: boolean;
    isDirty?: boolean;
    hasSync?: boolean;
    remoteRevision?: string;
    syncRevision?: string;
  } = {}) => {
    const local: Record<string, { id: Id; date_update: string }> = hasLocal
      ? {
          item1: {
            id: "item1",
            date_update: isDirty ? localUpdateDirty : localUpdateClean,
          },
        }
      : {};

    const syncItems: Record<
      string,
      { version: string | null; status: "synced"; lastSyncedAt: number }
    > = hasSync
      ? {
          item1: {
            version: syncRevision,
            status: "synced" as const,
            lastSyncedAt,
          },
        }
      : {};

    const manifest = remoteRevision
      ? [{ id: "item1", revision: remoteRevision }]
      : [];

    return { local, syncItems, manifest };
  };

  it("handles R-only: no local, no sync -> download", () => {
    const { local, syncItems, manifest } = setupTest({
      hasLocal: false,
      hasSync: false,
      remoteRevision: matchRevision,
    });
    const plan = reconcileItems(local, syncItems, manifest);
    expect(plan.downloads).toContain("item1");
    expect(plan.uploads).toHaveLength(0);
    expect(plan.pushes).toHaveLength(0);
    expect(plan.localDeletions).toHaveLength(0);
    expect(plan.remoteDeletions).toHaveLength(0);
    expect(plan.conflicts).toHaveLength(0);
  });

  it("handles R-only: no local, has sync (deleted locally) -> remote deletion", () => {
    const { local, syncItems, manifest } = setupTest({
      hasLocal: false,
      hasSync: true,
      remoteRevision: matchRevision,
    });
    const plan = reconcileItems(local, syncItems, manifest);
    expect(plan.remoteDeletions).toContain("item1");
    expect(plan.downloads).toHaveLength(0);
  });

  it("handles L-only: has local, no sync (never synced) -> upload", () => {
    const { local, syncItems, manifest } = setupTest({
      hasLocal: true,
      hasSync: false,
      remoteRevision: "", // Not in manifest
    });
    const plan = reconcileItems(local, syncItems, manifest);
    expect(plan.uploads).toContain("item1");
    expect(plan.downloads).toHaveLength(0);
    expect(plan.pushes).toHaveLength(0);
  });

  it("handles L-only: has local, has sync (deleted on another device) -> local deletion", () => {
    const { local, syncItems, manifest } = setupTest({
      hasLocal: true,
      hasSync: true,
      remoteRevision: "", // Not in manifest
    });
    const plan = reconcileItems(local, syncItems, manifest);
    expect(plan.localDeletions).toContain("item1");
    expect(plan.uploads).toHaveLength(0);
  });

  // Exhaustive 4 core matrix cases for items in both sets
  it("matrix case 1: revision matches, local clean -> nothing", () => {
    const { local, syncItems, manifest } = setupTest({
      hasLocal: true,
      hasSync: true,
      isDirty: false,
      remoteRevision: matchRevision,
      syncRevision: matchRevision,
    });
    const plan = reconcileItems(local, syncItems, manifest);
    expect(plan.downloads).toHaveLength(0);
    expect(plan.uploads).toHaveLength(0);
    expect(plan.pushes).toHaveLength(0);
    expect(plan.conflicts).toHaveLength(0);
  });

  it("matrix case 2: revision matches, local dirty -> push (PUT)", () => {
    const { local, syncItems, manifest } = setupTest({
      hasLocal: true,
      hasSync: true,
      isDirty: true,
      remoteRevision: matchRevision,
      syncRevision: matchRevision,
    });
    const plan = reconcileItems(local, syncItems, manifest);
    expect(plan.pushes).toContain("item1");
    expect(plan.downloads).toHaveLength(0);
    expect(plan.conflicts).toHaveLength(0);
  });

  it("matrix case 3: revision mismatch, local clean -> download", () => {
    const { local, syncItems, manifest } = setupTest({
      hasLocal: true,
      hasSync: true,
      isDirty: false,
      remoteRevision: mismatchRevision,
      syncRevision: matchRevision,
    });
    const plan = reconcileItems(local, syncItems, manifest);
    expect(plan.downloads).toContain("item1");
    expect(plan.pushes).toHaveLength(0);
    expect(plan.conflicts).toHaveLength(0);
  });

  it("matrix case 4: revision mismatch, local dirty -> conflict", () => {
    const { local, syncItems, manifest } = setupTest({
      hasLocal: true,
      hasSync: true,
      isDirty: true,
      remoteRevision: mismatchRevision,
      syncRevision: matchRevision,
    });
    const plan = reconcileItems(local, syncItems, manifest);
    expect(plan.conflicts).toContainEqual({
      id: "item1",
      remoteVersion: mismatchRevision,
      kind: "update",
    });
    expect(plan.downloads).toHaveLength(0);
    expect(plan.pushes).toHaveLength(0);
  });
});

describe("sync-reconciliation - applyRemoteDeckReconciliation()", () => {
  const lastSyncedAt = new Date("2026-07-07T13:00:00Z").getTime();
  const localRevision = "rev-local";
  const remoteRevision = "rev-remote";

  const emptyPlan: ReconciliationItemPlan = {
    downloads: [],
    uploads: [],
    pushes: [],
    localDeletions: [],
    remoteDeletions: [],
    conflicts: [],
  };

  const makeInput = (
    plan: Partial<ReconciliationItemPlan>,
    overrides: Partial<
      Parameters<typeof applyRemoteDeckReconciliation>[0]
    > = {},
  ) => ({
    accountId: "account-id",
    dataDecks: {
      "deck-1": makeTestDeck({
        id: "deck-1",
        name: "Local edit",
        date_update: "2026-07-07T14:00:00.000Z",
      }),
    },
    deckFolders: {},
    history: { "deck-1": [] },
    undoHistory: {},
    deckEdits: {},
    manifestDecks: [{ id: "deck-1", revision: remoteRevision }],
    plan: { ...emptyPlan, ...plan },
    remoteDecks: [],
    syncDecks: {
      accountId: "account-id",
      manifestVersion: null,
      lastSyncedAt: null,
      status: "synced" as const,
      error: null,
      items: {
        "deck-1": makeSyncItem({ version: localRevision, lastSyncedAt }),
      },
    },
    ...overrides,
  });

  it("marks planned conflicts instead of stamping them as synced", () => {
    const result = applyRemoteDeckReconciliation(
      makeInput({
        conflicts: [
          { id: "deck-1", remoteVersion: remoteRevision, kind: "update" },
        ],
      }),
    );

    const item = result.syncDecks.items["deck-1"];
    expect(item.status).toBe("conflict");
    expect(item.conflict).toEqual({
      kind: "update",
      remoteVersion: remoteRevision,
    });
    // Version and lastSyncedAt describe the last agreed state; they must not
    // be advanced to the remote revision the client has never seen.
    expect(item.version).toBe(localRevision);
    expect(item.lastSyncedAt).toBe(lastSyncedAt);
    expect(result.decks["deck-1"].name).toBe("Local edit");
    expect(result.syncDecks.status).toBe("conflict");
  });

  it("marks never-synced id collisions as conflicts", () => {
    const input = makeInput({
      conflicts: [
        { id: "deck-1", remoteVersion: remoteRevision, kind: "update" },
      ],
    });
    input.syncDecks = { ...input.syncDecks, items: {} };

    const result = applyRemoteDeckReconciliation(input);

    const item = result.syncDecks.items["deck-1"];
    expect(item.status).toBe("conflict");
    expect(item.version).toBeNull();
  });

  it("leaves items awaiting a push untouched", () => {
    const result = applyRemoteDeckReconciliation(
      makeInput({ pushes: ["deck-1"] }),
    );

    const item = result.syncDecks.items["deck-1"];
    expect(item.status).toBe("synced");
    expect(item.version).toBe(localRevision);
    // A stamped lastSyncedAt would erase the dirtiness that drives the push
    // retry if the push fails.
    expect(item.lastSyncedAt).toBe(lastSyncedAt);
  });

  it("stamps clean matching items with the manifest revision", () => {
    const input = makeInput({});
    input.manifestDecks = [{ id: "deck-1", revision: localRevision }];

    const result = applyRemoteDeckReconciliation(input);

    const item = result.syncDecks.items["deck-1"];
    expect(item.status).toBe("synced");
    expect(item.version).toBe(localRevision);
    expect(item.lastSyncedAt).toBeGreaterThan(lastSyncedAt);
  });

  it("applies downloads and local deletions", () => {
    const remoteDeck = makeTestDeck({ id: "deck-2", name: "Remote deck" });
    const input = makeInput(
      { downloads: ["deck-2"], localDeletions: ["deck-1"] },
      {
        manifestDecks: [{ id: "deck-2", revision: remoteRevision }],
        remoteDecks: [
          {
            data: remoteDeck,
            revision: remoteRevision,
            updatedAt: "2026-07-07T15:00:00.000Z",
          },
        ],
      },
    );

    const result = applyRemoteDeckReconciliation(input);

    expect(result.decks["deck-1"]).toBeUndefined();
    expect(result.syncDecks.items["deck-1"]).toBeUndefined();
    expect(result.decks["deck-2"]).toMatchObject({
      name: "Remote deck",
      source: "account",
    });
    expect(result.syncDecks.items["deck-2"]).toMatchObject({
      status: "synced",
      version: remoteRevision,
    });
    // The deck collection is keyed by data.history: downloads must gain an
    // entry, deletions must lose theirs.
    expect(result.history["deck-2"]).toEqual([]);
    expect(result.history["deck-1"]).toBeUndefined();
  });

  it("heals synced decks that are missing their collection-index entry", () => {
    const input = makeInput({});
    input.manifestDecks = [{ id: "deck-1", revision: localRevision }];
    // Simulates a deck downloaded before history entries were written.
    input.history = {};

    const result = applyRemoteDeckReconciliation(input);
    expect(result.history["deck-1"]).toEqual([]);
  });

  it("does not surface previous versions referenced from another deck's history", () => {
    const input = makeInput({});
    input.dataDecks = {
      "deck-1": makeTestDeck({ id: "deck-1" }),
      "deck-old": makeTestDeck({ id: "deck-old" }),
    };
    input.manifestDecks = [
      { id: "deck-1", revision: localRevision },
      { id: "deck-old", revision: remoteRevision },
    ];
    input.history = { "deck-1": ["deck-old"] };
    input.syncDecks = {
      ...input.syncDecks,
      items: {
        ...input.syncDecks.items,
        "deck-old": makeSyncItem({ version: remoteRevision, lastSyncedAt }),
      },
    };

    const result = applyRemoteDeckReconciliation(input);
    expect(result.history["deck-old"]).toBeUndefined();
    expect(result.history["deck-1"]).toEqual(["deck-old"]);
  });
});
