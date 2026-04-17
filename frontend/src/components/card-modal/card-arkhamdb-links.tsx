import type { Card } from "@arkham-build/shared";
import { MessagesSquareIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { official } from "@/utils/card-utils";
import { Button, type Props as ButtonProps } from "../ui/button";

const RANGERSDB_CARD_BASE_URL = "https://rangersdb.com/cards";

type Props = {
  card: Card;
  children: React.ReactNode;
  hash?: string;
} & ButtonProps<"a">;

export function CardArkhamDBLink(props: Props) {
  const { card, children, hash, ...rest } = props;

  if (!official(card)) return null;

  return (
    <Button
      {...rest}
      as="a"
      href={`${RANGERSDB_CARD_BASE_URL}/${card.code}${hash ? `#${hash}` : ""}`}
      rel="noreferrer"
      target="_blank"
    >
      {children}
    </Button>
  );
}

export function CardReviewsLink(props: Omit<Props, "children">) {
  const { t } = useTranslation();

  return (
    <CardArkhamDBLink {...props}>
      <MessagesSquareIcon />
      {t("card_modal.actions.reviews")}
    </CardArkhamDBLink>
  );
}
