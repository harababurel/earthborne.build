import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import type { Coded } from "@/store/lib/types";
import {
  selectActiveListFilter,
  selectAssetOptions,
  selectFilterChanges,
  selectUsesMapper,
} from "@/store/selectors/lists";
import { isAssetFilterObject } from "@/store/slices/lists.type-guards";
import type { AssetFilter as AssetFilterType } from "@/store/slices/lists.types";
import { assert } from "@/utils/assert";
import SlotIcon from "../icons/slot-icon";
import { Checkbox } from "../ui/checkbox";
import { Combobox } from "../ui/combobox/combobox";
import { RangeSelect } from "../ui/range-select";
import css from "./filters.module.css";
import type { FilterProps } from "./filters.types";
import { FilterContainer } from "./primitives/filter-container";
import { useFilter } from "./primitives/filter-hooks";

type Option = {
  code: string;
  name: string;
};

function renderName(c: Option) {
  return c.name;
}

function _renderSlot(c: Option) {
  return (
    <>
      <SlotIcon code={c.code} /> {c.name}
    </>
  );
}

export function AssetFilter({ id, resolvedDeck, targetDeck }: FilterProps) {
  const { t } = useTranslation();

  const filter = useStore((state) => selectActiveListFilter(state, id));

  assert(
    isAssetFilterObject(filter),
    `AssetFilter instantiated with '${filter?.type}'`,
  );

  const changes = useStore((state) =>
    selectFilterChanges(state, filter.type, filter.value),
  );

  const options = useStore((state) =>
    selectAssetOptions(state, resolvedDeck, targetDeck),
  );

  const locale = useStore((state) => state.settings.locale);

  const usesMapper = useStore(selectUsesMapper);

  const { onReset, onChange, onOpenChange, locked } =
    useFilter<Partial<AssetFilterType>>(id);

  const onChangeUses = useCallback(
    (value: Coded[]) => {
      onChange({ uses: value.map(({ code }) => code) });
    },
    [onChange],
  );

  const onChangeRange = useCallback(
    function setValue<K extends keyof AssetFilterType>(
      key: K,
      value: AssetFilterType[K],
    ) {
      onChange({ [key]: value });
    },
    [onChange],
  );

  const onHealthXChange = useCallback(
    (value: boolean) => {
      onChange({ healthX: value });
    },
    [onChange],
  );

  return (
    <FilterContainer
      className={css["asset-filter"]}
      changes={changes}
      locked={locked}
      onOpenChange={onOpenChange}
      onReset={onReset}
      open={filter.open}
      title={t("filters.asset.title")}
    >
      <Combobox
        disabled={locked}
        id="asset-uses"
        items={options.uses}
        label={t("filters.uses.title")}
        locale={locale}
        onValueChange={onChangeUses}
        placeholder={t("filters.uses.placeholder")}
        renderItem={renderName}
        renderResult={renderName}
        selectedItems={filter.value.uses.map(usesMapper)}
        showLabel
      />

      <RangeSelect
        disabled={locked}
        id="asset-health"
        label={t("filters.health.title")}
        max={options.health.max}
        min={options.health.min}
        onValueCommit={(val) => {
          onChangeRange("health", [val[0], val[1]]);
        }}
        showLabel
        value={filter.value.health ?? [options.health.min, options.health.max]}
      />

      <RangeSelect
        disabled={locked}
        id="asset-sanity"
        label={t("filters.sanity.title")}
        max={options.sanity.max}
        min={options.sanity.min}
        onValueCommit={(val) => {
          onChangeRange("sanity", [val[0], val[1]]);
        }}
        showLabel
        value={filter.value.sanity ?? [options.sanity.min, options.sanity.max]}
      />

      <Checkbox
        disabled={locked}
        checked={filter.value.healthX}
        id="asset-health-x"
        label={t("filters.health_sanity_x")}
        onCheckedChange={onHealthXChange}
      />
    </FilterContainer>
  );
}
