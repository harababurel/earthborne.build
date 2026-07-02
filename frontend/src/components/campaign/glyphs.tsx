import { LockIcon, SproutIcon, WavesIcon } from "lucide-react";
import {
  locationSymbolUrlsByNormalizedName,
  pathTerrainSymbolUrls,
} from "@/assets/symbols";
import { cx } from "@/utils/cx";
import css from "./glyphs.module.css";

// Terrain id (e.g. "old_growth") → the symbol map's display-name key.
const TERRAIN_SYMBOL_KEY: Record<string, keyof typeof pathTerrainSymbolUrls> = {
  old_growth: "Old-growth",
  mountain_pass: "Mountain Pass",
  woods: "Woods",
  lakeshore: "Lakeshore",
  grassland: "Grassland",
  ravine: "Ravine",
  swamp: "Swamp",
  river: "River",
  ancient_ruins: "Ancient Ruins",
  flooded_ruins: "Flooded Ruins",
  deep_roots: "Deep Roots",
  fungal_forest: "Fungal Forest",
  cave_system: "Cave System",
  thoroughfare: "Thoroughfare",
  nimbus: "Nimbus",
};

export function TerrainGlyph({
  terrain,
  className,
}: {
  terrain: string;
  className?: string;
}) {
  const key = TERRAIN_SYMBOL_KEY[terrain];
  const url = key ? pathTerrainSymbolUrls[key] : undefined;
  if (!url) return null;
  return <img alt="" className={cx(css["glyph"], className)} src={url} />;
}

// Connection restrictions (see `campaign.data.restrictions`) have no official
// symbol assets, so use evocative icon stand-ins.
const RESTRICTION_ICONS: Record<string, React.ComponentType> = {
  flooded_passage: WavesIcon,
  locked_passage: LockIcon,
  overgrown_passage: SproutIcon,
};

export function RestrictionGlyph({
  restriction,
  className,
}: {
  restriction: string;
  className?: string;
}) {
  const Icon = RESTRICTION_ICONS[restriction];
  if (!Icon) return null;
  return (
    <span className={cx(css["glyph-icon"], className)}>
      <Icon />
    </span>
  );
}

// Location glyphs are keyed by normalized English name; only "background"
// locations have one, so this returns null (caller falls back to text) otherwise.
export function LocationGlyph({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const url = locationSymbolUrlsByNormalizedName[name.toLowerCase()];
  if (!url) return null;
  return <img alt="" className={cx(css["glyph"], className)} src={url} />;
}
