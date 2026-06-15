import { PortaledCardTooltip } from "@/components/card-tooltip/card-tooltip-portaled";
import { useRestingTooltip } from "@/components/ui/tooltip.hooks";
import { useStore } from "@/store";
import { WEATHER_CARD_CODES } from "@/store/lib/campaign/data";
import { selectMetadata } from "@/store/selectors/shared";
import { cx } from "@/utils/cx";
import css from "./weather-name.module.css";

// A weather band label that previews its weather card on hover.
export function WeatherName({
  weatherId,
  label,
  className,
}: {
  weatherId: string;
  label: string;
  className?: string;
}) {
  const code = WEATHER_CARD_CODES[weatherId];
  const card = useStore((state) =>
    code ? selectMetadata(state).cards[code] : undefined,
  );
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
