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
          label={renderAspectLabel}
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
  const aspect = props.payload?.x as string | undefined;
  const fill = aspect ? `var(--color-${aspect.toLowerCase()})` : "var(--text)";
  return <Sector {...props} fill={fill} />;
}

function renderAspectLabel(props: {
  cx?: number;
  cy?: number;
  midAngle?: number;
  innerRadius?: number;
  outerRadius?: number;
  payload?: { x: string };
}) {
  const {
    cx = 0,
    cy = 0,
    midAngle = 0,
    innerRadius = 0,
    outerRadius = 0,
    payload,
  } = props;
  if (!payload) return null;

  const RADIAN = Math.PI / 180;
  // Calculate center of the slice
  const radius = innerRadius + (outerRadius - innerRadius) * 0.6;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  const size = 24;

  const iconClass =
    ASPECT_ICON_CLASS[payload.x as AspectKey] || "core-fit_chakra";

  return (
    <foreignObject x={x - size / 2} y={y - size / 2} width={size} height={size}>
      <i
        className={iconClass}
        style={{
          fontSize: "24px",
          color: "white",
          opacity: 0.75,
        }}
      />
    </foreignObject>
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
