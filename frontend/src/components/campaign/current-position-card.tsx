import type { Campaign } from "@earthborne-build/shared";
import { CalendarClockIcon, FootprintsIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogTrigger } from "../ui/dialog";
import { Plane } from "../ui/plane";
import css from "./current-position-card.module.css";
import { LocationGlyph, TerrainGlyph } from "./glyphs";
import { RecordedJourneyModal } from "./modals/recorded-journey-modal";
import { TravelModal } from "./modals/travel-modal";

export function CurrentPositionCard({ campaign }: { campaign: Campaign }) {
  const { t } = useTranslation();

  const locationName = campaign.current_location
    ? t(`campaign.data.locations.${campaign.current_location}`)
    : null;
  const terrain = campaign.current_path_terrain;

  return (
    <Plane className={css["card"]}>
      <h3 className={css["title"]}>{t("campaign.journey.current_location")}</h3>

      <div className={css["row"]}>
        {locationName ? (
          <>
            <LocationGlyph name={locationName} />
            <span className={css["name"]}>{locationName}</span>
          </>
        ) : (
          <span className={css["sub"]}>
            {t("campaign.journey.no_location")}
          </span>
        )}
      </div>

      <div className={css["row"]}>
        <span className={css["label"]}>{t("campaign.journey.terrain")}:</span>
        {terrain ? (
          <>
            <TerrainGlyph terrain={terrain} />
            <span>{t(`campaign.data.terrain.${terrain}`)}</span>
          </>
        ) : (
          <span className={css["sub"]}>{t("common.none")}</span>
        )}
      </div>

      <div className={css["actions"]}>
        <Dialog>
          <DialogTrigger asChild>
            <Button size="sm">
              <FootprintsIcon /> {t("campaign.journey.travel")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <TravelModal campaign={campaign} />
          </DialogContent>
        </Dialog>

        <Dialog>
          <DialogTrigger asChild>
            <Button size="sm" variant="bare">
              <CalendarClockIcon /> {t("campaign.journey.history")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <RecordedJourneyModal campaign={campaign} />
          </DialogContent>
        </Dialog>
      </div>
    </Plane>
  );
}
