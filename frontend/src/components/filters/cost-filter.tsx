import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import {
  costToString,
  selectActiveListFilter,
  selectCostMinMax,
  selectFilterChanges,
} from "@/store/selectors/lists";
import { isCostFilterObject } from "@/store/slices/lists.type-guards";
import { assert } from "@/utils/assert";
import { RangeSelect } from "../ui/range-select";
import type { FilterProps } from "./filters.types";
import { FilterContainer } from "./primitives/filter-container";
import { useFilter } from "./primitives/filter-hooks";

const SLIDER_MIN = -1;

export function CostFilter({ id, resolvedDeck, targetDeck }: FilterProps) {
  const { t } = useTranslation();
  const filter = useStore((state) => selectActiveListFilter(state, id));

  assert(
    isCostFilterObject(filter),
    `CostFilter instantiated with '${filter?.type}'`,
  );

  const changes = useStore((state) =>
    selectFilterChanges(state, filter.type, filter.value),
  );

  const { min, max } = useStore((state) =>
    selectCostMinMax(state, resolvedDeck, targetDeck),
  );

  const { onReset, onChange, onOpenChange, locked } = useFilter(id);
  const sliderMax = Number.isFinite(max) ? Math.max(max, SLIDER_MIN) : 0;

  const onValueCommit = useCallback(
    (val: number[]) => {
      onChange({
        range: [val[0], val[1]],
      });
    },
    [onChange],
  );

  const onToggleOpen = useCallback(
    (val: boolean) => {
      const range = sanitizeCostRange(
        filter.value.range,
        SLIDER_MIN,
        sliderMax,
      );

      if (val && !rangesEqual(filter.value.range, range)) {
        onChange({
          range,
        });
      }
      onOpenChange(val);
    },
    [filter.value.range, sliderMax, onOpenChange, onChange],
  );

  const rangeValue = useMemo(() => {
    return sanitizeCostRange(filter.value.range, min, sliderMax);
  }, [filter.value.range, min, sliderMax]);

  return (
    <FilterContainer
      changes={changes}
      data-testid="filters-cost"
      locked={locked}
      onOpenChange={onToggleOpen}
      onReset={onReset}
      open={filter.open}
      title={t("filters.cost.title")}
    >
      <RangeSelect
        disabled={locked}
        data-testid="filters-cost-range"
        id="cost-select"
        label={t("filters.cost.title")}
        max={sliderMax}
        min={SLIDER_MIN}
        onValueCommit={onValueCommit}
        renderLabel={costToString}
        value={rangeValue}
      />
    </FilterContainer>
  );
}

function sanitizeCostRange(
  value: [number, number] | undefined,
  min: number,
  max: number,
): [number, number] {
  const fallbackMin = Number.isFinite(min) ? Math.max(min, SLIDER_MIN) : 0;
  const fallback: [number, number] = [fallbackMin, max];

  if (!value || !value.every(Number.isFinite)) return fallback;

  const lower = clamp(value[0], SLIDER_MIN, max);
  const upper = clamp(value[1], SLIDER_MIN, max);

  return lower <= upper ? [lower, upper] : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function rangesEqual(a: [number, number] | undefined, b: [number, number]) {
  return a?.[0] === b[0] && a[1] === b[1];
}
