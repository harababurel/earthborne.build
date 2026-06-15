import type { Campaign, MissionEntry } from "@earthborne-build/shared";
import { DiamondIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AddMissionModal } from "@/components/campaign/modals/add-mission-modal";
import { CardThumbnail } from "@/components/card-thumbnail";
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

  const setMissions = (missions: MissionEntry[]) =>
    updateCampaign(campaign.id, { missions });

  const toggleCheck = (index: number, checkIndex: number) => {
    setMissions(
      campaign.missions.map((m, i) => {
        if (i !== index) return m;
        const checks = [...(m.checks ?? [false, false, false])];
        checks[checkIndex] = !checks[checkIndex];
        return { ...m, checks, completed: checks.every(Boolean) };
      }),
    );
  };

  const remove = (index: number) =>
    setMissions(campaign.missions.filter((_, i) => i !== index));

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

      {campaign.missions.length ? (
        <table className={css["table"]}>
          <thead>
            <tr>
              <th>{t("common.date")}</th>
              <th>{t("campaign.missions.name")}</th>
              <th>{t("campaign.missions.progress")}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {campaign.missions.map((mission, index) => {
              const card = mission.card_code
                ? metadata.cards[mission.card_code]
                : undefined;
              const checks = mission.checks ?? [false, false, false];
              return (
                <tr key={`${mission.name}-${index}`}>
                  <td>
                    <span className={css["day-chip"]}>{mission.day}</span>
                  </td>
                  <td>
                    <div className={css["mission-name"]}>
                      {card && (
                        <CardThumbnail
                          card={card}
                          className={css["thumbnail"]}
                        />
                      )}
                      <span
                        className={
                          mission.completed ? css["completed"] : undefined
                        }
                      >
                        {mission.name}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className={css["diamonds"]}>
                      {checks.map((checked, ci) => (
                        <button
                          // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length progress boxes.
                          key={ci}
                          aria-label={t("campaign.missions.progress")}
                          className={cx(
                            css["diamond"],
                            checked && css["filled"],
                          )}
                          onClick={() => toggleCheck(index, ci)}
                          type="button"
                        >
                          <DiamondIcon />
                        </button>
                      ))}
                    </div>
                  </td>
                  <td>
                    <Button
                      iconOnly
                      onClick={() => remove(index)}
                      tooltip={t("campaign.actions.delete")}
                      variant="bare"
                    >
                      <Trash2Icon />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <p className={css["empty"]}>{t("campaign.missions.none")}</p>
      )}
    </div>
  );
}
