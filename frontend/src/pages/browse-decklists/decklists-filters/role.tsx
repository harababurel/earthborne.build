import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { createSelector } from "reselect";
import { CardsCombobox } from "@/components/cards-combobox";
import { Field } from "@/components/ui/field";
import { useStore } from "@/store";
import { filterType } from "@/store/lib/filtering";
import { resolveCardWithRelations } from "@/store/lib/resolve-card";
import { makeSortFunction } from "@/store/lib/sorting";
import {
  selectLocaleSortingCollator,
  selectLookupTables,
  selectMetadata,
} from "@/store/selectors/shared";
import { official } from "@/utils/card-utils";
import { and } from "@/utils/fp";
import type { DecklistFilterProps } from "./shared";

const selectRoleCards = createSelector(
  selectMetadata,
  selectLocaleSortingCollator,
  (metadata, collator) => {
    const roleFilter = and([
      filterType(["role"]) ?? (() => true),
      (c) => official(c),
    ]);

    const roles = Object.values(metadata.cards).filter(roleFilter);

    const sortFn = makeSortFunction(["name", "position"], metadata, collator);

    return roles.sort(sortFn);
  },
);

export function RoleFilter({
  disabled,
  formState,
  setFormState,
}: DecklistFilterProps) {
  const { t } = useTranslation();
  const roles = useStore(selectRoleCards);
  const metadata = useStore(selectMetadata);
  const lookupTables = useStore(selectLookupTables);
  const collator = useStore(selectLocaleSortingCollator);
  const locale = useStore((state) => state.settings.locale);

  const selectedCode = formState.role_code;
  const selectedCard = selectedCode ? metadata.cards[selectedCode] : undefined;

  const resolvedCard = useMemo(() => {
    if (!selectedCard) return undefined;
    return resolveCardWithRelations(
      { metadata, lookupTables },
      collator,
      selectedCard.code,
      true,
    );
  }, [metadata, lookupTables, collator, selectedCard]);

  return (
    <Field full>
      <CardsCombobox
        disabled={disabled}
        id="role-select"
        items={roles}
        label={t("common.type.role")}
        limit={1}
        locale={locale}
        onValueChange={(cards) => {
          const card = cards[0];
          setFormState((prev) => ({
            ...prev,
            role_code: card ? card.code : undefined,
          }));
        }}
        selectedItems={resolvedCard ? [resolvedCard.card] : []}
        showLabel
      />
    </Field>
  );
}
