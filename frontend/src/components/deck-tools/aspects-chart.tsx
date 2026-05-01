import type { AspectKey } from "@earthborne-build/shared";
import type { TFunction } from "i18next";
import { useId, useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { PieSectorShapeProps } from "recharts";
import { Pie, PieChart, Sector, Tooltip } from "recharts";
import type { ChartableData } from "@/store/lib/deck-charts";
import {
  ASPECT_ICON_CLASS,
  ASPECT_ICON_GLYPH_CODE,
} from "../icons/aspect-icon";
import { chartTheme } from "./chart-theme";
import { ChartTooltip } from "./chart-tooltip";
import css from "./deck-tools.module.css";

type Props = {
  data: ChartableData<string>;
};

export function AspectsChart({ data }: Props) {
  const { t } = useTranslation();
  const chartId = sanitizeSvgId(useId());

  const normalizedData = useMemo(() => {
    return data.filter((tick) => tick.y !== 0);
  }, [data]);

  return (
    <div className={css["chart-container"]}>
      <h4 className={css["chart-title"]}>{t("deck.tools.factions")}</h4>
      <PieChart width="100%" height={chartTheme.height} responsive>
        <Pie
          data={normalizedData}
          dataKey="y"
          nameKey="x"
          cx="50%"
          cy="50%"
          outerRadius="90%"
          stroke={chartTheme.colors.pieStroke}
          strokeWidth={chartTheme.strokeWidth.pie}
          label={false}
          labelLine={false}
          isAnimationActive={false}
          shape={(props: PieSectorShapeProps) => (
            <AspectSector {...props} chartId={chartId} />
          )}
        />
        <Tooltip
          content={<ChartTooltip formatter={(d) => formatTooltip(t, d)} />}
        />
      </PieChart>
    </div>
  );
}

function AspectSector(props: PieSectorShapeProps & { chartId: string }) {
  const { cx = 0, cy = 0, outerRadius = 0, payload, chartId } = props;
  const aspect = payload?.x as AspectKey;
  const clipId = `clip-${chartId}-${aspect}`;
  const glyph = String.fromCharCode(
    ASPECT_ICON_GLYPH_CODE[aspect] ?? ASPECT_ICON_GLYPH_CODE.FIT,
  );
  const verticalOffset = ASPECT_ICON_VERTICAL_OFFSET[aspect] ?? 0.35;

  const fill = aspect
    ? `var(--color-${aspect.toLowerCase()})`
    : "var(--text-mythos)";

  return (
    <g>
      <defs>
        <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
          <Sector {...props} />
        </clipPath>
      </defs>
      <Sector {...props} fill={fill} />
      <g
        clipPath={`url(#${clipId})`}
        opacity={0.6}
        pointerEvents="none"
        aria-hidden
      >
        <text
          x={cx}
          y={cy}
          dy={`${verticalOffset}em`}
          fill="white"
          fontFamily="core"
          fontSize={outerRadius * 1.6}
          textAnchor="middle"
        >
          {glyph}
        </text>
      </g>
    </g>
  );
}

function sanitizeSvgId(id: string) {
  return id.replace(/[^a-zA-Z0-9_-]/g, "");
}

const ASPECT_ICON_VERTICAL_OFFSET: Record<AspectKey, number> = {
  AWA: 0.35,
  FIT: 0.45,
  FOC: 0.45,
  SPI: 0.35,
};

function formatTooltip(t: TFunction, data: Record<string, unknown>) {
  const aspect = data.x as string;
  const count = data.y as number;

  const iconClass = ASPECT_ICON_CLASS[aspect as AspectKey] || "core-fit_chakra";

  return (
    <span className={css["tooltip-content"]}>
      {count} {t(`common.factions.${aspect.toLowerCase()}`)}{" "}
      <i
        className={iconClass}
        style={{
          fontSize: "1.2em",
          verticalAlign: "middle",
          color: `var(--color-${aspect.toLowerCase()})`,
        }}
      />
    </span>
  );
}
