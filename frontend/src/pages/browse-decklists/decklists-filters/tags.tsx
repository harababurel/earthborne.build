import { useTranslation } from "react-i18next";
import { Field } from "@/components/ui/field";
import { SearchInput } from "@/components/ui/search-input";
import type { DecklistFilterProps } from "./shared";

export function TagsFilter({ formState, setFormState }: DecklistFilterProps) {
  const { t } = useTranslation();

  return (
    <Field full>
      <SearchInput
        id="tags-input"
        label={t("common.tags")}
        onValueChange={(val) => {
          setFormState((prev) => ({ ...prev, tags: val || undefined }));
        }}
        value={formState.tags ?? ""}
      />
    </Field>
  );
}
