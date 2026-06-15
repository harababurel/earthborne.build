import type { Card } from "@earthborne-build/shared";
import { PortaledCardTooltip } from "@/components/card-tooltip/card-tooltip-portaled";
import { useRestingTooltip } from "@/components/ui/tooltip.hooks";
import { cx } from "@/utils/cx";
import css from "./card-hover-name.module.css";

// A text label that previews a card on hover. Falls back to plain text when no
// card resolves. Shared by weather and location names in the campaign tracker.
export function CardHoverName({
  card,
  label,
  className,
}: {
  card: Card | undefined;
  label: string;
  className?: string;
}) {
  const { refs, referenceProps, isMounted, floatingStyles, transitionStyles } =
    useRestingTooltip();

  if (!card) return <span className={className}>{label}</span>;

  return (
    <>
      <span
        className={cx(css["name"], className)}
        ref={refs.setReference}
        {...referenceProps}
      >
        {label}
      </span>
      {isMounted && (
        <PortaledCardTooltip
          card={card}
          floatingStyles={floatingStyles}
          ref={refs.setFloating}
          transitionStyles={transitionStyles}
        />
      )}
    </>
  );
}
