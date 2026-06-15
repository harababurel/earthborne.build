import type { Campaign } from "@earthborne-build/shared";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useStore } from "@/store";
import { selectMetadata } from "@/store/selectors/shared";
import { displayAttribute } from "@/utils/card-utils";
import css from "./tabs.module.css";

export function RewardsTab({ campaign }: { campaign: Campaign }) {
  const { t } = useTranslation();
  const metadata = useStore(selectMetadata);
  const updateCampaign = useStore((state) => state.updateCampaign);

  const [query, setQuery] = useState("");

  const rewardCards = useMemo(
    () =>
      Object.values(metadata.cards)
        .filter((card) => card.category === "reward")
        .map((card) => ({
          code: card.code,
          name: displayAttribute(card, "name"),
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [metadata],
  );

  const unlocked = new Set(campaign.rewards);

  const filtered = query
    ? rewardCards.filter((c) =>
        c.name.toLowerCase().includes(query.toLowerCase()),
      )
    : rewardCards;

  const toggle = (code: string) => {
    const next = unlocked.has(code)
      ? campaign.rewards.filter((c) => c !== code)
      : [...campaign.rewards, code];
    updateCampaign(campaign.id, { rewards: next });
  };

  return (
    <div className={css["section"]}>
      <p className={css["help"]}>{t("campaign.rewards.help")}</p>
      <input
        className={css["input"]}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("campaign.rewards.search_placeholder")}
        value={query}
      />
      <div className={css["card-grid"]}>
        {filtered.map((card) => {
          const isUnlocked = unlocked.has(card.code);
          return (
            <div className={css["item"]} key={card.code}>
              <span className={css["item-main"]}>{card.name}</span>
              <Button
                onClick={() => toggle(card.code)}
                size="sm"
                variant={isUnlocked ? "bare" : "primary"}
              >
                {isUnlocked
                  ? t("campaign.rewards.remove")
                  : t("campaign.rewards.unlock")}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
