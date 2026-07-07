import { describe, expect, it } from "vitest";
import { getInitialSettings } from "../slices/settings";
import { fromRemoteSettings, toRemoteSettings } from "./settings-sync";

describe("toRemoteSettings()", () => {
  it("excludes local-only settings and preserves collection", () => {
    const settings = {
      ...getInitialSettings(),
      collection: { core: true },
      devModeEnabled: true,
      fontSize: 125,
      flags: { test: true },
    };

    const remote = toRemoteSettings(settings);

    expect(remote).toHaveProperty("collection");
    expect(remote).not.toHaveProperty("devModeEnabled");
    expect(remote).not.toHaveProperty("fontSize");
    expect(remote).not.toHaveProperty("flags");
  });

  it("keeps unset synced optionals undefined", () => {
    const settings = {
      ...getInitialSettings(),
      cardShowCollectionNumber: undefined,
      cardShowUniqueIcon: undefined,
    };

    const remote = toRemoteSettings(settings);

    expect(remote).not.toBeNull();
    expect(remote?.cardShowCollectionNumber).toBeUndefined();
    expect(remote?.cardShowUniqueIcon).toBeUndefined();
  });
});

describe("fromRemoteSettings()", () => {
  it("preserves local-only settings and updates collection", () => {
    const localSettings = {
      ...getInitialSettings(),
      collection: { core: true },
      devModeEnabled: true,
      fontSize: 140,
      locale: "en",
    };

    const remote = toRemoteSettings({
      ...getInitialSettings(),
      collection: { dunwich: true },
      devModeEnabled: false,
      fontSize: 90,
      locale: "de",
    });

    const next = fromRemoteSettings(remote, localSettings);

    expect(next).toMatchObject({
      collection: { dunwich: true },
      devModeEnabled: true,
      fontSize: 140,
      locale: "de",
    });
  });

  it("preserves omitted optionals as undefined", () => {
    const localSettings = {
      ...getInitialSettings(),
      cardShowCollectionNumber: true,
      cardShowUniqueIcon: true,
    };

    const remote = toRemoteSettings({
      ...getInitialSettings(),
      cardShowCollectionNumber: undefined,
      cardShowUniqueIcon: undefined,
    });

    const next = fromRemoteSettings(remote, localSettings);

    expect(next.cardShowCollectionNumber).toBeUndefined();
    expect(next.cardShowUniqueIcon).toBeUndefined();
  });

  it("returns local settings when no remote settings exist", () => {
    const localSettings = {
      ...getInitialSettings(),
      fontSize: 110,
    };

    expect(fromRemoteSettings(null, localSettings)).toBe(localSettings);
  });
});
