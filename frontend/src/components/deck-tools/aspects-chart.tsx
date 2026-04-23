import type { AspectKey } from "@arkham-build/shared";
import type { TFunction } from "i18next";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { PieSectorShapeProps } from "recharts";
import { Pie, PieChart, Sector, Tooltip } from "recharts";
import type { ChartableData } from "@/store/lib/deck-charts";
import { ASPECT_ICON_CLASS } from "../icons/aspect-icon";
import { chartTheme } from "./chart-theme";
import { ChartTooltip } from "./chart-tooltip";
import css from "./deck-tools.module.css";

type Props = {
  data: ChartableData<string>;
};

export function AspectsChart({ data }: Props) {
  const { t } = useTranslation();

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
          shape={renderAspectSector}
        />
        <Tooltip
          content={<ChartTooltip formatter={(d) => formatTooltip(t, d)} />}
        />
      </PieChart>
    </div>
  );
}

function renderAspectSector(props: PieSectorShapeProps) {
  const { cx = 0, cy = 0, outerRadius = 0, payload } = props;
  const aspect = payload?.x as AspectKey;
  const iconClass = ASPECT_ICON_CLASS[aspect] || "core-fit_chakra";
  const clipId = `clip-aspect-${aspect}`;

  return (
    <g>
      <defs>
        <clipPath id={clipId}>
          <Sector {...props} />
        </clipPath>
      </defs>
      <Sector {...props} />
      <foreignObject
        x={cx - outerRadius}
        y={cy - outerRadius}
        width={outerRadius * 2}
        height={outerRadius * 2}
        clipPath={`url(#${clipId})`}
        style={{ pointerEvents: "none" }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            opacity: 0.75,
          }}
        >
          <i className={iconClass} style={{ fontSize: outerRadius * 1.6 }} />
        </div>
      </foreignObject>
    </g>
  );
}

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
