import type { Campaign, RemovedEntry } from "@earthborne-build/shared";
import { Trash2Icon } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { useStore } from "@/store";
import { campaignPacks } from "@/store/lib/campaign/data";
import { selectMetadata } from "@/store/selectors/shared";
import { displayAttribute } from "@/utils/card-utils";
import css from "./tabs.module.css";

export function RemovedTab({ campaign }: { campaign: Campaign }) {
  const { t } = useTranslation();
  const metadata = useStore(selectMetadata);
  const updateCampaign = useStore((state) => state.updateCampaign);

  const [selected, setSelected] = useState("");
  const [destination, setDestination] = useState("");

  // Path cards for this campaign's packs, deduped by name (lowest set_position).
  const cardOptions = useMemo(() => {
    const packs = campaignPacks(campaign);
    const byName = new Map<string, { code: string; pos: number }>();
    for (const card of Object.values(metadata.cards)) {
      if (card.category_id !== "path") continue;
      if (!packs.includes(card.pack_code)) continue;
      const name = displayAttribute(card, "name");
      const pos = Number(card.set_position ?? 0);
      const existing = byName.get(name);
      if (!existing || pos < existing.pos)
        byName.set(name, { code: card.code, pos });
    }
    return [...byName.entries()]
      .map(([name, { code }]) => ({ value: code, label: name }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [campaign, metadata]);

  const setRemoved = (removed: RemovedEntry[]) =>
    updateCampaign(campaign.id, { removed });

  const onAdd = (action: "removed" | "moved") => {
    const card = metadata.cards[selected];
    if (!card) return;
    const dest = destination.trim();
    if (action === "moved" && !dest) return;
    const entry: RemovedEntry = {
      name: displayAttribute(card, "name"),
      action,
    };
    if (action === "moved") entry.destination = dest;
    setRemoved([...campaign.removed, entry]);
    setSelected("");
    setDestination("");
  };

  const remove = (index: number) => {
    if (!confirm(t("campaign.actions.delete_entry_confirm"))) return;
    setRemoved(campaign.removed.filter((_, i) => i !== index));
  };

  return (
    <div className={css["section"]}>
      <div className={css["add-form"]}>
        <div className={css["field"]}>
          <span className={css["field-label"]}>
            {t("campaign.removed.card")}
          </span>
          <Select
            emptyLabel={t("campaign.removed.select_placeholder")}
            onChange={(e) => setSelected(e.target.value)}
            options={cardOptions}
            value={selected}
          />
        </div>

        {selected && (
          <div className={css["fate-row"]}>
            <Button onClick={() => onAdd("removed")}>
              {t("campaign.removed.fate_remove")}
            </Button>
            <span className={css["or"]}>{t("campaign.removed.or")}</span>
            <Button
              disabled={!destination.trim()}
              onClick={() => onAdd("moved")}
            >
              {t("campaign.removed.fate_move")}
            </Button>
            <input
              className={css["input"]}
              onChange={(e) => setDestination(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onAdd("moved")}
              placeholder={t("campaign.removed.destination_placeholder")}
              value={destination}
            />
          </div>
        )}
      </div>

      {campaign.removed.length ? (
        <ul className={css["list"]}>
          {campaign.removed.map((entry, index) => (
            <li className={css["item"]} key={`${entry.name}-${index}`}>
              <span className={css["item-main"]}>{entry.name}</span>
              <span className={css["fate"]}>
                {entry.action === "moved" && entry.destination
                  ? t("campaign.removed.moved_to", {
                      destination: entry.destination,
                    })
                  : t("campaign.removed.removed")}
              </span>
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
