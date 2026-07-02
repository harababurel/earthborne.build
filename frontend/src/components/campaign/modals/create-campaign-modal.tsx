import type { CalendarEntry, CampaignCycle } from "@earthborne-build/shared";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useStore } from "@/store";
import {
  getCampaignCycles,
  getCampaignExpansions,
  getGuideEntries,
} from "@/store/lib/campaign/data";
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
import { Select } from "../../ui/select";
import css from "./modals.module.css";

// Both cycles begin at Lone Tree Station on the official trackers.
const START_LOCATION = "lone_tree_station";

export function CreateCampaignModal() {
  const { t } = useTranslation();
  const { setOpen } = useDialogContextChecked();
  const [, navigate] = useLocation();
  const createCampaign = useStore((state) => state.createCampaign);
  const updateCampaign = useStore((state) => state.updateCampaign);

  const [cycle, setCycle] = useState<CampaignCycle>("core");
  const [name, setName] = useState("");
  const [expansions, setExpansions] = useState<string[]>([]);
  const [setupEvents, setSetupEvents] = useState(false);

  const cycleOptions = useMemo(
    () =>
      getCampaignCycles().map((id) => ({
        value: id,
        label: t(`campaign.data.cycles.${id}`),
      })),
    [t],
  );
  const availableExpansions = useMemo(
    () => getCampaignExpansions(cycle),
    [cycle],
  );

  const toggleExpansion = (id: string, checked: boolean) =>
    setExpansions((prev) =>
      checked ? [...prev, id] : prev.filter((e) => e !== id),
    );

  const onCreate = async () => {
    const id = await createCampaign({
      name: name.trim() || t("campaign.create.default_name"),
      cycle_id: cycle,
      expansions,
      current_location: START_LOCATION,
    });

    const guides = getGuideEntries();
    const calendar: CalendarEntry[] = Object.entries(
      guides.fixed[cycle] ?? {},
    ).map(([day, g]) => ({ day: Number(day), guides: g }));
    if (setupEvents) {
      for (const exp of expansions) {
        for (const e of guides.expansionStarting[exp] ?? []) {
          calendar.push({ day: e.day, guides: e.guides });
        }
      }
    }
    if (calendar.length) await updateCampaign(id, { calendar });

    setOpen(false);
    navigate(`/campaign/edit/${id}`);
  };

  return (
    <Modal>
      <ModalBackdrop />
      <ModalInner size="28rem">
        <ModalActions />
        <DefaultModalContent
          title={t("campaign.create.title")}
          footer={
            <Button onClick={onCreate} variant="primary">
              {t("campaign.create.submit")}
            </Button>
          }
        >
          <div className={css["body"]}>
            <div className={css["field"]}>
              <span className={css["sub"]}>{t("campaign.create.cycle")}</span>
              <Select
                onChange={(e) => {
                  setCycle(e.target.value as CampaignCycle);
                  setExpansions([]);
                  setSetupEvents(false);
                }}
                options={cycleOptions}
                required
                value={cycle}
              />
            </div>
            <div className={css["field"]}>
              <span className={css["sub"]}>{t("campaign.create.name")}</span>
              <input
                className={css["input"]}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("campaign.create.name_placeholder")}
                value={name}
              />
            </div>
            {availableExpansions.length > 0 && (
              <div className={css["field"]}>
                <span className={css["sub"]}>
                  {t("campaign.create.expansions")}
                </span>
                {availableExpansions.map((exp) => (
                  <Checkbox
                    key={exp.id}
                    checked={expansions.includes(exp.id)}
                    label={t(`campaign.data.expansions.${exp.id}`)}
                    onCheckedChange={(c) => toggleExpansion(exp.id, c)}
                  />
                ))}
                <Checkbox
                  checked={setupEvents}
                  disabled={!expansions.length}
                  label={t("campaign.create.setup_events")}
                  onCheckedChange={setSetupEvents}
                />
              </div>
            )}
          </div>
        </DefaultModalContent>
      </ModalInner>
    </Modal>
  );
}
