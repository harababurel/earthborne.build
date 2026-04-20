import { APPROACH_ORDER, type ApproachKey } from "@arkham-build/shared";
import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import {
  selectActiveListFilter,
  selectApproachIconOptions,
  selectFilterChanges,
} from "@/store/selectors/lists";
import { isApproachIconsFilterObject } from "@/store/slices/lists.type-guards";
import { assert } from "@/utils/assert";
import { ApproachIcon } from "../icons/approach-icon";
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";
import type { FilterProps } from "./filters.types";
import { FilterContainer } from "./primitives/filter-container";
import { useFilter } from "./primitives/filter-hooks";

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

  const { onReset, onChange, onOpenChange, locked } = useFilter<string[]>(id);

  const optionCodes = new Set(options.map((o) => o.code));

  return (
    <FilterContainer
      changes={changes}
      locked={locked}
      onOpenChange={onOpenChange}
      onReset={onReset}
      open={filter.open}
      title={t("filters.approach_icons.title")}
    >
      <ToggleGroup
        full
        disabled={locked}
        onValueChange={onChange}
        type="multiple"
        value={filter.value}
      >
        {APPROACH_ORDER.filter((approach) => optionCodes.has(approach)).map(
          (approach) => (
            <ToggleGroupItem
              key={approach}
              tooltip={t(`common.skill.${approach}`)}
              value={approach}
            >
              <ApproachIcon approach={approach as ApproachKey} />
            </ToggleGroupItem>
          ),
        )}
      </ToggleGroup>
    </FilterContainer>
  );
}
