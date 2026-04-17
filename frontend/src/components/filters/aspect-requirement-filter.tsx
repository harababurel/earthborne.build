import { ASPECT_ORDER } from "@arkham-build/shared";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { RangeSelect } from "@/components/ui/range-select";
import { useStore } from "@/store";
import {
  selectActiveListFilter,
  selectAspectRequirementMinMax,
  selectAspectRequirementOptions,
  selectFilterChanges,
} from "@/store/selectors/lists";
import { isAspectRequirementFilterObject } from "@/store/slices/lists.type-guards";
import { assert } from "@/utils/assert";
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";
import css from "./er-aspect-filter.module.css";
import type { FilterProps } from "./filters.types";
import { FilterContainer } from "./primitives/filter-container";
import { useFilter } from "./primitives/filter-hooks";

export function AspectRequirementFilter(props: FilterProps) {
  const { id, resolvedDeck, targetDeck } = props;
  const { t } = useTranslation();

  const filter = useStore((state) => selectActiveListFilter(state, id));

  assert(
    isAspectRequirementFilterObject(filter),
    `AspectRequirementFilter instantiated with '${filter?.type}'`,
  );

  const changes = useStore((state) =>
    selectFilterChanges(state, filter.type, filter.value),
  );
  const options = useStore((state) =>
    selectAspectRequirementOptions(state, resolvedDeck, targetDeck),
  );
  const { min, max } = useStore((state) =>
    selectAspectRequirementMinMax(state, resolvedDeck, targetDeck),
  );

  const { onReset, onChange, onOpenChange, locked } = useFilter(id);

  const optionCodes = useMemo(
    () => new Set(options.map((option) => option.code)),
    [options],
  );

  const onAspectChange = useCallback(
    (aspects: string[]) => {
      onChange({ aspects });
    },
    [onChange],
  );

  const onRangeChange = useCallback(
    (range: number[]) => {
      onChange({ range: [range[0], range[1]] });
    },
    [onChange],
  );

  const rangeValue = filter.value.range ?? [min, max];

  return (
    <FilterContainer
      changes={changes}
      locked={locked}
      onOpenChange={onOpenChange}
      onReset={onReset}
      open={filter.open}
      title={t("filters.aspect_requirement.title")}
    >
      <ToggleGroup
        className={css["toggle"]}
        full
        onValueChange={onAspectChange}
        type="multiple"
        value={filter.value.aspects}
      >
        {ASPECT_ORDER.filter((aspect) => optionCodes.has(aspect)).map(
          (aspect) => (
            <ToggleGroupItem
              className={css[`color-active-${aspect}`]}
              disabled={locked}
              key={aspect}
              value={aspect}
            >
              {t(`common.factions.${aspect.toLowerCase()}`)}
            </ToggleGroupItem>
          ),
        )}
      </ToggleGroup>
      {max > min && (
        <RangeSelect
          disabled={locked}
          id={`aspect-requirement-value-${id}`}
          label={t("filters.aspect_requirement.value")}
          max={max}
          min={min}
          onValueCommit={onRangeChange}
          value={rangeValue}
        />
      )}
    </FilterContainer>
  );
}
