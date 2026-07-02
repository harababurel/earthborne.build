import { useStore } from "@/store";
import { WEATHER_CARD_CODES } from "@/store/lib/campaign/data";
import { selectMetadata } from "@/store/selectors/shared";
import { CardHoverName } from "./card-hover-name";

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

  return <CardHoverName card={card} className={className} label={label} />;
}
