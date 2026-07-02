import type { Campaign } from "@earthborne-build/shared";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import { selectLocalDeckSummaries } from "@/store/selectors/decks";
import { DeckSummary } from "../../deck-summary/deck-summary";
import { Button } from "../../ui/button";
import { useDialogContextChecked } from "../../ui/dialog.hooks";
import {
  DefaultModalContent,
  Modal,
  ModalActions,
  ModalBackdrop,
  ModalInner,
} from "../../ui/modal";
import css from "./modals.module.css";

// Visual deck picker: lists unlinked decks as rich summary cards (portrait,
// role, aspects, stats) so a ranger is identifiable at a glance, not by name.
export function AddRangerModal({ campaign }: { campaign: Campaign }) {
  const { t } = useTranslation();
  const { setOpen } = useDialogContextChecked();
  const summaries = useStore(selectLocalDeckSummaries);
  const linkDeck = useStore((state) => state.linkDeckToCampaign);

  const [query, setQuery] = useState("");

  const available = useMemo(() => {
    const linked = new Set(campaign.deck_ids.map(String));
    return summaries.filter((deck) => !linked.has(String(deck.id)));
  }, [summaries, campaign.deck_ids]);

  const filtered = query
    ? available.filter((deck) =>
        deck.name.toLowerCase().includes(query.toLowerCase()),
      )
    : available;

  const onPick = (id: string | number) => {
    linkDeck(campaign.id, id);
    setOpen(false);
  };

  return (
    <Modal>
      <ModalBackdrop />
      <ModalInner size="32rem">
        <ModalActions />
        <DefaultModalContent title={t("campaign.party.picker_title")}>
          {available.length ? (
            <div className={css["picker"]}>
              <input
                className={css["input"]}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("campaign.party.picker_search")}
                value={query}
              />
              {filtered.length ? (
                <ul className={css["picker-list"]}>
                  {filtered.map((deck) => (
                    <li className={css["picker-item"]} key={deck.id}>
                      <DeckSummary
                        deck={deck}
                        showThumbnail
                        size="sm"
                        validation={deck.problem}
                      />
                      <Button
                        className={css["picker-add"]}
                        onClick={() => onPick(deck.id)}
                        size="sm"
                        variant="primary"
                      >
                        {t("campaign.party.add")}
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={css["picker-empty"]}>
                  {t("campaign.party.picker_empty")}
                </p>
              )}
            </div>
          ) : (
            <p className={css["picker-empty"]}>
              {t("campaign.party.picker_none")}
            </p>
          )}
        </DefaultModalContent>
      </ModalInner>
    </Modal>
  );
}
