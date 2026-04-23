import { toChartableData } from "@/store/lib/deck-charts";
import type { ResolvedDeck } from "@/store/lib/types";
import { Plane } from "../ui/plane";
import { AspectsChart } from "./aspects-chart";
import { CostCurveChart } from "./cost-curve-chart";
import css from "./deck-tools.module.css";
import { SkillIconsChart } from "./skill-icons-chart";
import { TraitsChart } from "./traits-chart";

export default function ChartContainer(props: { deck: ResolvedDeck }) {
  const { deck } = props;

  return (
    <Plane className={css["charts-wrap"]}>
      <SkillIconsChart
        data={toChartableData(deck.stats.charts.approachIcons)}
      />
      <CostCurveChart data={toChartableData(deck.stats.charts.costCurve)} />
      <TraitsChart
        data={toChartableData(deck.stats.charts.traits, "value")}
        deck={deck}
      />
      <AspectsChart data={toChartableData(deck.stats.charts.aspects)} />
    </Plane>
  );
}
