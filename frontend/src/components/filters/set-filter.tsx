import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import type { Type } from "@/store/schemas/metadata.schema";
import {
  selectActiveListFilter,
  selectFilterChanges,
  selectSetMapper,
  selectSetOptions,
} from "@/store/selectors/lists";
import { isSetFilterObject } from "@/store/slices/lists.type-guards";
import { assert } from "@/utils/assert";
import type { FilterProps } from "./filters.types";
import { MultiselectFilter } from "./primitives/multiselect-filter";

const nameRenderer = (item: Type) => item.name;
const itemToString = (item: Type) => item.name.toLowerCase();

export function SetFilter({ id, resolvedDeck, targetDeck }: FilterProps) {
  const { t } = useTranslation();

  const filter = useStore((state) => selectActiveListFilter(state, id));

  assert(
    isSetFilterObject(filter),
    `SetFilter instantiated with '${filter?.type}'`,
  );

  const changes = useStore((state) =>
    selectFilterChanges(state, filter.type, filter.value),
  );

  const options = useStore((state) =>
    selectSetOptions(state, resolvedDeck, targetDeck),
  );

  const setMapper = useStore(selectSetMapper);

  return (
    <MultiselectFilter
      changes={changes}
      id={id}
      itemToString={itemToString}
      nameRenderer={nameRenderer}
      open={filter.open}
      options={options}
      placeholder={t("filters.set.placeholder")}
      title={t("filters.set.title")}
      value={filter.value.map(setMapper)}
    />
  );
}
