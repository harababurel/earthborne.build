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
import { CustomSelect } from "../../ui/custom-select";
import { useDialogContextChecked } from "../../ui/dialog.hooks";
import {
  DefaultModalContent,
  Modal,
  ModalActions,
  ModalBackdrop,
  ModalInner,
} from "../../ui/modal";
import { LocationGlyph, TerrainGlyph } from "../glyphs";
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

  const locationItems = useMemo(() => {
    const ids = showAll ? Object.keys(allLocations) : adjacent.map((c) => c.id);
    const items = ids
      .filter((id) => id !== campaign.current_location)
      .map((id) => ({ value: id, label: t(`campaign.data.locations.${id}`) }))
      .sort((a, b) => a.label.localeCompare(b.label));
    return [
      { value: "", label: t("campaign.travel.select_location") },
      ...items,
    ];
  }, [showAll, allLocations, adjacent, campaign.current_location, t]);

  const terrainItems = useMemo(() => {
    const items = getPathTypes(campaign.cycle_id)
      .map((p) => ({ value: p.id, label: t(`campaign.data.terrain.${p.id}`) }))
      .sort((a, b) => a.label.localeCompare(b.label));
    return [{ value: "", label: t("campaign.travel.terrain_none") }, ...items];
  }, [campaign.cycle_id, t]);

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
          mainClassName={css["main-spaced"]}
          title={t("campaign.travel.departing", { location: currentName })}
          footer={
            <Button
              className={css["travel-button"]}
              onClick={onTravel}
              variant="primary"
            >
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
              <CustomSelect
                aria-label={t("campaign.travel.select_location")}
                items={locationItems}
                menuClassName={css["travel-menu"]}
                onValueChange={onSelectDestination}
                renderItem={(item) => (
                  <span className={css["option-row"]}>
                    {item?.value && <LocationGlyph name={item.label} />}
                    {item?.label ?? t("campaign.travel.select_location")}
                  </span>
                )}
                value={destination}
              />
            </div>

            <div className={css["field"]}>
              <span className={css["sub"]}>{t("campaign.travel.terrain")}</span>
              <CustomSelect
                aria-label={t("campaign.travel.terrain")}
                items={terrainItems}
                menuClassName={css["travel-menu"]}
                onValueChange={setTerrain}
                renderItem={(item) => (
                  <span className={css["option-row"]}>
                    {item?.value && <TerrainGlyph terrain={item.value} />}
                    {item?.label ?? t("campaign.travel.terrain_none")}
                  </span>
                )}
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
