import type { Campaign } from "@earthborne-build/shared";
import { PlusIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import { Button } from "../ui/button";
import { Select } from "../ui/select";
import css from "./rail.module.css";

export function RangersPanel({ campaign }: { campaign: Campaign }) {
  const { t } = useTranslation();
  const decks = useStore((state) => state.data.decks);
  const linkDeck = useStore((state) => state.linkDeckToCampaign);
  const unlinkDeck = useStore((state) => state.unlinkDeckFromCampaign);
  const [selected, setSelected] = useState("");

  const linkedIds = new Set(campaign.deck_ids.map(String));
  const options = useMemo(
    () =>
      Object.values(decks)
        .filter((deck) => !linkedIds.has(String(deck.id)))
        .map((deck) => ({ value: String(deck.id), label: deck.name }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [decks, linkedIds],
  );

  const onLink = () => {
    if (!selected) return;
    linkDeck(campaign.id, selected);
    setSelected("");
  };

  return (
    <section className={css["panel"]}>
      <h3 className={css["title"]}>{t("campaign.tabs.party")}</h3>
      {campaign.deck_ids.length > 0 && (
        <ul className={css["list"]}>
          {campaign.deck_ids.map((deckId) => (
            <li className={css["item"]} key={deckId}>
              <span>{decks[deckId]?.name ?? String(deckId)}</span>
              <Button
                onClick={() => unlinkDeck(campaign.id, deckId)}
                size="sm"
                variant="bare"
              >
                {t("campaign.party.unlink")}
              </Button>
            </li>
          ))}
        </ul>
      )}
      <div className={css["add-row"]}>
        <Select
          emptyLabel={t("campaign.party.link_placeholder")}
          onChange={(e) => setSelected(e.target.value)}
          options={options}
          value={selected}
        />
        <Button disabled={!selected} onClick={onLink} size="sm">
          <PlusIcon />
        </Button>
      </div>
    </section>
  );
}
