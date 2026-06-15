import type { CalendarEntry, Campaign } from "@earthborne-build/shared";
import { Trash2Icon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import { Button } from "../../ui/button";
import {
  DefaultModalContent,
  Modal,
  ModalActions,
  ModalBackdrop,
  ModalInner,
} from "../../ui/modal";
import css from "./modals.module.css";

export function DayModal({
  campaign,
  day,
}: {
  campaign: Campaign;
  day: number;
}) {
  const { t } = useTranslation();
  const updateCampaign = useStore((state) => state.updateCampaign);
  const [entry, setEntry] = useState("");

  const guides = campaign.calendar
    .filter((c) => c.day === day)
    .flatMap((c) => c.guides);

  const setCalendar = (calendar: CalendarEntry[]) =>
    updateCampaign(campaign.id, { calendar });

  const onAdd = () => {
    const value = entry.trim();
    if (!value) return;
    const others = campaign.calendar.filter((c) => c.day !== day);
    setCalendar([...others, { day, guides: [...guides, value] }]);
    setEntry("");
  };

  const onRemove = (guide: string) => {
    const others = campaign.calendar.filter((c) => c.day !== day);
    const next = guides.filter((g) => g !== guide);
    setCalendar(next.length ? [...others, { day, guides: next }] : others);
  };

  return (
    <Modal>
      <ModalBackdrop />
      <ModalInner size="26rem">
        <ModalActions />
        <DefaultModalContent title={t("campaign.journey.day", { day })}>
          <div className={css["body"]}>
            <span className={css["sub"]}>{t("campaign.calendar.guides")}</span>
            {guides.length > 0 && (
              <ul className={css["guide-list"]}>
                {guides.map((guide) => (
                  <li className={css["guide-item"]} key={guide}>
                    <span>{guide}</span>
                    <Button
                      iconOnly
                      onClick={() => onRemove(guide)}
                      tooltip={t("campaign.actions.delete")}
                      variant="bare"
                    >
                      <Trash2Icon />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <div className={css["option"]}>
              <input
                className={css["input"]}
                onChange={(e) => setEntry(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onAdd()}
                placeholder={t("campaign.calendar.record")}
                value={entry}
              />
              <Button onClick={onAdd}>{t("campaign.calendar.add")}</Button>
            </div>
          </div>
        </DefaultModalContent>
      </ModalInner>
    </Modal>
  );
}
