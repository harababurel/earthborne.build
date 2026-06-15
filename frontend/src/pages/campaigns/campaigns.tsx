import { CopyIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { LocationGlyph } from "@/components/campaign/glyphs";
import { CreateCampaignModal } from "@/components/campaign/modals/create-campaign-modal";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { PageTitle } from "@/components/ui/page-title";
import { AppLayout } from "@/layouts/app-layout";
import { useStore } from "@/store";
import { selectCampaigns } from "@/store/selectors/campaigns";
import css from "./campaigns.module.css";

function Campaigns() {
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
    <AppLayout title={t("campaign.title")}>
      <PageTitle>{t("campaign.title")}</PageTitle>
      <div className={css["container"]}>
        <header className={css["header"]}>
          <div>
            <h1>{t("campaign.title")}</h1>
            <p className={css["subtitle"]}>{t("campaign.subtitle")}</p>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button data-testid="campaigns-create">
                <PlusIcon />
                {t("campaign.new")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <CreateCampaignModal />
            </DialogContent>
          </Dialog>
        </header>

        {campaigns.length ? (
          <ul className={css["list"]}>
            {campaigns.map((campaign) => {
              const locationName = campaign.current_location
                ? t(`campaign.data.locations.${campaign.current_location}`)
                : null;
              return (
                <li key={campaign.id} className={css["item"]}>
                  <button
                    type="button"
                    className={css["item-main"]}
                    onClick={() => navigate(`/campaign/edit/${campaign.id}`)}
                  >
                    <span className={css["name"]}>{campaign.name}</span>
                    <span className={css["cycle-pill"]}>
                      {t(`campaign.data.cycles.${campaign.cycle_id}`)}
                    </span>
                  </button>

                  <div className={css["status"]}>
                    {locationName && <LocationGlyph name={locationName} />}
                    <div className={css["status-text"]}>
                      <span className={css["location"]}>
                        {locationName ?? "—"}
                      </span>
                      <span className={css["meta"]}>
                        {t("campaign.day_label", { day: campaign.day })}
                      </span>
                    </div>
                  </div>

                  <div className={css["item-actions"]}>
                    <Button
                      iconOnly
                      onClick={() => duplicateCampaign(campaign.id)}
                      tooltip={t("campaign.actions.duplicate")}
                      variant="bare"
                    >
                      <CopyIcon />
                    </Button>
                    <Button
                      iconOnly
                      onClick={() => onDelete(campaign.id)}
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
        ) : (
          <p className={css["empty"]}>{t("campaign.empty")}</p>
        )}
      </div>
    </AppLayout>
  );
}

export default Campaigns;
