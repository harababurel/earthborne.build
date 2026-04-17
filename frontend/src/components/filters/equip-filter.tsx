import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import {
  selectActiveListFilter,
  selectEquipMinMax,
  selectFilterChanges,
} from "@/store/selectors/lists";
import { isEquipFilterObject } from "@/store/slices/lists.type-guards";
import { assert } from "@/utils/assert";
import type { FilterProps } from "./filters.types";
import { RangeFilter } from "./primitives/range-filter";

export function EquipFilter(props: FilterProps) {
  const { id, resolvedDeck, targetDeck } = props;
  const { t } = useTranslation();

  const filter = useStore((state) => selectActiveListFilter(state, id));

  assert(
    isEquipFilterObject(filter),
    `EquipFilter instantiated with '${filter?.type}'`,
  );

  const changes = useStore((state) =>
    selectFilterChanges(state, filter.type, filter.value),
  );
  const { min, max } = useStore((state) =>
    selectEquipMinMax(state, resolvedDeck, targetDeck),
  );

  return (
    <RangeFilter
      changes={changes}
      data-testid="filter-equip"
      id={id}
      min={min}
      max={max}
      open={filter.open}
      title={t("filters.equip.title")}
      value={filter.value}
    />
  );
}
