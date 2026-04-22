import type { Card } from "@arkham-build/shared";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "@/store";

import type { ResolvedDeck } from "@/store/lib/types";
import { cardLimit } from "@/utils/card-utils";
import { inputFocused } from "@/utils/keyboard";
import { QuantityInput } from "../ui/quantity-input";
import css from "./card-modal.module.css";

type Props = {
  card: Card;
  canEdit?: boolean;
  deck?: ResolvedDeck;
  showExtraQuantities?: boolean;
  onCloseModal(): void;
};

export function CardModalQuantities(props: Props) {
  const { card, canEdit, deck } = props;
  const { t } = useTranslation();

  const updateCardQuantity = useStore((state) => state.updateCardQuantity);

  const limit = cardLimit(card);

  useEffect(() => {
    if (!canEdit) return;

    function onKeyDown(evt: KeyboardEvent) {
      if (evt.metaKey || !deck?.id || inputFocused()) return;

      const slots = "slots";

      if (evt.key === "ArrowRight") {
        evt.preventDefault();
        updateCardQuantity(deck.id, card.code, 1, limit, slots);
      } else if (evt.key === "ArrowLeft") {
        evt.preventDefault();
        updateCardQuantity(deck.id, card.code, -1, limit, slots);
      } else if (evt.code.startsWith("Digit")) {
        evt.preventDefault();
        const quantity = Number.parseInt(evt.code.replace("Digit", ""), 10);
        updateCardQuantity(deck.id, card.code, quantity, limit, slots, "set");
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [canEdit, card.code, updateCardQuantity, deck?.id, limit]);

  const quantities = deck?.slots;
  const code = card.code;

  return (
    <article className={css["quantity"]}>
      <h3 className={css["quantity-title"]}>{t("common.decks.slots")}</h3>
      <QuantityInput
        data-testid="card-modal-quantities-main"
        disabled={!canEdit}
        limit={limit}
        onValueChange={(quantity) => {
          if (!deck?.id) return;
          updateCardQuantity(deck.id, card.code, quantity, limit, "slots");
        }}
        value={quantities?.[code] ?? 0}
      />
    </article>
  );
}
