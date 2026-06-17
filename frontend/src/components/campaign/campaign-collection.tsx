import { CopyIcon, MapIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Scroller } from "@/components/ui/scroller";
import { useStore } from "@/store";
import { selectCampaigns } from "@/store/selectors/campaigns";
import css from "./campaign-collection.module.css";
import { LocationGlyph } from "./glyphs";
import { CreateCampaignModal } from "./modals/create-campaign-modal";

export function CampaignCollection() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();

  const campaigns = useStore(selectCampaigns);
  const duplicateCampaign = useStore((state) => state.duplicateCampaign);
  const deleteCampaign = useStore((state) => state.deleteCampaign);

  const onDelete = useCallback(
    (id: string | number) => {
      if (confirm(t("campaign.actions.delete_confirm"))) {
        deleteCampaign(id);
      }
    },
    [deleteCampaign, t],
  );

  return (
    <div className={css["container"]}>
      <header className={css["header"]}>
        <h2 className={css["title"]}>{t("campaign.title")}</h2>
      </header>

      <div className={css["cta"]}>
        <Dialog>
          <DialogTrigger asChild>
            <Button data-testid="campaign-collection-create" size="sm">
              <PlusIcon />
              {t("campaign.new")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <CreateCampaignModal />
          </DialogContent>
        </Dialog>
      </div>

      {campaigns.length ? (
        <Scroller className={css["scroller"]} type="hover">
          <ul className={css["list"]}>
            {campaigns.map((campaign) => {
              const locationName = campaign.current_location
                ? t(`campaign.data.locations.${campaign.current_location}`)
                : null;
              return (
                <li className={css["item"]} key={campaign.id}>
                  <span className={css["item-glyph"]}>
                    {locationName && <LocationGlyph name={locationName} />}
                  </span>
                  <button
                    className={css["item-main"]}
                    data-testid={`campaign-collection-item-${campaign.name}`}
                    onClick={() => navigate(`/campaign/edit/${campaign.id}`)}
                    type="button"
                  >
                    <span className={css["name"]}>{campaign.name}</span>
                    <span className={css["meta"]}>
                      <span className={css["cycle-pill"]}>
                        {t(`campaign.data.cycles.${campaign.cycle_id}`)}
                      </span>
                      {t("campaign.day_label", { day: campaign.day })}
                    </span>
                  </button>

                  <div className={css["item-actions"]}>
                    <Button
                      iconOnly
                      onClick={() => duplicateCampaign(campaign.id)}
                      size="sm"
                      tooltip={t("campaign.actions.duplicate")}
                      variant="bare"
                    >
                      <CopyIcon />
                    </Button>
                    <Button
                      iconOnly
                      onClick={() => onDelete(campaign.id)}
                      size="sm"
                      tooltip={t("campaign.actions.delete")}
                      variant="bare"
                    >
                      <Trash2Icon />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </Scroller>
      ) : (
        <div className={css["placeholder-container"]}>
          <figure className={css["placeholder"]}>
            <MapIcon />
            <figcaption className={css["placeholder-caption"]}>
              {t("campaign.empty")}
            </figcaption>
          </figure>
        </div>
      )}
    </div>
  );
}
