import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { DecklistConfig } from "@/store/slices/settings.types";
import { DEFAULT_LIST_SORT_ID } from "@/utils/constants";
import { DropdownRadioGroupItem } from "./ui/dropdown-menu";
import { RadioGroup } from "./ui/radio-group";

type Props = {
  onConfigChange: (config: DecklistConfig | undefined) => void;
  selectedId: string;
};

export function SortSelect({ onConfigChange, selectedId }: Props) {
  const { t } = useTranslation();

  const onSelectSortPreset = useCallback(
    (id: string) => {
      if (id === DEFAULT_LIST_SORT_ID) {
        onConfigChange(undefined);
      }
    },
    [onConfigChange],
  );

  return (
    <RadioGroup value={selectedId} onValueChange={onSelectSortPreset}>
      <DropdownRadioGroupItem value={DEFAULT_LIST_SORT_ID}>
        {t("lists.nav.sort_default")}
      </DropdownRadioGroupItem>
    </RadioGroup>
  );
}
