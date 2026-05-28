import { useTranslation } from "react-i18next";
import type { CardTypeTab } from "@/pages/browse/set-tree";
import {
  RadioButtonGroup,
  RadioButtonGroupItem,
} from "../ui/radio-button-group";
import css from "./er-card-type-filter.module.css";

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

  return (
    <RadioButtonGroup
      className={css["card-type-filter"]}
      value={value}
      onValueChange={onValueChange}
    >
      {CARD_TYPES.map((tab) => (
        <RadioButtonGroupItem key={tab} value={tab} size="small">
          {t(`browse.tabs.${tab}`)}
        </RadioButtonGroupItem>
      ))}
    </RadioButtonGroup>
  );
}
