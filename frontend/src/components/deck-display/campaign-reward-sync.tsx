import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useStore } from "@/store";
import type { ResolvedDeck } from "@/store/lib/types";
import { selectCampaignForDeck } from "@/store/selectors/campaigns";
import { selectMetadata } from "@/store/selectors/shared";
import { displayAttribute } from "@/utils/card-utils";
import css from "./deck-display.module.css";

// Surfaces a linked campaign's unlocked reward pool inside the deck's reward
// section. Unlocking reuses the deck's existing `unlockReward` flow untouched —
// the campaign only decides *what* is available at the table.
export function CampaignRewardSync({
  canEdit,
  deck,
}: {
  canEdit: boolean;
  deck: ResolvedDeck;
}) {
  const { t } = useTranslation();
  const campaign = useStore((state) => selectCampaignForDeck(state, deck.id));
  const metadata = useStore(selectMetadata);
  const unlockReward = useStore((state) => state.unlockReward);

  if (!campaign?.rewards.length) return null;

  const pending = campaign.rewards.filter((code) => !isInDeck(deck, code));

  if (!pending.length) return null;

  return (
    <div className={css["campaign-reward-sync"]}>
      <p>{t("deck.rewards.from_campaign", { name: campaign.name })}</p>
      <ul>
        {pending.map((code) => {
          const card = metadata.cards[code];
          const name = card ? displayAttribute(card, "name") : code;
          return (
            <li key={code}>
              <span>{name}</span>
              {canEdit && (
                <Button
                  onClick={() => unlockReward(deck.id, code)}
                  size="sm"
                  variant="primary"
                >
                  {t("deck.rewards.unlock_from_campaign")}
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function isInDeck(deck: ResolvedDeck, code: string): boolean {
  return (
    (deck.rewards?.[code] ?? 0) > 0 ||
    (deck.slots?.[code] ?? 0) > 0 ||
    (deck.displaced?.[code] ?? 0) > 0
  );
}
