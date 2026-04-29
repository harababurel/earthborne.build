import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import { selectActiveListFilter } from "@/store/selectors/lists";
import { isCardTypeFilterObject } from "@/store/slices/lists.type-guards";
import type { CardTypeFilter as CardTypeFilterType } from "@/store/slices/lists.types";
import { assert } from "@/utils/assert";
import { useHotkey } from "@/utils/use-hotkey";
import { HotkeyTooltip } from "../ui/hotkey";
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";
import type { FilterProps } from "./filters.types";
import { useFilter } from "./primitives/filter-hooks";

export function CardTypeFilter(props: FilterProps & { className?: string }) {
  const { className, id } = props;

  const filter = useStore((state) => selectActiveListFilter(state, id));

  assert(
    isCardTypeFilterObject(filter),
    `CardTypeFilter instantiated with '${filter?.type}'`,
  );

  const { t } = useTranslation();

  const { onChange, locked } = useFilter(id);

  const onToggle = useCallback(
    (value: CardTypeFilterType) => {
      if (value === filter.value) {
        onChange("");
      } else {
        onChange(value);
      }
    },
    [onChange, filter.value],
  );

  useHotkey("alt+p", () => onToggle("player"));
  useHotkey("alt+c", () => onToggle("path"));

  if (!filter) return null;

  return (
    <ToggleGroup
      className={className}
      defaultValue=""
      data-testid="toggle-card-type"
      disabled={locked}
      full
      onValueChange={onChange}
      type="single"
      value={filter.value}
    >
      <HotkeyTooltip
        keybind="alt+p"
        description={t("settings.lists.ranger_cards", {
          defaultValue: "Ranger cards",
        })}
      >
        <ToggleGroupItem data-testid="card-type-player" value="player">
          <i className="icon-per_ranger" />{" "}
          {t("settings.lists.ranger_cards", { defaultValue: "Ranger cards" })}
        </ToggleGroupItem>
      </HotkeyTooltip>
      <HotkeyTooltip
        keybind="alt+c"
        description={t("settings.lists.path_cards", {
          defaultValue: "Path cards",
        })}
      >
        <ToggleGroupItem value="path" data-testid="card-type-path">
          <i className="icon-auto_fail" />{" "}
          {t("settings.lists.path_cards", { defaultValue: "Path cards" })}
        </ToggleGroupItem>
      </HotkeyTooltip>
    </ToggleGroup>
  );
}
