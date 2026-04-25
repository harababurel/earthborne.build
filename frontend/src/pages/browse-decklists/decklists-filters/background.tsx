import { BACKGROUND_TYPES } from "@earthborne-build/shared";
import { useTranslation } from "react-i18next";
import { CustomSelect } from "@/components/ui/custom-select";
import { Field, FieldLabel } from "@/components/ui/field";
import type { DecklistFilterProps } from "./shared";

export function BackgroundFilter({
  formState,
  setFormState,
}: DecklistFilterProps) {
  const { t } = useTranslation();

  return (
    <Field full>
      <FieldLabel htmlFor="background-select">
        {t("deck.background")}
      </FieldLabel>
      <CustomSelect
        id="background-select"
        onValueChange={(val: string) => {
          setFormState((prev) => ({ ...prev, background: val || undefined }));
        }}
        items={[
          { label: t("common.any"), value: "" },
          ...BACKGROUND_TYPES.map((b) => ({
            label: t(`common.set.${b}`),
            value: b,
          })),
        ]}
        value={formState.background ?? ""}
      />
    </Field>
  );
}
