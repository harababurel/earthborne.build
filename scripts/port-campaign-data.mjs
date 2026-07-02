// One-off porting script: lifts Earthborne Rangers campaign content (valley map,
// path types, connections, missions, weather, guide entries) from the
// rangers-db predecessor into earthborne.build's data format.
//
// Strategy: the rangers-db data is regular object/array literals. We slice each
// literal out of its source file (bracket-matched, comment/string-aware) and
// evaluate it with light shims (`t` tag, `Path`/`ConnectionRestriction` enums) to
// get real JS values, then emit:
//   - frontend/src/store/lib/campaign/data/campaign-data.json (structural data)
//   - merged English display names into frontend/src/locales/en.json
//
// Names are NOT kept in the data file — they live in en.json under `campaign.*`
// (repo rule: no hardcoded UI text). Run: `node scripts/port-campaign-data.mjs`.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..");
const RDB = resolve(REPO, "../rangers-db/frontend/src");
const RC_DRAWABLE = resolve(REPO, "../RangersCards/app/src/main/res/drawable");

const hooks = readFileSync(resolve(RDB, "lib/hooks.ts"), "utf8");

// --- enum shims (mirror rangers-db types/types.ts) ---
const Path = {
  NONE: "none",
  WOODS: "woods",
  MOUNTAIN_PASS: "mountain_pass",
  OLD_GROWTH: "old_growth",
  LAKESHORE: "lakeshore",
  GRASSLAND: "grassland",
  RAVINE: "ravine",
  SWAMP: "swamp",
  RIVER: "river",
  ANCIENT_RUINS: "ancient_ruins",
  FLOODED_RUINS: "flooded_ruins",
  DEEP_ROOTS: "deep_roots",
  FUNGAL_FOREST: "fungal_forest",
  CAVE_SYSTEM: "cave_system",
  THOROUGHFARE: "thoroughfare",
  NIMBUS: "nimbus",
};
const ConnectionRestriction = {
  FLOODED_PASSAGE: "flooded_passage",
  LOCKED_PASSAGE: "locked_passage",
  OVERGROWN_PASSAGE: "overgrown_passage",
};
const t = (strings, ...vals) =>
  strings.reduce((acc, s, i) => acc + s + (i < vals.length ? vals[i] : ""), "");

// Slice the `[...]` array literal that follows `marker` in `src`, respecting
// strings, template literals, and comments.
function sliceArray(src, marker) {
  const at = src.indexOf(marker);
  if (at < 0) throw new Error(`marker not found: ${marker}`);
  let i = src.indexOf("[", at + marker.length);
  const start = i;
  let depth = 0;
  let str = null; // current string delimiter or null
  let comment = null; // "line" | "block" | null
  for (; i < src.length; i++) {
    const c = src[i];
    const next = src[i + 1];
    if (comment === "line") {
      if (c === "\n") comment = null;
      continue;
    }
    if (comment === "block") {
      if (c === "*" && next === "/") {
        comment = null;
        i++;
      }
      continue;
    }
    if (str) {
      if (c === "\\") {
        i++;
        continue;
      }
      if (c === str) str = null;
      continue;
    }
    if (c === "/" && next === "/") {
      comment = "line";
      i++;
      continue;
    }
    if (c === "/" && next === "*") {
      comment = "block";
      i++;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      str = c;
      continue;
    }
    if (c === "[") depth++;
    else if (c === "]") {
      depth--;
      if (depth === 0) return src.slice(start, i + 1);
    }
  }
  throw new Error(`unterminated array for marker: ${marker}`);
}

function evalArray(literal) {
  // Controlled eval of vendored rangers-db data literals (build-time only).
  return new Function(
    "Path",
    "ConnectionRestriction",
    "t",
    `return ${literal};`,
  )(Path, ConnectionRestriction, t);
}

const stripDemo = (cycles) => (cycles ?? ["core"]).filter((c) => c !== "demo");

// --- path types (terrains) ---
const rawPaths = evalArray(sliceArray(hooks, "const paths: PathType[] = "));
const terrainNames = {};
const pathTypes = [];
for (const p of rawPaths) {
  if (terrainNames[p.id]) continue; // file has a duplicate RIVER entry
  terrainNames[p.id] = p.name;
  pathTypes.push({ id: p.id, color: p.color, cycles: stripDemo(p.campaigns) });
}

// --- locations ---
const rawLocations = evalArray(
  sliceArray(hooks, "const locations: Omit<MapLocation, 'connections'>[] = "),
);
const locationNames = {};
const locations = rawLocations.map((l) => {
  locationNames[l.id] = l.name;
  const out = { id: l.id, type: l.type, cycles: stripDemo(l.cycles) };
  if (l.background) out.background = true;
  if (l.expansionConditions) out.expansionConditions = l.expansionConditions;
  return out;
});

// --- connections ---
const rawConnections = evalArray(
  sliceArray(hooks, "const CONNECTIONS: ConnectionType[] = "),
);
const connections = rawConnections.map((c) => {
  const out = { locA: c.locA, locB: c.locB, path: c.path };
  if (c.restriction) out.restriction = c.restriction;
  if (c.cycles) out.cycles = stripDemo(c.cycles);
  if (c.expansionConditions) out.expansionConditions = c.expansionConditions;
  return out;
});

// --- moon phases (per-day SVG path data, ported from RangersCards day_N.xml) ---
// day_14 reuses day_13 and day_29 reuses day_28 (mirrors moonIconsMap()).
const moonReuse = { 14: 13, 29: 28 };
function readMoonPath(day) {
  const src = moonReuse[day] ?? day;
  const xml = readFileSync(resolve(RC_DRAWABLE, `day_${src}.xml`), "utf8");
  const m = xml.match(/android:pathData="([^"]+)"/);
  // An empty vector = new moon (no illuminated arc drawn).
  return m ? m[1].trim() : "";
}
const moonPaths = {};
for (let day = 1; day <= 30; day++) moonPaths[day] = readMoonPath(day);
// Extended core days 31–45 continue the ~30-day cycle (best-effort; spot-check).
for (let day = 31; day <= 45; day++)
  moonPaths[day] = moonPaths[((day - 1) % 30) + 1];

// --- weather (hand-transcribed from Campaign.tsx useWeather; ids drive i18n) ---
const weatherNames = {
  a_perfect_day: "A Perfect Day",
  downpour: "Downpour",
  howling_wind: "Howling Winds",
  enveloping_silence: "Enveloping Silence",
  glitterain: "Glitterain",
  shimmering_runoff: "Shimmering Runoff",
};
const w = (start, end, valley_id, underground_id) => {
  const e = { start, end, valley_id };
  if (underground_id) e.underground_id = underground_id;
  return e;
};
const weather = {
  // Lure of the Valley (core) — also used by sib/sos which fold into core.
  core: [
    w(1, 3, "a_perfect_day"),
    w(4, 7, "downpour"),
    w(8, 9, "a_perfect_day"),
    w(10, 12, "downpour"),
    w(13, 14, "howling_wind"),
    w(15, 17, "downpour"),
    w(18, 20, "howling_wind"),
    w(21, 22, "a_perfect_day"),
    w(23, 25, "downpour"),
    w(26, 28, "howling_wind"),
    w(29, 30, "a_perfect_day"),
  ],
  coreExtended: [
    w(31, 33, "downpour"),
    w(34, 35, "a_perfect_day"),
    w(36, 39, "howling_wind"),
    w(40, 42, "downpour"),
    w(43, 45, "a_perfect_day"),
  ],
  loa: [
    w(1, 3, "downpour", "enveloping_silence"),
    w(4, 6, "a_perfect_day", "glitterain"),
    w(7, 8, "howling_wind", "shimmering_runoff"),
    w(9, 12, "downpour", "enveloping_silence"),
    w(13, 15, "a_perfect_day", "glitterain"),
    w(16, 18, "downpour", "enveloping_silence"),
    w(19, 21, "a_perfect_day", "glitterain"),
    w(22, 23, "howling_wind", "shimmering_runoff"),
    w(24, 27, "downpour", "enveloping_silence"),
    w(28, 30, "a_perfect_day", "glitterain"),
  ],
};
const maxDay = { core: 30, coreExtended: 45, loa: 30 };

// --- cycles / expansions / guide entries ---
const cycles = [{ id: "core" }, { id: "loa" }];
const cycleNames = {
  core: "Lure of the Valley",
  loa: "Legacy of the Ancestors",
};
const expansions = [
  { id: "sib", cycles: ["core"] },
  { id: "sos", cycles: ["core"] },
];
const expansionNames = {
  sib: "Spire in Bloom",
  sos: "Shadow of the Storm",
};
const restrictionNames = {
  flooded_passage: "Flooded Passage",
  locked_passage: "Locked Passage",
  overgrown_passage: "Overgrown Passage",
};

const guideEntries = {
  fixed: {
    core: { 1: ["1"], 3: ["94.1"], 4: ["1.04"] },
    loa: { 1: ["1"], 4: ["199.2"] },
  },
  expansionStarting: {
    sib: [{ day: 8, guides: ["216.1"] }],
    sos: [{ day: 24, guides: ["246.1"] }],
  },
};

// --- write data file ---
const dataPath = resolve(
  REPO,
  "frontend/src/store/lib/campaign/data/campaign-data.json",
);
const data = {
  cycles,
  expansions,
  pathTypes,
  locations,
  connections,
  weather,
  maxDay,
  moonPaths,
  guideEntries,
};
mkdirSync(dirname(dataPath), { recursive: true });
writeFileSync(dataPath, `${JSON.stringify(data, null, 2)}\n`);

// --- merge generated names into en.json under translation.campaign.data ---
// Kept under `data` so generated content names never collide with UI strings
// (e.g. `campaign.missions.add` vs the `journey` mission name).
const enPath = resolve(REPO, "frontend/src/locales/en.json");
const en = JSON.parse(readFileSync(enPath, "utf8"));
en.translation.campaign ??= {};
// Drop any flat name-maps from earlier script versions.
for (const k of [
  "cycles",
  "expansions",
  "locations",
  "terrain",
  "weather",
  "path_cards",
  "restrictions",
]) {
  if (en.translation.campaign[k]) delete en.translation.campaign[k];
}
// Missions are now sourced from ingested card data, not this file.
if (en.translation.campaign.data?.missions) {
  delete en.translation.campaign.data.missions;
}
en.translation.campaign.data = {
  cycles: cycleNames,
  expansions: expansionNames,
  locations: locationNames,
  terrain: terrainNames,
  weather: weatherNames,
  restrictions: restrictionNames,
};
writeFileSync(enPath, `${JSON.stringify(en, null, 2)}\n`);

console.info(
  `Ported: ${locations.length} locations, ${connections.length} connections, ` +
    `${pathTypes.length} terrains, ${Object.keys(moonPaths).length} moon days.`,
);
