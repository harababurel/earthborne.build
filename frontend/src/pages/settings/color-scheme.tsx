import { useTranslation } from "react-i18next";
import { Field, FieldLabel } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { getAvailableColorSchemes } from "@/utils/use-color-theme";

type Props = {
  setColorScheme: (value: string) => void;
  colorScheme: string;
};

export function ColorSchemeSetting({ setColorScheme, colorScheme }: Props) {
  const { t } = useTranslation();

  return (
    <Field bordered>
      <FieldLabel>{t("settings.display.color_scheme")}</FieldLabel>
      <Select
        data-testid={"settings-select-color-scheme"}
        value={colorScheme}
        required
        onChange={(evt) => setColorScheme(evt.target.value)}
        options={Object.entries(getAvailableColorSchemes()).map(
          ([value, label]) => ({
            label,
            value,
          }),
        )}
      />
    </Field>
  );
}
