import type { Campaign, MissionEntry } from "@earthborne-build/shared";
import {
  CheckIcon,
  DiamondIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AddMissionModal } from "@/components/campaign/modals/add-mission-modal";
import { ListCard } from "@/components/list-card/list-card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { useStore } from "@/store";
import { selectMetadata } from "@/store/selectors/shared";
import { cx } from "@/utils/cx";
import css from "./missions-tab.module.css";

export function MissionsTab({ campaign }: { campaign: Campaign }) {
  const { t } = useTranslation();
  const metadata = useStore(selectMetadata);
  const updateCampaign = useStore((state) => state.updateCampaign);
  const [editIndex, setEditIndex] = useState<number | null>(null);

  const setMissions = (missions: MissionEntry[]) =>
    updateCampaign(campaign.id, { missions });

  const toggleCheck = (index: number, checkIndex: number) => {
    setMissions(
      campaign.missions.map((m, i) => {
        if (i !== index) return m;
        const checks = [...(m.checks ?? [false, false, false])];
        checks[checkIndex] = !checks[checkIndex];
        return { ...m, checks };
      }),
    );
  };

  const toggleCompleted = (index: number) =>
    setMissions(
      campaign.missions.map((m, i) =>
        i === index ? { ...m, completed: !m.completed } : m,
      ),
    );

  const remove = (index: number) => {
    if (!confirm(t("campaign.missions.delete_confirm"))) return;
    setMissions(campaign.missions.filter((_, i) => i !== index));
  };

  return (
    <div className={css["section"]}>
      <Dialog>
        <DialogTrigger asChild>
          <Button size="sm">
            <PlusIcon /> {t("campaign.missions.add")}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <AddMissionModal campaign={campaign} />
        </DialogContent>
      </Dialog>

      <Dialog
        open={editIndex != null}
        onOpenChange={(open) => !open && setEditIndex(null)}
      >
        <DialogContent>
          {editIndex != null && (
            <AddMissionModal campaign={campaign} editIndex={editIndex} />
          )}
        </DialogContent>
      </Dialog>

      {campaign.missions.length ? (
        <ul className={css["mission-list"]}>
          <li className={css["mission-header"]}>
            <span className={css["col-day"]}>{t("campaign.missions.day")}</span>
            <span className={css["col-mission"]}>
              {t("campaign.missions.name")}
            </span>
            <span className={css["col-subject"]}>
              {t("campaign.missions.subject")}
            </span>
            <span className={css["col-progress"]}>
              {t("campaign.missions.progress")}
            </span>
            <span className={css["col-actions"]} />
          </li>
          {campaign.missions.map((mission, index) => {
            const card = mission.card_code
              ? metadata.cards[mission.card_code]
              : undefined;
            const checks = mission.checks ?? [false, false, false];
            const completed = !!mission.completed;
            return (
              <li
                className={cx(
                  css["mission-row"],
                  completed && css["completed-row"],
                )}
                key={`${mission.name}-${index}`}
              >
                <span className={css["col-day"]}>
                  <span className={css["day-chip"]}>{mission.day}</span>
                </span>

                {card ? (
                  <ListCard
                    card={card}
                    className={css["mission-card"]}
                    omitBorders
                    size="sm"
                  />
                ) : (
                  <span className={css["custom-name"]}>{mission.name}</span>
                )}

                <span className={cx(css["col-subject"], css["subject"])}>
                  {mission.subject}
                </span>

                <div className={cx(css["col-progress"], css["diamonds"])}>
                  {checks.map((checked, ci) => (
                    <button
                      // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length progress boxes.
                      key={ci}
                      aria-label={t("campaign.missions.progress")}
                      className={cx(css["diamond"], checked && css["filled"])}
                      onClick={() => toggleCheck(index, ci)}
                      type="button"
                    >
                      <DiamondIcon />
                    </button>
                  ))}
                </div>

                <span className={css["col-actions"]}>
                  <Button
                    aria-pressed={completed}
                    className={cx(
                      css["complete-toggle"],
                      completed && css["complete-toggle-active"],
                    )}
                    iconOnly
                    onClick={() => toggleCompleted(index)}
                    tooltip={
                      completed
                        ? t("campaign.missions.reopen")
                        : t("campaign.missions.complete")
                    }
                    variant="bare"
                  >
                    <CheckIcon />
                  </Button>
                  <Button
                    iconOnly
                    onClick={() => setEditIndex(index)}
                    tooltip={t("campaign.missions.edit")}
                    variant="bare"
                  >
                    <PencilIcon />
                  </Button>
                  <Button
                    iconOnly
                    onClick={() => remove(index)}
                    tooltip={t("campaign.actions.delete")}
                    variant="bare"
                  >
                    <Trash2Icon />
                  </Button>
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className={css["empty"]}>{t("campaign.missions.none")}</p>
      )}
    </div>
  );
}
