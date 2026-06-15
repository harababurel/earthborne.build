import type { Campaign } from "@earthborne-build/shared";
import { MoonIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import { Button } from "../../ui/button";
import { useDialogContextChecked } from "../../ui/dialog.hooks";
import {
  DefaultModalContent,
  Modal,
  ModalActions,
  ModalBackdrop,
  ModalInner,
} from "../../ui/modal";
import { LocationGlyph } from "../glyphs";
import css from "./modals.module.css";

export function EndDayModal({ campaign }: { campaign: Campaign }) {
  const { t } = useTranslation();
  const { setOpen } = useDialogContextChecked();
  const endDay = useStore((state) => state.endDay);

  const currentName = campaign.current_location
    ? t(`campaign.data.locations.${campaign.current_location}`)
    : t("campaign.journey.no_location");

  const onEndDay = async () => {
    await endDay(campaign.id);
    setOpen(false);
  };

  return (
    <Modal>
      <ModalBackdrop />
      <ModalInner size="28rem">
        <ModalActions />
        <DefaultModalContent
          title={t("campaign.end_day.title")}
          footer={
            <Button onClick={onEndDay} variant="primary">
              <MoonIcon /> {t("campaign.end_day.confirm")}
            </Button>
          }
        >
          <div className={css["center"]}>
            <LocationGlyph name={currentName} />
            <strong>{currentName}</strong>
            <p>{t("campaign.end_day.summary", { day: campaign.day })}</p>
            <p className={css["note"]}>{t("campaign.end_day.guidance")}</p>
          </div>
        </DefaultModalContent>
      </ModalInner>
    </Modal>
  );
}
