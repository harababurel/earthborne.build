import type { Campaign } from "@earthborne-build/shared";
import { Trash2Icon } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useStore } from "@/store";
import { getCampaignExpansions } from "@/store/lib/campaign/data";
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
import css from "./modals.module.css";
import { SharingSection } from "./sharing-section";

export function SettingsModal({ campaign }: { campaign: Campaign }) {
  const { t } = useTranslation();
  const { setOpen } = useDialogContextChecked();
  const [, navigate] = useLocation();
  const updateCampaign = useStore((state) => state.updateCampaign);
  const deleteCampaign = useStore((state) => state.deleteCampaign);

  const availableExpansions = useMemo(
    () => getCampaignExpansions(campaign.cycle_id),
    [campaign.cycle_id],
  );

  const toggleExpansion = (id: string, checked: boolean) =>
    updateCampaign(campaign.id, {
      expansions: checked
        ? [...campaign.expansions, id]
        : campaign.expansions.filter((e) => e !== id),
    });

  const onDelete = () => {
    if (confirm(t("campaign.actions.delete_confirm"))) {
      setOpen(false);
      deleteCampaign(campaign.id, () => navigate("/campaigns"));
    }
  };

  return (
    <Modal>
      <ModalBackdrop />
      <ModalInner size="28rem">
        <ModalActions />
        <DefaultModalContent title={t("campaign.tabs.settings")}>
          <div className={css["body"]}>
            <div className={css["field"]}>
              <span className={css["sub"]}>{t("campaign.settings.name")}</span>
              <input
                className={css["input"]}
                onChange={(e) =>
                  updateCampaign(campaign.id, { name: e.target.value })
                }
                value={campaign.name}
              />
            </div>

            {availableExpansions.length > 0 && (
              <div className={css["field"]}>
                <span className={css["sub"]}>
                  {t("campaign.settings.expansions")}
                </span>
                {availableExpansions.map((exp) => (
                  <Checkbox
                    key={exp.id}
                    checked={campaign.expansions.includes(exp.id)}
                    label={t(`campaign.data.expansions.${exp.id}`)}
                    onCheckedChange={(c) => toggleExpansion(exp.id, c)}
                  />
                ))}
              </div>
            )}

            {campaign.cycle_id === "core" && (
              <Checkbox
                checked={campaign.extended_calendar}
                label={t("campaign.settings.extend_calendar")}
                onCheckedChange={(c) =>
                  updateCampaign(campaign.id, { extended_calendar: c })
                }
              />
            )}

            <SharingSection campaign={campaign} />

            <Button onClick={onDelete} variant="bare">
              <Trash2Icon /> {t("campaign.settings.delete")}
            </Button>
          </div>
        </DefaultModalContent>
      </ModalInner>
    </Modal>
  );
}
