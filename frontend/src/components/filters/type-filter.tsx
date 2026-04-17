import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import type { Type } from "@/store/schemas/metadata.schema";
import {
  selectActiveListFilter,
  selectFilterChanges,
  selectListFilterProperties,
  selectTypeMapper,
  selectTypeOptions,
} from "@/store/selectors/lists";
import { isTypeFilterObject } from "@/store/slices/lists.type-guards";
import { assert } from "@/utils/assert";
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";
import type { FilterProps } from "./filters.types";
import { MultiselectFilter } from "./primitives/multiselect-filter";

const nameRenderer = (item: Type) => item.name;
const itemToString = (item: Type) => item.name.toLowerCase();

export function TypeFilter({ id, resolvedDeck, targetDeck }: FilterProps) {
  const { t } = useTranslation();

  const filter = useStore((state) => selectActiveListFilter(state, id));
  const setFilterValue = useStore((state) => state.setFilterValue);

  const listProperties = useStore((state) =>
    selectListFilterProperties(state, resolvedDeck, targetDeck),
  );

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

  const onApplyShortcut = useCallback(
    (value: string[]) => {
      setFilterValue(id, value);
    },
    [id, setFilterValue],
  );

  const typeMapper = useStore(selectTypeMapper);

  return (
    <MultiselectFilter
      changes={changes}
      id={id}
      itemToString={itemToString}
      nameRenderer={nameRenderer}
      open={filter.open}
      options={options}
      placeholder={t("filters.type.placeholder")}
      title={t("filters.type.title")}
      value={filter.value.map(typeMapper)}
    >
      {!filter.open && (
        <ToggleGroup
          data-testid="filters-type-shortcut"
          full
          onValueChange={onApplyShortcut}
          type="multiple"
          value={filter.value}
        >
          {listProperties.types.has("moment") && (
            <ToggleGroupItem value="moment">
              {t("common.type.moment")}
            </ToggleGroupItem>
          )}
          {listProperties.types.has("gear") && (
            <ToggleGroupItem value="gear">
              {t("common.type.gear")}
            </ToggleGroupItem>
          )}
          {listProperties.types.has("attachment") && (
            <ToggleGroupItem value="attachment">
              {t("common.type.attachment")}
            </ToggleGroupItem>
          )}
          {listProperties.types.has("attribute") && (
            <ToggleGroupItem value="attribute">
              {t("common.type.attribute")}
            </ToggleGroupItem>
          )}
        </ToggleGroup>
      )}
    </MultiselectFilter>
  );
}
