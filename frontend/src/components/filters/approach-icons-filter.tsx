import type { ApproachKey } from "@arkham-build/shared";
import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import type { Type } from "@/store/schemas/metadata.schema";
import {
  selectActiveListFilter,
  selectApproachIconMapper,
  selectApproachIconOptions,
  selectFilterChanges,
} from "@/store/selectors/lists";
import { isApproachIconsFilterObject } from "@/store/slices/lists.type-guards";
import { assert } from "@/utils/assert";
import { ApproachIcon } from "../icons/approach-icon";
import type { FilterProps } from "./filters.types";
import { MultiselectFilter } from "./primitives/multiselect-filter";

const itemToString = (item: Type) => item.name.toLowerCase();

function nameRenderer(item: Type) {
  return (
    <>
      <ApproachIcon approach={item.code as ApproachKey} /> {item.name}
    </>
  );
}

export function ApproachIconsFilter(props: FilterProps) {
  const { id, resolvedDeck, targetDeck } = props;
  const { t } = useTranslation();

  const filter = useStore((state) => selectActiveListFilter(state, id));

  assert(
    isApproachIconsFilterObject(filter),
    `ApproachIconsFilter instantiated with '${filter?.type}'`,
  );

  const changes = useStore((state) =>
    selectFilterChanges(state, filter.type, filter.value),
  );
  const options = useStore((state) =>
    selectApproachIconOptions(state, resolvedDeck, targetDeck),
  );
  const mapper = useStore(selectApproachIconMapper);

  return (
    <MultiselectFilter
      changes={changes}
      id={id}
      itemToString={itemToString}
      nameRenderer={nameRenderer}
      open={filter.open}
      options={options}
      placeholder={t("filters.approach_icons.placeholder")}
      title={t("filters.approach_icons.title")}
      value={filter.value.map(mapper)}
    />
  );
}
