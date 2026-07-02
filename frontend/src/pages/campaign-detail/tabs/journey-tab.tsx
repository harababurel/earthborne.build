import type { Campaign, HistoryEntry } from "@earthborne-build/shared";
import { MoonIcon } from "lucide-react";
import { Fragment } from "react";
import { useTranslation } from "react-i18next";
import { LocationGlyph, TerrainGlyph } from "@/components/campaign/glyphs";
import { Moon } from "@/components/campaign/moon";
import { cx } from "@/utils/cx";
import css from "./journey-tab.module.css";

export function JourneyTab({ campaign }: { campaign: Campaign }) {
  const { t } = useTranslation();
  const trails = buildDayTrails(campaign);

  if (!trails.length) {
    return (
      <p className={css["empty"]}>{t("campaign.journey.history_empty")}</p>
    );
  }

  return (
    <ol className={css["days"]}>
      {trails.map((trail) => {
        const isCurrentDay = trail.day === campaign.day;
        const restedInPlace =
          trail.stops.length === 1 && !trail.camped && !isCurrentDay;

        return (
          <li className={css["day"]} key={trail.day}>
            <header className={css["day-header"]}>
              <Moon className={css["day-moon"]} day={trail.day} />
              <h3 className={css["day-title"]}>
                {t("campaign.journey.day", { day: trail.day })}
              </h3>
              {trail.camped && (
                <span className={css["day-meta"]}>
                  {t("campaign.journey.camped")}
                </span>
              )}
              {restedInPlace && (
                <span className={css["day-meta"]}>
                  {t("campaign.journey.no_travel")}
                </span>
              )}
            </header>

            <div className={css["trail-scroller"]}>
              <div className={css["trail"]}>
                {trail.stops.map((stop, index) => {
                  const isLast = index === trail.stops.length - 1;
                  const name = t(`campaign.data.locations.${stop.location}`);

                  return (
                    <Fragment key={`${index}-${stop.location}`}>
                      {index > 0 && (
                        <div
                          className={cx(
                            css["edge"],
                            !stop.terrain && css["direct"],
                          )}
                        >
                          {stop.terrain && (
                            <span
                              className={css["edge-terrain"]}
                              title={t(`campaign.data.terrain.${stop.terrain}`)}
                            >
                              <TerrainGlyph
                                className={css["edge-glyph"]}
                                terrain={stop.terrain}
                              />
                            </span>
                          )}
                        </div>
                      )}
                      <div
                        className={cx(
                          css["stop"],
                          stop.isOrigin && !isLast && css["origin"],
                          isCurrentDay && isLast && css["current"],
                        )}
                      >
                        <span className={css["node"]}>
                          <LocationGlyph
                            className={css["node-glyph"]}
                            name={name}
                          />
                          {isLast && trail.camped && (
                            <span
                              className={css["camp-badge"]}
                              title={t("campaign.journey.camped")}
                            >
                              <MoonIcon />
                            </span>
                          )}
                        </span>
                        <span className={css["stop-name"]}>{name}</span>
                      </div>
                    </Fragment>
                  );
                })}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

type TrailStop = {
  location: string;
  // Terrain of the path leading into this stop; unset on the day's origin.
  terrain?: string | null;
  isOrigin?: boolean;
};

type DayTrail = {
  day: number;
  stops: TrailStop[];
  camped: boolean;
};

// One trail per day, newest first. Each day starts where the previous one
// ended; travels append stops, camping in place only flags the last stop.
// Days without a location on the map yet produce no trail.
function buildDayTrails(campaign: Campaign): DayTrail[] {
  const byDay = new Map<number, HistoryEntry[]>();
  for (const entry of campaign.history) {
    byDay.set(entry.day, [...(byDay.get(entry.day) ?? []), entry]);
  }

  const trails: DayTrail[] = [];
  let location = campaign.start_location ?? null;

  for (let day = 1; day <= campaign.day; day++) {
    const stops: TrailStop[] = [];
    let camped = false;

    if (location) stops.push({ location, isOrigin: true });

    for (const entry of byDay.get(day) ?? []) {
      camped ||= !!entry.camped;
      if (!entry.location || entry.location === location) continue;
      stops.push({ location: entry.location, terrain: entry.path_terrain });
      location = entry.location;
    }

    if (stops.length) trails.push({ day, stops, camped });
  }

  return trails.reverse();
}
