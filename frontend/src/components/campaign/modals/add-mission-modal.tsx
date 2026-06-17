import type { Campaign, MissionEntry } from "@earthborne-build/shared";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import { campaignMissionPacks } from "@/store/lib/campaign/data";
import { selectMetadata } from "@/store/selectors/shared";
import { displayAttribute } from "@/utils/card-utils";
import { Button } from "../../ui/button";
import { useDialogContextChecked } from "../../ui/dialog.hooks";
import {
  DefaultModalContent,
  Modal,
  ModalActions,
  ModalBackdrop,
  ModalInner,
} from "../../ui/modal";
import { Select } from "../../ui/select";
import css from "./modals.module.css";

const CUSTOM = "__custom__";

export function AddMissionModal({ campaign }: { campaign: Campaign }) {
  const { t } = useTranslation();
  const { setOpen } = useDialogContextChecked();
  const metadata = useStore(selectMetadata);
  const updateCampaign = useStore((state) => state.updateCampaign);

  const [day, setDay] = useState(String(campaign.day));
  const [selected, setSelected] = useState("");
  const [customName, setCustomName] = useState("");
  const [subject, setSubject] = useState("");

  // Mission cards for this campaign's packs, deduped by name (lowest set_position).
  const missionOptions = useMemo(() => {
    const packs = campaignMissionPacks(campaign);
    const byName = new Map<string, { code: string; pos: number }>();
    for (const card of Object.values(metadata.cards)) {
      if (card.type_code !== "mission") continue;
      if (!packs.includes(card.pack_code)) continue;
      const name = displayAttribute(card, "name");
      const pos = Number(card.set_position ?? 0);
      const existing = byName.get(name);
      if (!existing || pos < existing.pos) {
        byName.set(name, { code: card.code, pos });
      }
    }
    const options = [...byName.entries()]
      .map(([name, { code }]) => ({ value: code, label: name }))
      .sort((a, b) => a.label.localeCompare(b.label));
    return [
      ...options,
      { value: CUSTOM, label: t("campaign.missions.custom") },
    ];
  }, [campaign, metadata, t]);

  const onAdd = async () => {
    const dayNum = Number(day) || campaign.day;
    const trimmedSubject = subject.trim();
    let mission: MissionEntry | null = null;
    if (selected === CUSTOM) {
      const name = customName.trim();
      if (name) {
        mission = { day: dayNum, name, checks: [false, false, false] };
      }
    } else if (selected) {
      const card = metadata.cards[selected];
      if (card) {
        mission = {
          day: dayNum,
          name: displayAttribute(card, "name"),
          card_code: card.code,
          checks: [false, false, false],
        };
      }
    }
    if (!mission) return;
    if (trimmedSubject) mission.subject = trimmedSubject;
    await updateCampaign(campaign.id, {
      missions: [...campaign.missions, mission],
    });
    setOpen(false);
  };

  return (
    <Modal>
      <ModalBackdrop />
      <ModalInner size="26rem">
        <ModalActions />
        <DefaultModalContent
          mainClassName={css["main-spaced"]}
          title={t("campaign.missions.add")}
          footer={
            <Button onClick={onAdd} variant="primary">
              {t("campaign.missions.add")}
            </Button>
          }
        >
          <div className={css["body"]}>
            <div className={css["field"]}>
              <span className={css["sub"]}>{t("campaign.missions.day")}</span>
              <input
                className={css["input"]}
                min={1}
                onChange={(e) => setDay(e.target.value)}
                step={1}
                type="number"
                value={day}
              />
            </div>
            <div className={css["field"]}>
              <span className={css["sub"]}>{t("campaign.missions.name")}</span>
              <Select
                emptyLabel={t("campaign.missions.select_placeholder")}
                onChange={(e) => setSelected(e.target.value)}
                options={missionOptions}
                value={selected}
              />
            </div>
            {selected === CUSTOM && (
              <input
                className={css["input"]}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder={t("campaign.missions.name_placeholder")}
                value={customName}
              />
            )}
            <div className={css["field"]}>
              <span className={css["sub"]}>
                {t("campaign.missions.subject")}
              </span>
              <input
                className={css["input"]}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={t("campaign.missions.subject_placeholder")}
                value={subject}
              />
            </div>
          </div>
        </DefaultModalContent>
      </ModalInner>
    </Modal>
  );
}
