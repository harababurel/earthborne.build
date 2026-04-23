import { SPECIALTY_TYPES } from "@arkham-build/shared";
import { useTranslation } from "react-i18next";
import { CustomSelect } from "@/components/ui/custom-select";
import { Field, FieldLabel } from "@/components/ui/field";
import type { DecklistFilterProps } from "./shared";

export function SpecialtyFilter({
  formState,
  setFormState,
}: DecklistFilterProps) {
  const { t } = useTranslation();

  return (
    <Field full>
      <FieldLabel htmlFor="specialty-select">{t("deck.specialty")}</FieldLabel>
      <CustomSelect
        id="specialty-select"
        onValueChange={(val: string) => {
          setFormState((prev) => ({ ...prev, specialty: val || undefined }));
        }}
        items={[
          { label: t("common.any"), value: "" },
          ...SPECIALTY_TYPES.map((s) => ({
            label: t(`common.set.${s}`),
            value: s,
          })),
        ]}
        value={formState.specialty ?? ""}
      />
    </Field>
  );
}
