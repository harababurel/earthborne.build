import type { AspectKey } from "@earthborne-build/shared";
import { cx } from "@/utils/cx";
import css from "./aspect-icon.module.css";

// biome-ignore lint/style/useComponentExportOnlyModules: constant exported alongside component
export const ASPECT_DISPLAY_NAMES: Record<AspectKey, string> = {
  AWA: "awareness",
  FIT: "fitness",
  FOC: "focus",
  SPI: "spirit",
};

// biome-ignore lint/style/useComponentExportOnlyModules: constant exported alongside component
export const ASPECT_ICON_CLASS: Record<AspectKey, string> = {
  AWA: "core-awa_chakra",
  FIT: "core-fit_chakra",
  FOC: "core-foc_chakra",
  SPI: "core-spi_chakra",
};

// biome-ignore lint/style/useComponentExportOnlyModules: constant exported alongside component
export const ASPECT_ICON_GLYPH_CODE: Record<AspectKey, number> = {
  AWA: 0xe911,
  FIT: 0xe910,
  FOC: 0xe90f,
  SPI: 0xe90e,
};

type Props = {
  aspect?: string | null;
  className?: string;
  size?: number | string;
};

export function AspectIcon({ aspect, className, size = "1em" }: Props) {
  const iconClass =
    (aspect && ASPECT_ICON_CLASS[aspect as AspectKey]) || ASPECT_ICON_CLASS.FIT;

  return (
    <i
      aria-hidden
      className={cx(
        iconClass,
        aspect && css[aspect.toLowerCase() as keyof typeof css],
        className,
      )}
      style={{
        display: "block",
        fontSize: size,
        lineHeight: 1,
      }}
    />
  );
}
