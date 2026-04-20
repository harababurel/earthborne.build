import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import type { SettingProps } from "./types";

export function CardModalPopularDecks(props: SettingProps) {
  const { setSettings } = props;
  const { t } = useTranslation();

  const onCheckedChange = useCallback(
    (_val: boolean | string) => {
      setSettings((settings) => ({
        ...settings,
      }));
    },
    [setSettings],
  );

  return (
    <Field
      bordered
      helpText={t("settings.display.show_card_modal_popular_decks_help")}
    >
      <Checkbox
        data-testid="settings-show-card-modal-popular-decks"
        id="show-card-modal-popular-decks"
        label={t("settings.display.show_card_modal_popular_decks")}
        name="show-card-modal-popular-decks"
        onCheckedChange={onCheckedChange}
      />
    </Field>
  );
}
