import type { ApproachKey } from "@earthborne-build/shared";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  Tooltip,
} from "recharts";
import type { ChartableData } from "@/store/lib/deck-charts";
import {
  APPROACH_ICON_DATA,
  ApproachIcon,
} from "../icons/approach-icon";
import { chartTheme } from "./chart-theme";
import { ChartTooltip } from "./chart-tooltip";
import css from "./deck-tools.module.css";

type Props = {
  data: ChartableData<string>;
};

export function ApproachIconsChart({ data }: Props) {
  const { t } = useTranslation();

  return (
    <div className={css["chart-container"]}>
      <h4 className={css["chart-title"]}>{t("deck.tools.skill_icons")}</h4>
      <RadarChart
        data={data}
        width="100%"
        height={chartTheme.height}
        cx="50%"
        cy="50%"
        outerRadius="80%"
        responsive
      >
        <PolarGrid
          stroke={chartTheme.colors.grid}
          strokeDasharray={chartTheme.gridDasharray}
        />
        <PolarAngleAxis
          dataKey="x"
          tick={<ApproachIconTick />}
          stroke={chartTheme.colors.axis}
          strokeWidth={chartTheme.strokeWidth.axis}
        />
        <PolarRadiusAxis tick={false} axisLine={false} domain={[0, "auto"]} />
        <Radar
          dataKey="y"
          stroke={chartTheme.colors.primary}
          strokeWidth={chartTheme.strokeWidth.line}
          fill={chartTheme.colors.primary}
          fillOpacity={0.15}
          dot={{
            r: chartTheme.scatter.r,
            fill: chartTheme.scatter.fill,
          }}
          isAnimationActive={false}
        />
        <Tooltip
          content={<ChartTooltip formatter={(d) => formatTooltip(t, d)} />}
        />
      </RadarChart>
    </div>
  );
}

function ApproachIconTick(props: {
  x?: number;
  y?: number;
  cx?: number;
  cy?: number;
  payload?: { value: string };
}) {
  const { x = 0, y = 0, cx = 0, cy = 0, payload } = props;
  const approach = (payload?.value ?? "conflict") as ApproachKey;
  const size = 24;

  const dx = x - cx;
  const dy = y - cy;
  const offsetFactor = 0.1;
  const adjustedX = x + dx * offsetFactor;
  const adjustedY = y + dy * offsetFactor;

  const { viewBox, path } = APPROACH_ICON_DATA[approach];

  return (
    <svg
      x={adjustedX - size / 2}
      y={adjustedY - size / 2}
      width={size}
      height={size}
      viewBox={viewBox}
      fill="currentColor"
      aria-hidden="true"
      style={{ color: "var(--text)" }}
    >
      <path d={path} />
    </svg>
  );
}

function formatTooltip(t: TFunction, data: Record<string, unknown>) {
  const approach = data.x as ApproachKey;
  const count = (data.y as number) ?? 0;

  return (
    <span className={css["tooltip-content"]}>
      {t("deck.tools.skill_icons_tooltip", {
        count,
        skill: t(`common.skill.${approach}`),
        icons: "",
      })}
      <span className={css["approach-icon-label"]}>
        <ApproachIcon approach={approach} />
      </span>
    </span>
  );
}
