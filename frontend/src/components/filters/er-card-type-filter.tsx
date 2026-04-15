import { useTranslation } from "react-i18next";
import { Select } from "../ui/select";
import type { CardTypeTab } from "@/pages/browse/set-tree";

type Props = {
  value: CardTypeTab;
  onValueChange: (value: CardTypeTab) => void;
};

const CARD_TYPES: CardTypeTab[] = [
  "ranger",
  "path",
  "location",
  "weather",
  "mission",
  "role",
  "aspect",
  "challenge",
];

export function ErCardTypeFilter({ value, onValueChange }: Props) {
  const { t } = useTranslation();

  const options = CARD_TYPES.map((tab) => ({
    value: tab,
    label: t(`browse.tabs.${tab}`),
  }));

  return (
    <Select
      required
      options={options}
      value={value}
      onChange={(e) => onValueChange(e.target.value as CardTypeTab)}
    />
  );
}
