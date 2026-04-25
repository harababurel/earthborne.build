import { CARD_TYPE_ORDER } from "@earthborne-build/shared";
import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import {
  selectActiveListFilter,
  selectFilterChanges,
  selectTypeMapper,
  selectTypeOptions,
} from "@/store/selectors/lists";
import { isTypeFilterObject } from "@/store/slices/lists.type-guards";
import { assert } from "@/utils/assert";
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";
import type { FilterProps } from "./filters.types";
import { FilterContainer } from "./primitives/filter-container";
import { useFilter } from "./primitives/filter-hooks";

export function TypeFilter({ id, resolvedDeck, targetDeck }: FilterProps) {
  const { t } = useTranslation();

  const filter = useStore((state) => selectActiveListFilter(state, id));

  assert(
    isTypeFilterObject(filter),
    `TypeFilter instantiated with '${filter?.type}'`,
  );

  const changes = useStore((state) =>
    selectFilterChanges(state, filter.type, filter.value),
  );

  const options = useStore((state) =>
    selectTypeOptions(state, resolvedDeck, targetDeck),
  );

  const typeMapper = useStore(selectTypeMapper);
  const { onReset, onOpenChange, onChange, locked } = useFilter<string[]>(id);

  const sortedOptions = [...options].sort(
    (a, b) =>
      CARD_TYPE_ORDER.indexOf(a.code as (typeof CARD_TYPE_ORDER)[number]) -
      CARD_TYPE_ORDER.indexOf(b.code as (typeof CARD_TYPE_ORDER)[number]),
  );

  return (
    <FilterContainer
      changes={changes}
      locked={locked}
      onOpenChange={onOpenChange}
      onReset={onReset}
      open={filter.open}
      title={t("filters.type.title")}
    >
      <ToggleGroup
        data-testid="filters-type-shortcut"
        disabled={locked}
        wrap
        onValueChange={onChange}
        type="multiple"
        value={filter.value}
      >
        {sortedOptions.map(({ code }) => (
          <ToggleGroupItem key={code} value={code}>
            {typeMapper(code).name}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </FilterContainer>
  );
}
