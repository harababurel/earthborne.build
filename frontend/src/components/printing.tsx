import type { Card } from "@arkham-build/shared";
import type { Printing as PrintingT } from "@/store/selectors/shared";
import { cx } from "@/utils/cx";
import { displayPackName } from "@/utils/formatting";
import PackIcon from "./icons/pack-icon";
import css from "./printing.module.css";
import { CopyToClipboard } from "./ui/copy-to-clipboard";

type Props = {
  active?: boolean;
  actionNode?: React.ReactNode;
  className?: string;
  linked?: boolean;
  printing: PrintingT;
  showCopyId?: boolean;
};

export function Printing({
  actionNode,
  active,
  className,
  linked = true,
  printing,
  showCopyId,
}: Props) {
  const { pack, card, set } = printing;

  const packName = displayPackName(pack);

  const packFormat = pack.reprint ? "new" : "old";

  const packLink = (
    <a
      className="link-current"
      href={`/browse/pack/${pack.code}${packFormat ? `?format=${packFormat}` : ""}`}
      target="_blank"
      rel="noreferrer"
    >
      {packName}
    </a>
  );

  const setDisplay =
    set?.name || (card.set_code !== card.pack_code ? card.set_code : undefined);

  const setLink = card.set_code && (
    <a
      className="link-current"
      href={`/browse/pack/${pack.code}?set=${card.set_code}`}
      target="_blank"
      rel="noreferrer"
    >
      {setDisplay}
    </a>
  );

  return (
    <PrintingInner
      active={active}
      actionNode={actionNode}
      className={className}
      card={card}
      icon={<PackIcon code={pack.code} />}
      name={
        linked ? (
          <>
            {packLink}
            {setDisplay && (
              <>
                <small>&nbsp;&gt;&nbsp;</small>
                {setLink || setDisplay}
              </>
            )}
          </>
        ) : (
          <>
            {packName}
            {setDisplay && (
              <>
                <small>&nbsp;&gt;&nbsp;</small>
                {setDisplay}
              </>
            )}
          </>
        )
      }
      position={card.set_position ?? ""}
      quantity={card.quantity}
      showCopyId={showCopyId}
    />
  );
}

type PrintingInnerProps = {
  actionNode?: React.ReactNode;
  active?: boolean;
  card: Card;
  className?: string;
  icon: React.ReactNode;
  name: React.ReactNode;
  position: number | string;
  quantity?: number;
  showCopyId?: boolean;
};

export function PrintingInner({
  active,
  actionNode,
  className,
  card,
  icon,
  name,
  position,
  quantity,
  showCopyId,
}: PrintingInnerProps) {
  return (
    <span className={cx(css["printing"], active && css["active"], className)}>
      <span className={css["printing-icon"]}>{icon}</span> {name}
      <span className="nowrap">
        <small>&nbsp;#</small>
        {position}
      </span>
      {!!quantity && (
        <>
          {" "}
          <span className="nowrap">
            <i className="icon-card-outline-bold" />×{quantity}
          </span>
        </>
      )}
      {actionNode && (
        <span className={css["printing-action"]}>{actionNode}</span>
      )}
      {showCopyId && (
        <CopyToClipboard
          className={css["printing-action"]}
          text={card.code}
          variant="bare"
          iconOnly
          size="none"
          tooltip={card.code}
        />
      )}
    </span>
  );
}
