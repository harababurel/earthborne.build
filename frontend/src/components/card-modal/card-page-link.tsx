import type { Card } from "@earthborne-build/shared";
import { ExternalLinkIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../ui/button";

type Props = {
  card: Card;
};

export function CardPageLink(props: Props) {
  const { card } = props;

  const { t } = useTranslation();

  return (
    <Button as="a" href={`/card/${card.code}`} target="_blank">
      <ExternalLinkIcon />
      {t("card_modal.actions.open_card_page")}
    </Button>
  );
}
