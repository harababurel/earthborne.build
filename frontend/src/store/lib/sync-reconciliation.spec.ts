import { describe, expect, it } from "vitest";
import { reconcileItems } from "./sync-reconciliation";

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
    const local = hasLocal
      ? {
          item1: {
            id: "item1",
            date_update: isDirty ? localUpdateDirty : localUpdateClean,
          },
        }
      : {};

    const syncItems = hasSync
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
