import archeologicalOutpostUrl from "./locations/archeological-outpost.svg";
import atroxMountainUrl from "./locations/atrox-mountain.svg";
import biologicalOutpostUrl from "./locations/biological-outpost.svg";
import boulderFieldUrl from "./locations/boulder-field.svg";
import bowlOfTheSunUrl from "./locations/bowl-of-the-sun.svg";
import branchUrl from "./locations/branch.svg";
import crossroadsStationUrl from "./locations/crossroads-station.svg";
import goldenShoreUrl from "./locations/golden-shore.svg";
import greenbriarKnollUrl from "./locations/greenbriar-knoll.svg";
import headwatersStationUrl from "./locations/headwaters-station.svg";
import kobosMarketUrl from "./locations/kobos-market.svg";
import marshOfRebirthUrl from "./locations/marsh-of-rebirth.svg";
import meadowUrl from "./locations/meadow.svg";
import michaelsBogUrl from "./locations/michaels-bog.svg";
import moundOfTheNavigatorUrl from "./locations/mound-of-the-navigator.svg";
import mountNimUrl from "./locations/mount-nim.svg";
import northernOutpostUrl from "./locations/northern-outpost.svg";
import ringsOfTheMoonUrl from "./locations/rings-of-the-moon.svg";
import spireUrl from "./locations/spire.svg";
import stoneweaverBridgeUrl from "./locations/stoneweaver-bridge.svg";
import sunkenOutpostUrl from "./locations/sunken-outpost.svg";
import terravoreUrl from "./locations/terravore.svg";
import theAlluvialRuinsUrl from "./locations/the-alluvial-ruins.svg";
import theConcordantZigguratsUrl from "./locations/the-concordant-ziggurats.svg";
import theCypressCitadelUrl from "./locations/the-cypress-citadel.svg";
import theFracturedWallUrl from "./locations/the-fractured-wall.svg";
import theFrowningGateUrl from "./locations/the-frowning-gate.svg";
import theFurrowUrl from "./locations/the-furrow.svg";
import theGreenbridgeUrl from "./locations/the-greenbridge.svg";
import theHighBasinUrl from "./locations/the-high-basin.svg";
import thePhilosophersGardenUrl from "./locations/the-philosophers-garden.svg";
import thePlummetUrl from "./locations/the-plummet.svg";
import theTumbledownUrl from "./locations/the-tumbledown.svg";
import watchersRockUrl from "./locations/watchers-rock.svg";
import whiteSkyUrl from "./locations/white-sky.svg";
import lakeshoreUrl from "./path-terrain/lakeshore.svg";
import mountainPassUrl from "./path-terrain/mountain-pass.svg";
import oldGrowthUrl from "./path-terrain/old-growth.svg";
import woodsUrl from "./path-terrain/woods.svg";

export const locationSymbolUrls = {
  "Archeological Outpost": archeologicalOutpostUrl,
  "Atrox Mountain": atroxMountainUrl,
  "Biological Outpost": biologicalOutpostUrl,
  "Boulder Field": boulderFieldUrl,
  "Bowl of the Sun": bowlOfTheSunUrl,
  Branch: branchUrl,
  "Crossroads Station": crossroadsStationUrl,
  "Golden Shore": goldenShoreUrl,
  "Greenbriar Knoll": greenbriarKnollUrl,
  "Headwaters Station": headwatersStationUrl,
  "Kobo's Market": kobosMarketUrl,
  "Marsh of Rebirth": marshOfRebirthUrl,
  Meadow: meadowUrl,
  "Michael's Bog": michaelsBogUrl,
  "Mound of the Navigator": moundOfTheNavigatorUrl,
  "Mount Nim": mountNimUrl,
  "Northern Outpost": northernOutpostUrl,
  "Rings of the Moon": ringsOfTheMoonUrl,
  Spire: spireUrl,
  "Stoneweaver Bridge": stoneweaverBridgeUrl,
  "Sunken Outpost": sunkenOutpostUrl,
  Terravore: terravoreUrl,
  "The Alluvial Ruins": theAlluvialRuinsUrl,
  "The Concordant Ziggurats": theConcordantZigguratsUrl,
  "The Cypress Citadel": theCypressCitadelUrl,
  "The Fractured Wall": theFracturedWallUrl,
  "The Frowning Gate": theFrowningGateUrl,
  "The Furrow": theFurrowUrl,
  "The Greenbridge": theGreenbridgeUrl,
  "The High Basin": theHighBasinUrl,
  "The Philosopher's Garden": thePhilosophersGardenUrl,
  "The Plummet": thePlummetUrl,
  "The Tumbledown": theTumbledownUrl,
  "Watcher's Rock": watchersRockUrl,
  "White Sky": whiteSkyUrl,
} as const;

export const pathTerrainSymbolUrls = {
  Lakeshore: lakeshoreUrl,
  "Mountain Pass": mountainPassUrl,
  "Old-growth": oldGrowthUrl,
  Woods: woodsUrl,
} as const;

export type LocationSymbolName = keyof typeof locationSymbolUrls;
export type PathTerrainSymbolName = keyof typeof pathTerrainSymbolUrls;

// Normalized map for case-insensitive lookup with optional "The " prefix.
export const locationSymbolUrlsByNormalizedName: Record<string, string> =
  Object.fromEntries(
    Object.entries(locationSymbolUrls).flatMap(([name, url]) => {
      const lower = name.toLowerCase();
      const withoutThe = lower.startsWith("the ") ? lower.slice(4) : null;
      return withoutThe
        ? [
            [lower, url],
            [withoutThe, url],
          ]
        : [[lower, url]];
    }),
  );
