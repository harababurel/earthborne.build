import {
  BookOpenTextIcon,
  ChartAreaIcon,
  CheckIcon,
  FileClockIcon,
  PencilIcon,
  SquarePenIcon,
  Undo2Icon,
  XIcon,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDialogContextChecked } from "@/components/ui/dialog.hooks";
import { Field, FieldLabel } from "@/components/ui/field";
import { AppLayout } from "@/layouts/app-layout";
import { useStore } from "@/store";
import type { DeckValidationResult } from "@/store/lib/deck-validation";
import { resolveCardWithRelations } from "@/store/lib/resolve-card";
import { deckTags } from "@/store/lib/resolve-deck";
import type { ResolvedCard, ResolvedDeck } from "@/store/lib/types";
import type { History } from "@/store/selectors/decks";
import {
  selectLocaleSortingCollator,
  selectLookupTables,
  selectMetadata,
} from "@/store/selectors/shared";
import { cx } from "@/utils/cx";
import { useAccentColor } from "@/utils/use-accent-color";
import DeckDescription from "../deck-description";
import {
  DeckTags,
  DeckTagsContainer,
  LimitedCardPoolTag,
  ProviderTag,
  SealedDeckTag,
} from "../deck-tags/deck-tags";
import { DeckTools } from "../deck-tools/deck-tools";
import { Decklist } from "../decklist/decklist";
import { DecklistValidation } from "../decklist/decklist-validation";
import { FolderTag } from "../folders/folder-tag";
import { ListCard } from "../list-card/list-card";
import { Button } from "../ui/button";
import { Collapsible, CollapsibleContent } from "../ui/collapsible";
import { Dialog, DialogContent, DialogTrigger } from "../ui/dialog";
import {
  DefaultModalContent,
  Modal,
  ModalActions,
  ModalBackdrop,
  ModalInner,
} from "../ui/modal";
import { Plane } from "../ui/plane";
import { QuantityOutput } from "../ui/quantity-output";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { useTabUrlState } from "../ui/tabs.hooks";
import { useToast } from "../ui/toast.hooks";
import { DefaultTooltip } from "../ui/tooltip";
import css from "./deck-display.module.css";
import { DeckHistory } from "./deck-history/deck-history";
import { DecklistPopover } from "./decklist-popover";
import Sidebar from "./sidebar";
import type { DeckOrigin } from "./types";

export type DeckDisplayType = "deck" | "decklist";

export type DeckDisplayProps = {
  canEdit?: boolean;
  deck: ResolvedDeck;
  origin: DeckOrigin;
  headerSlot?: React.ReactNode;
  history?: History;
  onDiscardEdit?: () => void;
  onSaveEdit?: () => Promise<void>;
  onStartEdit?: () => void;
  type?: DeckDisplayType;
  validation: DeckValidationResult;
};

export function DeckDisplay(props: DeckDisplayProps) {
  const {
    canEdit = false,
    deck,
    headerSlot,
    history,
    onDiscardEdit,
    onSaveEdit,
    onStartEdit,
    origin,
    type = "deck",
    validation,
  } = props;

  const [currentTab, setCurrentTab] = useTabUrlState("deck");
  const [saving, setSaving] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollState = useRef<Record<string, number>>({});

  const { t } = useTranslation();
  const toast = useToast();
  const metadata = useStore(selectMetadata);
  const roleCard = metadata.cards[deck.role_code];
  const cssVariables = useAccentColor(roleCard);
  const hasHistory = history && history?.length > 1;

  const onTabChange = useCallback(
    (val: string) => {
      if (contentRef.current) {
        scrollState.current[currentTab] = window.scrollY;
      }

      setCurrentTab(val);
    },
    [setCurrentTab, currentTab],
  );

  useEffect(() => {
    requestAnimationFrame(() => {
      if (contentRef.current && scrollState.current[currentTab]) {
        window.scrollTo(0, scrollState.current[currentTab]);
      } else {
        window.scrollTo(0, 0);
      }
    });
  }, [currentTab]);

  const saveInlineEdits = useCallback(async () => {
    if (!onSaveEdit) return;

    setSaving(true);
    const toastId = toast.show({
      children: t("deck_edit.save_loading"),
      variant: "loading",
    });

    try {
      await onSaveEdit();
    } catch (err) {
      toast.show({
        children: t("deck_edit.save_error", {
          error: (err as Error).message,
        }),
        variant: "error",
      });
    } finally {
      toast.dismiss(toastId);
      setSaving(false);
    }
  }, [onSaveEdit, t, toast]);

  const titleNode = (
    <h1 className={css["title"]} data-testid="view-title">
      {deck.name}
    </h1>
  );

  return (
    <AppLayout title={deck ? deck.name : ""}>
      <main
        className={cx(css["main"], css[origin])}
        style={cssVariables}
        data-testid="deck-display"
      >
        <header className={css["header"]}>
          {origin === "local" ? (
            <Dialog>
              <DefaultTooltip tooltip={t("deck_edit.config.title_and_tags")}>
                <DialogTrigger asChild>
                  <button
                    className={css["name-modal-trigger"]}
                    type="button"
                    data-testid="name-edit-trigger"
                  >
                    <SquarePenIcon className={css["name-modal-icon"]} />
                    {titleNode}
                  </button>
                </DialogTrigger>
              </DefaultTooltip>
              <DialogContent>
                <TitleEditModal deck={deck} />
              </DialogContent>
            </Dialog>
          ) : (
            titleNode
          )}
          <div className={css["tags"]} data-testid="view-tags">
            <DeckTagsContainer>
              {origin === "local" && (
                <>
                  <ProviderTag deck={deck} />
                  <FolderTag deckId={deck.id} />
                </>
              )}
              <LimitedCardPoolTag deck={deck} />
              <SealedDeckTag deck={deck} />
              <DeckTags tags={deckTags(deck, type === "deck" ? " " : ", ")} />
            </DeckTagsContainer>
          </div>
          {headerSlot && <div>{headerSlot}</div>}
          {origin === "local" && (
            <DeckEditActions
              canEdit={canEdit}
              disabled={saving}
              onDiscardEdit={onDiscardEdit}
              onSaveEdit={saveInlineEdits}
              onStartEdit={onStartEdit}
            />
          )}
        </header>

        <Dialog>
          <Sidebar
            className={css["sidebar"]}
            deck={deck}
            history={history}
            innerClassName={css["sidebar-inner"]}
            origin={origin}
            type={type}
          />
        </Dialog>

        <div className={css["content"]}>
          <Tabs
            className={css["tabs"]}
            value={currentTab}
            onValueChange={onTabChange}
            ref={contentRef}
          >
            <TabsList className={css["list"]}>
              <TabsTrigger
                data-testid="tab-deck"
                hotkey="d"
                onTabChange={onTabChange}
                tooltip={t("deck_view.tab_deck_list")}
                value="deck"
              >
                <i className="icon-deck" />
                <span>{t("deck_view.tab_deck_list")}</span>
              </TabsTrigger>
              {deck.description_md && (
                <TabsTrigger
                  data-testid="tab-notes"
                  hotkey="n"
                  onTabChange={onTabChange}
                  tooltip={t("deck_view.tab_notes")}
                  value="notes"
                >
                  <BookOpenTextIcon />
                  <span>{t("deck_view.tab_notes")}</span>
                </TabsTrigger>
              )}
              <TabsTrigger
                hotkey="t"
                onTabChange={onTabChange}
                tooltip={t("deck_view.tab_tools")}
                value="tools"
              >
                <ChartAreaIcon />
                <span>{t("deck_view.tab_tools")}</span>
              </TabsTrigger>
              {hasHistory && (
                <TabsTrigger
                  data-testid="tab-history"
                  hotkey="h"
                  onTabChange={onTabChange}
                  tooltip={t("deck_view.tab_history")}
                  value="history"
                >
                  <FileClockIcon />
                  <span>
                    {t("deck_view.tab_history")} ({history.length - 1})
                  </span>
                </TabsTrigger>
              )}
            </TabsList>
            <TabsContent className={css["tab"]} value="deck">
              <div className={css["tab-content"]}>
                <DecklistValidation
                  defaultOpen={validation.errors.length < 3}
                  validation={validation}
                />
                <Decklist canEdit={canEdit} deck={deck} />
                <DeckCampaignSections canEdit={canEdit} deck={deck} />
              </div>
            </TabsContent>
            <TabsContent className={css["tab"]} value="tools">
              <DeckTools deck={deck} readonly />
            </TabsContent>
            {deck.description_md && (
              <TabsContent className={css["tab"]} value="notes">
                <Plane>
                  <DeckDescription content={deck.description_md} centered />
                </Plane>
                <DecklistPopover deck={deck} />
              </TabsContent>
            )}
            {hasHistory && (
              <TabsContent className={css["tab"]} value="history">
                <DeckHistory deck={deck} history={history} origin={origin} />
              </TabsContent>
            )}
          </Tabs>
        </div>
      </main>
    </AppLayout>
  );
}

function DeckCampaignSections({
  canEdit,
  deck,
}: {
  canEdit: boolean;
  deck: ResolvedDeck;
}) {
  const { t } = useTranslation();
  const displaced = useResolvedSlotCards(deck.displaced);
  const maladies = useResolvedSlotCards(deck.maladies);
  const rewards = useRewardCards(deck);

  if (!rewards.total && !displaced.length && !maladies.length) return null;

  return (
    <div className={css["campaign-sections"]}>
      <div className={css["campaign-columns"]}>
        <Plane className={css["campaign-panel"]}>
          <RewardsSection
            canEdit={canEdit}
            deck={deck}
            locked={rewards.locked}
            lockedTitle={t("deck.rewards.locked")}
            title={t("deck.rewards.title")}
            unlockedTitle={t("deck.rewards.unlocked")}
            unlocked={rewards.unlocked}
          />
        </Plane>
        <Plane className={css["campaign-panel"]}>
          <CampaignSection
            canEdit={canEdit}
            deck={deck}
            title={t("deck_edit.sections.displaced")}
            cards={displaced}
            emptyText={t("deck_edit.displaced.empty")}
            quantities={deck.displaced}
            showEmpty
          />
        </Plane>
      </div>
      {maladies.length > 0 && (
        <Plane className={css["campaign-panel"]}>
          <CampaignSection
            title={t("deck.evolution.maladies")}
            cards={maladies}
            quantities={deck.maladies}
          />
        </Plane>
      )}
    </div>
  );
}

function RewardsSection({
  canEdit,
  deck,
  locked,
  lockedTitle,
  title,
  unlocked,
  unlockedTitle,
}: {
  canEdit: boolean;
  deck: ResolvedDeck;
  locked: ResolvedCard[];
  lockedTitle: string;
  title: string;
  unlocked: ResolvedCard[];
  unlockedTitle: string;
}) {
  const { t } = useTranslation();
  const unlockReward = useStore((state) => state.unlockReward);
  const removeReward = useStore((state) => state.removeUnlockedReward);

  if (!locked.length && !unlocked.length) return null;

  const renderRewardAction = (card: ResolvedCard) => {
    if (!canEdit) return undefined;

    const rewardQty = deck.rewards?.[card.card.code] ?? 0;
    const slotsQty = deck.slots[card.card.code] ?? 0;
    const displacedQty = deck.displaced?.[card.card.code] ?? 0;

    return () => {
      if (slotsQty > 0 || displacedQty > 0) {
        return (
          <span className={css["muted"]}>{t("deck_edit.rewards.in_deck")}</span>
        );
      }
      if (rewardQty > 0) {
        return (
          <div className={css["reward-actions"]}>
            <Button onClick={() => removeReward(deck.id, card.card.code)}>
              {t("deck_edit.actions.remove")}
            </Button>
          </div>
        );
      }
      return (
        <Button
          onClick={() => unlockReward(deck.id, card.card.code)}
          variant="primary"
        >
          {t("deck_edit.actions.unlock")}
        </Button>
      );
    };
  };

  return (
    <section className={css["campaign-section"]}>
      <h2>{title}</h2>
      <div className={css["reward-list"]}>
        <Collapsible
          className={css["unlocked-rewards"]}
          defaultOpen
          omitBorder
          omitPadding
          title={`${unlockedTitle} (${unlocked.length})`}
          triggerClassName={css["reward-subtitle"]}
        >
          <CollapsibleContent className={css["reward-section-content"]}>
            {unlocked.length ? (
              unlocked.map((card) => (
                <ListCard
                  card={card.card}
                  key={card.card.code}
                  omitBorders
                  renderCardAction={renderRewardAction(card)}
                  size="sm"
                />
              ))
            ) : (
              <p className={css["empty-rewards"]}>{t("common.none")}</p>
            )}
          </CollapsibleContent>
        </Collapsible>
        <hr className={css["reward-separator"]} />
        <Collapsible
          className={css["locked-rewards"]}
          omitBorder
          omitPadding
          title={`${lockedTitle} (${locked.length})`}
          triggerClassName={css["reward-subtitle"]}
        >
          <CollapsibleContent className={css["reward-section-content"]}>
            {locked.map((card) => (
              <ListCard
                card={card.card}
                className={!canEdit ? css["locked-reward"] : undefined}
                key={card.card.code}
                omitBorders
                renderCardAction={renderRewardAction(card)}
                size="sm"
              />
            ))}
          </CollapsibleContent>
        </Collapsible>
      </div>
    </section>
  );
}

function CampaignSection({
  canEdit,
  cards,
  deck,
  emptyText,
  quantities,
  showEmpty,
  title,
}: {
  canEdit?: boolean;
  cards: ResolvedCard[];
  deck?: ResolvedDeck;
  emptyText?: string;
  quantities?: ResolvedDeck["displaced"];
  showEmpty?: boolean;
  title: string;
}) {
  const { t } = useTranslation();
  const restoreDisplaced = useStore((state) => state.restoreDisplaced);

  if (!cards.length && !showEmpty) return null;

  return (
    <section className={css["campaign-section"]}>
      <h2>{title}</h2>
      <div className={css["campaign-card-list"]}>
        {cards.length ? (
          cards.map((card) => (
            <ListCard
              card={card.card}
              key={card.card.code}
              omitBorders
              quantity={
                canEdit && deck ? undefined : quantities?.[card.card.code]
              }
              renderCardAction={
                canEdit && deck
                  ? () => (
                      <div className={css["displaced-card-actions"]}>
                        <Button
                          aria-label={t("deck_edit.actions.move_to_main_deck")}
                          data-testid="restore-displaced-card"
                          disabled={(quantities?.[card.card.code] ?? 0) <= 0}
                          iconOnly
                          onClick={() =>
                            restoreDisplaced(
                              deck.id,
                              card.card.code,
                              undefined,
                              1,
                            )
                          }
                          size="sm"
                          tooltip={t("deck_edit.actions.move_to_main_deck")}
                        >
                          <Undo2Icon />
                        </Button>
                        <QuantityOutput
                          value={quantities?.[card.card.code] ?? 0}
                        />
                      </div>
                    )
                  : undefined
              }
              size="sm"
            />
          ))
        ) : (
          <p className={css["empty-campaign-section"]}>{emptyText}</p>
        )}
      </div>
    </section>
  );
}

function DeckEditActions({
  canEdit,
  disabled,
  onDiscardEdit,
  onSaveEdit,
  onStartEdit,
}: {
  canEdit: boolean;
  disabled: boolean;
  onDiscardEdit?: () => void;
  onSaveEdit: () => void;
  onStartEdit?: () => void;
}) {
  const { t } = useTranslation();

  if (canEdit) {
    return (
      <div className={css["edit-actions"]}>
        <Button
          data-testid="save-deck"
          disabled={disabled}
          onClick={onSaveEdit}
          size="sm"
          variant="primary"
        >
          <CheckIcon />
          {t("deck_edit.save_short")}
        </Button>
        <Button
          data-testid="discard-edits"
          disabled={disabled}
          onClick={onDiscardEdit}
          size="sm"
          variant="bare"
        >
          <XIcon />
          {t("deck_edit.discard")}
        </Button>
      </div>
    );
  }

  return (
    <div className={css["edit-actions"]}>
      <Button data-testid="edit-deck" onClick={onStartEdit} size="sm">
        <PencilIcon />
        {t("deck.actions.edit")}
      </Button>
    </div>
  );
}

function useResolvedSlotCards(slots: ResolvedDeck["rewards"]) {
  const metadata = useStore(selectMetadata);
  const lookupTables = useStore(selectLookupTables);
  const collator = useStore(selectLocaleSortingCollator);

  return Object.entries(slots ?? {})
    .filter(([, quantity]) => quantity > 0)
    .map(([code]) =>
      resolveCardWithRelations(
        { metadata, lookupTables },
        collator,
        code,
        true,
      ),
    )
    .filter((card): card is ResolvedCard => !!card)
    .sort((a, b) => collator.compare(a.card.name, b.card.name));
}

function useRewardCards(deck: ResolvedDeck) {
  const metadata = useStore(selectMetadata);
  const lookupTables = useStore(selectLookupTables);
  const collator = useStore(selectLocaleSortingCollator);

  const cards = Object.values(metadata.cards)
    .filter((card) => card.category === "reward")
    .sort((a, b) => collator.compare(a.name, b.name))
    .map((card) =>
      resolveCardWithRelations(
        { metadata, lookupTables },
        collator,
        card.code,
        true,
      ),
    )
    .filter((card): card is ResolvedCard => !!card);

  const unlocked = [];
  const locked = [];

  for (const card of cards) {
    if (isRewardUnlocked(deck, card.card.code)) {
      unlocked.push(card);
    } else {
      locked.push(card);
    }
  }

  return {
    locked,
    total: cards.length,
    unlocked,
  };
}

function isRewardUnlocked(deck: ResolvedDeck, code: string) {
  return (
    (deck.rewards?.[code] ?? 0) > 0 ||
    (deck.slots?.[code] ?? 0) > 0 ||
    (deck.displaced?.[code] ?? 0) > 0
  );
}

type TitleEditModalProps = {
  deck: ResolvedDeck;
};

function TitleEditModal(props: TitleEditModalProps) {
  const { deck } = props;

  const [loading, setLoading] = useState(false);

  const { t } = useTranslation();
  const toast = useToast();
  const modalContext = useDialogContextChecked();
  const metadata = useStore(selectMetadata);
  const roleCard = metadata.cards[deck.role_code];
  const cssVariables = useAccentColor(roleCard);

  const updateDeckProperties = useStore((state) => state.updateDeckProperties);

  const onCloseModal = useCallback(() => {
    modalContext?.setOpen(false);
  }, [modalContext]);

  const handleSubmit = useCallback(
    async (evt: React.FormEvent) => {
      evt.preventDefault();

      setLoading(true);

      const toastId = toast.show({
        children: t("deck_edit.save_loading"),
        variant: "loading",
      });

      try {
        const values = new FormData(evt.target as HTMLFormElement);

        await updateDeckProperties(deck.id, {
          name: values.get("name")?.toString() || "",
          tags: values.get("tags")?.toString() || "",
        });

        onCloseModal();
      } catch (err) {
        toast.show({
          children: t("deck_edit.save_error", {
            error: (err as Error).message,
          }),
          variant: "error",
        });
      } finally {
        toast.dismiss(toastId);
        setLoading(false);
      }
    },
    [deck.id, updateDeckProperties, onCloseModal, toast, t],
  );

  return (
    <DialogContent>
      <Modal>
        <ModalBackdrop />
        <ModalInner size="45rem">
          <ModalActions />
          <DefaultModalContent
            title={t("deck_edit.config.title_and_tags")}
            style={cssVariables}
          >
            <form onSubmit={handleSubmit}>
              <Field full padded>
                <FieldLabel>{t("deck_edit.config.name")}</FieldLabel>
                <input
                  data-testid="name-edit-name"
                  autoComplete="off"
                  type="text"
                  name="name"
                  required
                  defaultValue={deck.name}
                />
              </Field>
              <Field full padded helpText={t("deck_edit.config.tags_help")}>
                <FieldLabel>{t("deck_edit.config.tags")}</FieldLabel>
                <input
                  autoComplete="off"
                  data-testid="name-edit-tags"
                  type="text"
                  name="tags"
                  defaultValue={deck.tags}
                />
              </Field>
              <div className={css["name-modal-footer"]}>
                <Button
                  disabled={loading}
                  variant="primary"
                  type="submit"
                  data-testid="name-edit-submit"
                >
                  {t("deck_edit.save_short")}
                </Button>
                <Button onClick={onCloseModal} variant="bare">
                  {t("common.cancel")}
                </Button>
              </div>
            </form>
          </DefaultModalContent>
        </ModalInner>
      </Modal>
    </DialogContent>
  );
}
