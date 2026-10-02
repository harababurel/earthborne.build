import type { Card } from "@earthborne-build/shared";
import { useTranslation } from "react-i18next";
import { CardEquipLoad } from "@/components/card-equip-load";
import { useStore } from "@/store";
import { selectTraitMapper } from "@/store/selectors/shared";
import css from "./card.module.css";

type Props = {
  card: Card;
  face?: "simple-back";
  omitSlotIcon?: boolean;
};

export function CardDetails(props: Props) {
  const { card } = props;
  const { t } = useTranslation();
  const traitMapper = useStore(selectTraitMapper);

  return (
    <div className={css["details"]}>
      <div className={css["details-text"]}>
        <p className={css["details-type"]}>
          <span>{t(`common.type.${card.type_code}`)}</span>
        </p>

        {card.traits && (
          <p className={css["details-traits"]}>
            {traitMapper(card.traits).name}
          </p>
        )}
      </div>
      <CardEquipLoad card={card} />
    </div>
  );
}
