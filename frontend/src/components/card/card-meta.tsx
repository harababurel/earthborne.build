import type { Card } from "@earthborne-build/shared";
import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import type { CardWithRelations, ResolvedCard } from "@/store/lib/types";
import { selectPrintingsForCard } from "@/store/selectors/shared";
import { cx } from "@/utils/cx";
import { Printing } from "../printing";
import { Button } from "../ui/button";
import css from "./card.module.css";

type Props = {
  hideCollectorInfo?: boolean;
  linked?: boolean;
  resolvedCard: ResolvedCard | CardWithRelations;
  onPrintingSelect?: (card: Card) => void;
  size: "tooltip" | "compact" | "full";
};

export function CardMetaBack(props: { illustrator?: string | null }) {
  if (!props.illustrator) return null;

  return (
    <footer className={css["meta"]}>
      <p className={css["meta-property"]}>
        <i className="icon-paintbrush" /> {props.illustrator}
      </p>
    </footer>
  );
}

export function CardMeta(props: Props) {
  const { linked = true, onPrintingSelect, resolvedCard, size } = props;

  const showCopyId = useStore(
    (state) => state.settings.devModeEnabled && size !== "tooltip",
  );

  const illustrator = resolvedCard.card.illustrator;

  return (
    <footer className={cx(css["meta"], css[size])}>
      {size === "full" && illustrator && (
        <p className={css["meta-property"]}>
          <i className="icon-paintbrush" /> {illustrator}
        </p>
      )}
      <PlayerEntry
        linked={linked}
        onPrintingSelect={onPrintingSelect}
        resolvedCard={resolvedCard}
        size={size}
        showCopyId={showCopyId}
      />
    </footer>
  );
}

function PlayerEntry(props: Props & { showCopyId: boolean }) {
  const { linked = true, onPrintingSelect, resolvedCard, showCopyId } = props;

  const { t } = useTranslation();

  const printings = useStore((state) =>
    selectPrintingsForCard(state, resolvedCard.card.code),
  );

  const cardCode = resolvedCard.card.code;

  return (
    <>
      <hr className={css["meta-divider"]} />

      {printings?.map((printing) => {
        const active = cardCode === printing.card.code;

        const hasVersions =
          printings.filter((p) => p.card.code !== cardCode).length > 0;

        return (
          <p className={css["meta-property"]} key={printing.id}>
            <Printing
              active={active && hasVersions}
              key={printing.id}
              linked={linked}
              printing={printing}
              showCopyId={showCopyId}
              actionNode={
                !active && hasVersions && onPrintingSelect ? (
                  <Button
                    size="xxs"
                    onClick={() => onPrintingSelect(printing.card)}
                  >
                    {t("common.select")}
                  </Button>
                ) : undefined
              }
            />
          </p>
        );
      })}
    </>
  );
}
