import type { Campaign, MissionEntry } from "@earthborne-build/shared";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import { campaignPacks } from "@/store/lib/campaign/data";
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

// Adds a mission, or edits `campaign.missions[editIndex]` in place when
// `editIndex` is set (progress/completed state is preserved on edit).
export function AddMissionModal({
  campaign,
  editIndex,
}: {
  campaign: Campaign;
  editIndex?: number;
}) {
  const { t } = useTranslation();
  const { setOpen } = useDialogContextChecked();
  const metadata = useStore(selectMetadata);
  const updateCampaign = useStore((state) => state.updateCampaign);

  const editing = editIndex != null ? campaign.missions[editIndex] : undefined;

  const [day, setDay] = useState(String(editing?.day ?? campaign.day));
  const [selected, setSelected] = useState(() => {
    if (!editing) return "";
    return editing.card_code && metadata.cards[editing.card_code]
      ? editing.card_code
      : CUSTOM;
  });
  const [customName, setCustomName] = useState(
    editing && !editing.card_code ? editing.name : "",
  );
  const [subject, setSubject] = useState(editing?.subject ?? "");

  // Mission cards for this campaign's packs, deduped by name (lowest set_position).
  const missionOptions = useMemo(() => {
    const packs = campaignPacks(campaign);
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
    // Keep the edited mission selectable even if it isn't the representative
    // copy of its name.
    if (editing?.card_code && metadata.cards[editing.card_code]) {
      const card = metadata.cards[editing.card_code];
      byName.set(displayAttribute(card, "name"), {
        code: card.code,
        pos: Number(card.set_position ?? 0),
      });
    }
    const options = [...byName.entries()]
      .map(([name, { code }]) => ({ value: code, label: name }))
      .sort((a, b) => a.label.localeCompare(b.label));
    return [
      ...options,
      { value: CUSTOM, label: t("campaign.missions.custom") },
    ];
  }, [campaign, metadata, t, editing]);

  const onSubmit = async () => {
    const dayNum = Math.max(1, Math.round(Number(day)) || campaign.day);
    const trimmedSubject = subject.trim();
    let mission: MissionEntry | null = null;
    if (selected === CUSTOM) {
      const name = customName.trim();
      if (name) {
        mission = {
          day: dayNum,
          name,
          checks: editing?.checks ?? [false, false, false],
          completed: editing?.completed,
        };
      }
    } else if (selected) {
      const card = metadata.cards[selected];
      if (card) {
        mission = {
          day: dayNum,
          name: displayAttribute(card, "name"),
          card_code: card.code,
          checks: editing?.checks ?? [false, false, false],
          completed: editing?.completed,
        };
      }
    }
    if (!mission) return;
    if (trimmedSubject) mission.subject = trimmedSubject;

    const missions = editing
      ? campaign.missions.map((m, i) => (i === editIndex ? mission : m))
      : [...campaign.missions, mission];
    await updateCampaign(campaign.id, { missions });
    setOpen(false);
  };

  const title = editing
    ? t("campaign.missions.edit")
    : t("campaign.missions.add");

  return (
    <Modal>
      <ModalBackdrop />
      <ModalInner size="26rem">
        <ModalActions />
        <DefaultModalContent
          mainClassName={css["main-spaced"]}
          title={title}
          footer={
            <Button onClick={onSubmit} variant="primary">
              {editing
                ? t("campaign.missions.save")
                : t("campaign.missions.add")}
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
