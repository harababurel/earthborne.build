import type { Campaign, RemovedEntry } from "@earthborne-build/shared";
import { Trash2Icon } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { useStore } from "@/store";
import { getPathCards } from "@/store/lib/campaign/data";
import css from "./tabs.module.css";

export function RemovedTab({ campaign }: { campaign: Campaign }) {
  const { t } = useTranslation();
  const updateCampaign = useStore((state) => state.updateCampaign);
  const [selected, setSelected] = useState("");

  const pathCards = useMemo(() => getPathCards(), []);

  const options = useMemo(
    () =>
      pathCards
        .map((card) => ({
          value: card.code,
          label: t(`campaign.data.path_cards.${card.code}`),
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [pathCards, t],
  );

  const setRemoved = (removed: RemovedEntry[]) =>
    updateCampaign(campaign.id, { removed });

  const onAdd = () => {
    const def = pathCards.find((c) => c.code === selected);
    if (!def) return;
    setRemoved([
      ...campaign.removed,
      { set_id: def.set_id, name: t(`campaign.data.path_cards.${def.code}`) },
    ]);
    setSelected("");
  };

  const remove = (index: number) =>
    setRemoved(campaign.removed.filter((_, i) => i !== index));

  return (
    <div className={css["section"]}>
      <div className={css["row"]}>
        <Select
          emptyLabel={t("campaign.removed.select_placeholder")}
          onChange={(e) => setSelected(e.target.value)}
          options={options}
          value={selected}
        />
        <Button disabled={!selected} onClick={onAdd}>
          {t("campaign.removed.add")}
        </Button>
      </div>

      {campaign.removed.length ? (
        <ul className={css["list"]}>
          {campaign.removed.map((entry, index) => (
            <li className={css["item"]} key={`${entry.name}-${index}`}>
              <span className={css["item-main"]}>{entry.name}</span>
              <Button
                iconOnly
                onClick={() => remove(index)}
                tooltip={t("campaign.actions.delete")}
                variant="bare"
              >
                <Trash2Icon />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className={css["empty"]}>{t("campaign.removed.none")}</p>
      )}
    </div>
  );
}
