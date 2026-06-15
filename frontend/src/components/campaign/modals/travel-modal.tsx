import type { Campaign } from "@earthborne-build/shared";
import { FootprintsIcon, MoonIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import {
  getMapLocationsForCampaign,
  getPathTypes,
} from "@/store/lib/campaign/data";
import { adjacentLocations } from "@/store/lib/campaign/travel";
import { Button } from "../../ui/button";
import { Checkbox } from "../../ui/checkbox";
import { useDialogContextChecked } from "../../ui/dialog.hooks";
import {
  DefaultModalContent,
  Modal,
  ModalActions,
  ModalBackdrop,
  ModalInner,
} from "../../ui/modal";
import { Select } from "../../ui/select";
import { LocationGlyph } from "../glyphs";
import css from "./modals.module.css";

export function TravelModal({ campaign }: { campaign: Campaign }) {
  const { t } = useTranslation();
  const { setOpen } = useDialogContextChecked();
  const travel = useStore((state) => state.travel);

  const [showAll, setShowAll] = useState(false);
  const [destination, setDestination] = useState("");
  const [terrain, setTerrain] = useState("");
  const [camp, setCamp] = useState(false);

  const adjacent = useMemo(() => adjacentLocations(campaign), [campaign]);
  const allLocations = useMemo(
    () => getMapLocationsForCampaign(campaign),
    [campaign],
  );

  const locationOptions = useMemo(() => {
    const ids = showAll ? Object.keys(allLocations) : adjacent.map((c) => c.id);
    return ids
      .filter((id) => id !== campaign.current_location)
      .map((id) => {
        const edge = adjacent.find((c) => c.id === id);
        const terrainLabel =
          edge && edge.path !== "none"
            ? t(`campaign.data.terrain.${edge.path}`)
            : undefined;
        return {
          value: id,
          label: terrainLabel
            ? `${t(`campaign.data.locations.${id}`)} — ${terrainLabel}`
            : t(`campaign.data.locations.${id}`),
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [showAll, allLocations, adjacent, campaign.current_location, t]);

  const terrainOptions = useMemo(
    () =>
      getPathTypes(campaign.cycle_id)
        .map((p) => ({
          value: p.id,
          label: t(`campaign.data.terrain.${p.id}`),
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [campaign.cycle_id, t],
  );

  const onSelectDestination = (id: string) => {
    setDestination(id);
    const edge = adjacent.find((c) => c.id === id);
    setTerrain(edge && edge.path !== "none" ? edge.path : "");
  };

  const onTravel = async () => {
    await travel(campaign.id, {
      to: destination || null,
      path_terrain: terrain || null,
      camped: camp,
    });
    setOpen(false);
  };

  const currentName = campaign.current_location
    ? t(`campaign.data.locations.${campaign.current_location}`)
    : "";

  return (
    <Modal>
      <ModalBackdrop />
      <ModalInner size="32rem">
        <ModalActions />
        <DefaultModalContent
          title={t("campaign.travel.departing", { location: currentName })}
          footer={
            <Button onClick={onTravel} variant="primary">
              {camp ? <MoonIcon /> : <FootprintsIcon />}
              {camp
                ? t("campaign.travel.travel_camp")
                : t("campaign.travel.travel")}
            </Button>
          }
        >
          <div className={css["body"]}>
            <div className={css["title-row"]}>
              <LocationGlyph name={currentName} />
              <span>{currentName}</span>
            </div>
            <Checkbox
              checked={showAll}
              label={t("campaign.travel.show_all")}
              onCheckedChange={(v) => {
                setShowAll(v);
                setDestination("");
                setTerrain("");
              }}
            />

            <div className={css["field"]}>
              <span className={css["sub"]}>
                {t("campaign.travel.connecting_location")}
              </span>
              <Select
                emptyLabel={t("campaign.travel.select_location")}
                onChange={(e) => onSelectDestination(e.target.value)}
                options={locationOptions}
                value={destination}
              />
            </div>

            <div className={css["field"]}>
              <span className={css["sub"]}>{t("campaign.travel.terrain")}</span>
              <Select
                emptyLabel={t("campaign.travel.terrain_none")}
                onChange={(e) => setTerrain(e.target.value)}
                options={terrainOptions}
                value={terrain}
              />
            </div>

            <Checkbox
              checked={camp}
              label={t("campaign.travel.camp")}
              onCheckedChange={setCamp}
            />
            {camp && (
              <p className={css["note"]}>{t("campaign.travel.camp_note")}</p>
            )}
          </div>
        </DefaultModalContent>
      </ModalInner>
    </Modal>
  );
}
