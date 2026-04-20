import { useCallback } from "react";
import { useStore } from "@/store";
import { selectActiveListFilter } from "@/store/selectors/lists";
import { isFactionFilterObject } from "@/store/slices/lists.type-guards";
import { assert } from "@/utils/assert";
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";
import css from "./er-aspect-filter.module.css";
import type { FilterProps } from "./filters.types";
import { useFilter } from "./primitives/filter-hooks";

const ASPECTS = ["AWA", "FIT", "FOC", "SPI"] as const;

export function ErAspectFilter(props: FilterProps) {
  const { id } = props;

  const filter = useStore((state) => selectActiveListFilter(state, id));
  assert(
    isFactionFilterObject(filter),
    `ErAspectFilter instantiated with '${filter?.type}'`,
  );

  const { onChange } = useFilter<string[]>(id);

  const onValueChange = useCallback(
    (value: string[]) => {
      onChange(value);
    },
    [onChange],
  );

  return (
    <ToggleGroup
      className={css["toggle"]}
      full
      onValueChange={onValueChange}
      type="multiple"
      value={filter.value}
    >
      {ASPECTS.map((aspect) => (
        <ToggleGroupItem
          className={css[`color-active-${aspect}`]}
          key={aspect}
          value={aspect}
        >
          {aspect}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
