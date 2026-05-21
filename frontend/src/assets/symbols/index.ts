import archeologicalOutpostUrl from "./locations/archeological-outpost.svg";
import atroxMountainUrl from "./locations/atrox-mountain.svg";
import mountainPassUrl from "./path-terrain/mountain-pass.svg";
import oldGrowthUrl from "./path-terrain/old-growth.svg";

export const locationSymbolUrls = {
  "Archeological Outpost": archeologicalOutpostUrl,
  "Atrox Mountain": atroxMountainUrl,
} as const;

export const pathTerrainSymbolUrls = {
  "Mountain Pass": mountainPassUrl,
  "Old-growth": oldGrowthUrl,
} as const;

export type LocationSymbolName = keyof typeof locationSymbolUrls;
export type PathTerrainSymbolName = keyof typeof pathTerrainSymbolUrls;
