import type { Campaign } from "@earthborne-build/shared";
import { UserPlusIcon } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import { selectLocalDeckSummaries } from "@/store/selectors/decks";
import { DeckSummary } from "../deck-summary/deck-summary";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogTrigger } from "../ui/dialog";
import { AddRangerModal } from "./modals/add-ranger-modal";
import css from "./rail.module.css";

export function RangersPanel({ campaign }: { campaign: Campaign }) {
  const { t } = useTranslation();
  const summaries = useStore(selectLocalDeckSummaries);
  const unlinkDeck = useStore((state) => state.unlinkDeckFromCampaign);

  const summariesById = useMemo(
    () => new Map(summaries.map((deck) => [String(deck.id), deck])),
    [summaries],
  );

  return (
    <section className={css["panel"]}>
      <h3 className={css["title"]}>{t("campaign.party.title")}</h3>

      {campaign.deck_ids.length > 0 ? (
        <ul className={css["party-list"]}>
          {campaign.deck_ids.map((deckId) => {
            const deck = summariesById.get(String(deckId));
            return (
              <li className={css["party-item"]} key={deckId}>
                {deck ? (
                  <DeckSummary
                    deck={deck}
                    showThumbnail
                    size="sm"
                    validation={deck.problem}
                  />
                ) : (
                  // Stale link (deck was deleted) — still offer the unlink.
                  <span className={css["party-missing"]}>
                    {t("campaign.party.missing_deck")}
                  </span>
                )}
                <Button
                  className={css["party-unlink"]}
                  onClick={() => unlinkDeck(campaign.id, deckId)}
                  size="sm"
                  variant="bare"
                >
                  {t("campaign.party.unlink")}
                </Button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className={css["empty"]}>{t("campaign.party.none")}</p>
      )}

      <Dialog>
        <DialogTrigger asChild>
          <Button size="sm" variant="bare">
            <UserPlusIcon /> {t("campaign.party.add")}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <AddRangerModal campaign={campaign} />
        </DialogContent>
      </Dialog>
    </section>
  );
}
