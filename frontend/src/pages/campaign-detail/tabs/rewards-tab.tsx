import type { Campaign } from "@earthborne-build/shared";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ListCard } from "@/components/list-card/list-card";
import { Button } from "@/components/ui/button";
import { useStore } from "@/store";
import {
  selectLocaleSortingCollator,
  selectMetadata,
} from "@/store/selectors/shared";
import { displayAttribute } from "@/utils/card-utils";
import css from "./tabs.module.css";

export function RewardsTab({ campaign }: { campaign: Campaign }) {
  const { t } = useTranslation();
  const metadata = useStore(selectMetadata);
  const collator = useStore(selectLocaleSortingCollator);
  const updateCampaign = useStore((state) => state.updateCampaign);

  const [query, setQuery] = useState("");

  const rewardCards = useMemo(
    () =>
      Object.values(metadata.cards)
        .filter((card) => card.category === "reward")
        .sort((a, b) => collator.compare(a.name, b.name)),
    [metadata, collator],
  );

  const unlocked = new Set(campaign.rewards);

  const filtered = query
    ? rewardCards.filter((c) =>
        displayAttribute(c, "name").toLowerCase().includes(query.toLowerCase()),
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
      <ol className={css["card-grid"]}>
        {filtered.map((card) => {
          const isUnlocked = unlocked.has(card.code);
          return (
            <ListCard
              as="li"
              card={card}
              key={card.code}
              omitBorders
              renderCardAction={() => (
                <Button
                  onClick={() => toggle(card.code)}
                  size="sm"
                  variant={isUnlocked ? "bare" : "primary"}
                >
                  {isUnlocked
                    ? t("campaign.rewards.remove")
                    : t("campaign.rewards.unlock")}
                </Button>
              )}
              size="sm"
            />
          );
        })}
      </ol>
    </div>
  );
}
