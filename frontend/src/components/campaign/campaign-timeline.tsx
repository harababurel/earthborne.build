import type { Campaign } from "@earthborne-build/shared";
import { BookOpenIcon } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { getCampaignGuideEntryHrefById } from "@/components/card/campaign-guide-entry";
import { getMaxDay, getWeather } from "@/store/lib/campaign/data";
import { cx } from "@/utils/cx";
import css from "./campaign-timeline.module.css";
import { Moon } from "./moon";
import { WeatherName } from "./weather-name";

// Horizontal day strip: per day a moon glyph + number (current-day ringed,
// past/future styled) with guide-entry markers above and weather bands below.
export function CampaignTimeline({
  campaign,
  onSelectDay,
}: {
  campaign: Campaign;
  onSelectDay: (day: number) => void;
}) {
  const { t } = useTranslation();

  const maxDay = getMaxDay(campaign.cycle_id, campaign.extended_calendar);
  const weather = getWeather(campaign.cycle_id, campaign.extended_calendar);
  // Disambiguate same-numbered entries by the tracked campaign's guide.
  const guidePack = campaign.cycle_id === "loa" ? "loa" : "ebr";

  const guidesByDay = useMemo(() => {
    const map: Record<number, string[]> = {};
    for (const entry of campaign.calendar) {
      map[entry.day] = [...(map[entry.day] ?? []), ...entry.guides];
    }
    return map;
  }, [campaign.calendar]);

  const days = Array.from({ length: maxDay }, (_, i) => i + 1);

  return (
    <div className={css["scroller"]}>
      <div
        className={css["grid"]}
        style={{ "--day-count": maxDay } as React.CSSProperties}
      >
        {days.map((day) => {
          const guides = guidesByDay[day];
          return guides?.length ? (
            <div
              className={css["guide-marker"]}
              key={`g-${day}`}
              style={{ "--col": day } as React.CSSProperties}
            >
              <BookOpenIcon className={css["guide-icon"]} />
              <span className={css["guide-entries"]}>
                {guides.map((guide) => {
                  const href = getCampaignGuideEntryHrefById(guide, guidePack);
                  return href ? (
                    <a className={css["guide-entry"]} href={href} key={guide}>
                      {guide}
                    </a>
                  ) : (
                    <span className={css["guide-entry"]} key={guide}>
                      {guide}
                    </span>
                  );
                })}
              </span>
            </div>
          ) : null;
        })}

        {days.map((day) => (
          <button
            type="button"
            className={cx(
              css["day"],
              day === campaign.day && css["current"],
              day < campaign.day && css["past"],
            )}
            key={`d-${day}`}
            onClick={() => onSelectDay(day)}
            style={{ "--col": day } as React.CSSProperties}
            title={t("campaign.journey.day", { day })}
          >
            <Moon className={css["moon"]} day={day} />
            <span className={css["day-number"]}>{day}</span>
          </button>
        ))}

        {weather.map((band) => (
          <div
            className={css["weather"]}
            key={`w-${band.start}`}
            style={
              {
                "--col-start": band.start,
                "--col-span": band.end - band.start + 1,
              } as React.CSSProperties
            }
          >
            <span aria-hidden className={css["bracket"]} />
            <WeatherName
              className={css["weather-name"]}
              label={t(`campaign.data.weather.${band.valley_id}`)}
              weatherId={band.valley_id}
            />
            {band.underground_id && (
              <WeatherName
                className={css["weather-underground"]}
                label={t(`campaign.data.weather.${band.underground_id}`)}
                weatherId={band.underground_id}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
