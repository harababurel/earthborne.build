import type { Card } from "@earthborne-build/shared";
import { RotateCcwIcon } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import { selectBackCard } from "@/store/selectors/shared";
import {
  cardBackType,
  cardBackTypeUrl,
  cardImageUrl,
  imageUrl,
  isLandscapeCard,
} from "@/utils/card-utils";
import { cx } from "@/utils/cx";
import css from "./card-scan.module.css";
import { Button } from "./ui/button";

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  card: Card;
  className?: string;
  defaultFlipped?: boolean;
  draggable?: boolean;
  flipped: boolean;
  hideFlipButton?: boolean;
  lazy?: boolean;
  onFlip?: (value: boolean, sideways: boolean) => void;
  preventFlip?: boolean;
  suffix?: string;
}

export function CardScan(props: Omit<Props, "flipped">) {
  const [flipped, setFlipped] = useState(false);

  const onFlip = useCallback(
    (value: boolean, sideways: boolean) => {
      setFlipped(value);
      props.onFlip?.(value, sideways);
    },
    [props],
  );

  return <CardScanControlled {...props} flipped={flipped} onFlip={onFlip} />;
}

export function CardScanControlled(props: Props) {
  const {
    className,
    draggable,
    flipped,
    preventFlip,
    onFlip,
    card,
    hideFlipButton,
    lazy,
    suffix,
    ...rest
  } = props;
  const { t } = useTranslation();
  const scanRef = useRef<HTMLDivElement>(null);

  const backCard = useStore((state) => selectBackCard(state, card.code));
  const backType = backCard ? "card" : cardBackType(card);

  const code = card.code;

  const backCode =
    backType === "card"
      ? (backCard?.code ?? (suffix ? code : `${code}b`))
      : backType;

  const imageCode = `${code}${suffix ?? ""}`;

  const reverseImageCode = backCode;

  const isSideways = isLandscapeCard(card);

  const reverseSideways = backCard
    ? isLandscapeCard(backCard)
    : backType === "card" || card.back_image_url
      ? isSideways
      : false;

  // Fan-made content uses card urls for sides, these take precedence.
  const frontUrl = suffix === "b" ? card.back_image_url : card.image_url;
  const backUrl = backCard
    ? backCard.image_url
    : suffix === "b"
      ? card.image_url
      : card.back_image_url;

  const onToggleFlip = useCallback(
    (evt: React.MouseEvent) => {
      evt.preventDefault();
      evt.stopPropagation();

      const next = !flipped;
      if (onFlip) onFlip(next, next ? reverseSideways : isSideways);
    },
    [flipped, reverseSideways, onFlip, isSideways],
  );

  return (
    <div
      {...rest}
      className={cx(
        css["scan-container"],
        flipped && css["flipped"],
        flipped
          ? reverseSideways && css["sideways"]
          : isSideways && css["sideways"],
        className,
      )}
      data-testid="card-scan"
      data-component="card-scan"
    >
      <div className={css["scan-front"]} data-testid="card-scan" ref={scanRef}>
        <CardScanInner
          alt={t("card_view.scan", { code: imageCode })}
          draggable={draggable}
          lazy={lazy}
          sideways={isSideways}
          url={frontUrl ? cardImageUrl(frontUrl) : imageUrl(imageCode)}
        />
      </div>
      {!preventFlip && (
        <>
          <div className={css["scan-back"]} ref={scanRef}>
            {backType === "card" ? (
              <CardScanInner
                alt={t("card_view.scan", { code: reverseImageCode })}
                draggable={draggable}
                hidden={!flipped}
                lazy={lazy}
                sideways={reverseSideways}
                url={
                  backUrl ? cardImageUrl(backUrl) : imageUrl(reverseImageCode)
                }
              />
            ) : (
              <CardScanInner
                alt={t("card_view.scan", { code: backType })}
                draggable={draggable}
                hidden={!flipped}
                lazy={lazy}
                sideways={reverseSideways}
                url={backUrl ? cardImageUrl(backUrl) : cardBackTypeUrl(card)}
              />
            )}
          </div>
          {!preventFlip && !hideFlipButton && (
            <Button
              className={css["scan-flip-trigger"]}
              onClick={onToggleFlip}
              iconOnly
              round
            >
              <RotateCcwIcon />
            </Button>
          )}
        </>
      )}
    </div>
  );
}

export function CardScanInner(
  props: Omit<Props, "card" | "flipped"> & {
    alt: string;
    url: string;
    initialHidden?: boolean;
    crossOrigin?: "anonymous";
    sideways?: boolean;
  },
) {
  const {
    alt,
    crossOrigin,
    draggable,
    hidden,
    sideways,
    lazy,
    className,
    url,
    ...rest
  } = props;

  const [shown, setShown] = useState(!hidden);
  if (!hidden && !shown) setShown(true);

  return (
    <div
      {...rest}
      className={cx(css["scan"], sideways && css["sideways"], className)}
      data-component="card-scan"
    >
      {shown && (
        <img
          alt={alt}
          draggable={draggable}
          crossOrigin={crossOrigin}
          height={sideways ? 300 : 420}
          loading={lazy ? "lazy" : undefined}
          src={url}
          width={sideways ? 420 : 300}
        />
      )}
    </div>
  );
}
