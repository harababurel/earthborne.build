import type { Card as CardT, Slots } from "@earthborne-build/shared";
import {
  BACKGROUND_PICKS,
  OUTSIDE_INTEREST_PICKS,
  PERSONALITY_PICKS,
  SPECIALTY_PICKS,
} from "@earthborne-build/shared";
import { CheckIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useParams } from "wouter";
import { Card } from "@/components/card/card";
import { CardText } from "@/components/card/card-text";
import { DeckEvolutionBadge } from "@/components/deck-evolution-badge";
import { AspectIcon } from "@/components/icons/aspect-icon";
import { ListCard } from "@/components/list-card/list-card";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast.hooks";
import { AppLayout } from "@/layouts/app-layout";
import { useStore } from "@/store";
import type { DeckValidationError } from "@/store/lib/deck-validation";
import { resolveCardWithRelations } from "@/store/lib/resolve-card";
import type { ResolvedCard, ResolvedDeck } from "@/store/lib/types";
import {
  selectDeckValid,
  selectResolvedDeckById,
} from "@/store/selectors/decks";
import {
  selectLocaleSortingCollator,
  selectLookupTables,
  selectMetadata,
} from "@/store/selectors/shared";
import { cx } from "@/utils/cx";
import { useAccentColor } from "@/utils/use-accent-color";
import css from "./deck-edit.module.css";

type Category = "personality" | "background" | "specialty" | "outside";

function DeckEdit() {
  const { id } = useParams<{ id: string }>();
  const deck = useStore((state) => selectResolvedDeckById(state, id, true));
  const createEdit = useStore((state) => state.createEdit);
  const hasEdit = useStore((state) => !!state.deckEdits[id]);

  useEffect(() => {
    if (deck && !hasEdit) createEdit(deck.id, {});
  }, [createEdit, deck, hasEdit]);

  if (!deck) return null;

  return <DeckEditInner deck={deck} />;
}

function DeckEditInner({ deck }: { deck: ResolvedDeck }) {
  const metadata = useStore(selectMetadata);
  const roleCard = metadata.cards[deck.role_code];
  const cssVariables = useAccentColor(roleCard);

  return (
    <AppLayout title={deck.name}>
      <main className={css["main"]} style={cssVariables}>
        <DeckEditSidebar deck={deck} />
        <DeckEditMain deck={deck} />
      </main>
    </AppLayout>
  );
}

function DeckEditSidebar({ deck }: { deck: ResolvedDeck }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [, navigate] = useLocation();
  const validation = useStore((state) => selectDeckValid(state, deck));
  const updateName = useStore((state) => state.updateName);
  const saveDeck = useStore((state) => state.saveDeck);
  const discardEdits = useStore((state) => state.discardEdits);
  const metadata = useStore(selectMetadata);
  const role = useResolvedCard(deck.role_code);
  const aspectCard = metadata.cards[deck.aspect_code];

  const onSave = useCallback(async () => {
    const toastId = toast.show({
      children: t("deck_edit.save_loading"),
      variant: "loading",
    });
    try {
      await saveDeck(deck.id);
      toast.dismiss(toastId);
      navigate(`/deck/view/${deck.id}`);
    } catch (err) {
      toast.dismiss(toastId);
      toast.show({
        children: t("deck_edit.save_error", { error: (err as Error).message }),
        variant: "error",
      });
    }
  }, [deck.id, navigate, saveDeck, t, toast]);

  return (
    <aside className={css["sidebar"]}>
      <div className={css["identity"]}>
        {role && <Card resolvedCard={role} size="compact" />}
        <div className={css["aspect-stats"]}>
          <div className={css["stat-item"]}>
            <div className={cx(css["aspect-square"], css["awa"])}>
              <AspectIcon
                aspect="AWA"
                className={css["white-icon"]}
                size="3.75rem"
              />
              <div className={css["stat-overlay"]}>
                <span className={css["stat-value"]}>
                  {aspectCard?.aspect_awareness}
                </span>
                <span className={css["stat-label"]}>AWA</span>
              </div>
            </div>
          </div>
          <div className={css["stat-item"]}>
            <div className={cx(css["aspect-square"], css["spi"])}>
              <AspectIcon
                aspect="SPI"
                className={css["white-icon"]}
                size="3.75rem"
              />
              <div className={css["stat-overlay"]}>
                <span className={css["stat-value"]}>
                  {aspectCard?.aspect_spirit}
                </span>
                <span className={css["stat-label"]}>SPI</span>
              </div>
            </div>
          </div>
          <div className={css["stat-item"]}>
            <div className={cx(css["aspect-square"], css["fit"])}>
              <AspectIcon
                aspect="FIT"
                className={css["white-icon"]}
                size="3.75rem"
              />
              <div className={css["stat-overlay"]}>
                <span className={css["stat-value"]}>
                  {aspectCard?.aspect_fitness}
                </span>
                <span className={css["stat-label"]}>FIT</span>
              </div>
            </div>
          </div>
          <div className={css["stat-item"]}>
            <div className={cx(css["aspect-square"], css["foc"])}>
              <AspectIcon
                aspect="FOC"
                className={css["white-icon"]}
                size="3.75rem"
              />
              <div className={css["stat-overlay"]}>
                <span className={css["stat-value"]}>
                  {aspectCard?.aspect_focus}
                </span>
                <span className={css["stat-label"]}>FOC</span>
              </div>
            </div>
          </div>
        </div>
        <CardText
          size="full"
          text={aspectCard?.text ?? undefined}
          typeCode={aspectCard?.type_code ?? ""}
        />
      </div>
      <Field full>
        <FieldLabel htmlFor="deck-name">
          {t("deck_edit.config.name")}
        </FieldLabel>
        <input
          id="deck-name"
          onChange={(evt) => updateName(deck.id, evt.target.value)}
          type="text"
          value={deck.name}
        />
      </Field>
      <DeckEvolutionBadge deck={deck} />
      {validation.valid ? (
        <p>
          <CheckIcon /> {t("deck_edit.validation.valid")}
        </p>
      ) : (
        <ul className={css["validation"]}>
          {validation.errors.map((error, index) => (
            <li key={`${error.type}-${index}`}>{formatValidation(error)}</li>
          ))}
        </ul>
      )}
      <div className={css["actions"]}>
        <Button onClick={onSave} variant="primary">
          {t("deck_edit.save_short")}
        </Button>
        <Button onClick={() => discardEdits(deck.id)} variant="bare">
          {t("deck_edit.discard")}
        </Button>
      </div>
    </aside>
  );
}

function DeckEditMain({ deck }: { deck: ResolvedDeck }) {
  const { t } = useTranslation();

  return (
    <section className={css["panel"]}>
      <Tabs className={css["tabs"]} defaultValue="deck">
        <TabsList>
          <TabsTrigger value="deck">{t("deck_edit.tabs.deck")}</TabsTrigger>
          <TabsTrigger value="unlock_rewards">
            {t("deck_edit.tabs.unlock_rewards")}
          </TabsTrigger>
          <TabsTrigger value="notes">{t("deck_edit.tabs.notes")}</TabsTrigger>
        </TabsList>
        <TabsContent className={css["tab"]} value="deck">
          <DeckEditDeckTab deck={deck} />
        </TabsContent>
        <TabsContent className={css["tab"]} value="unlock_rewards">
          <DeckEditUnlockRewardsTab deck={deck} />
        </TabsContent>
        <TabsContent className={css["tab"]} value="notes">
          <DeckEditNotesTab deck={deck} />
        </TabsContent>
      </Tabs>
    </section>
  );
}

function DeckEditDeckTab({ deck }: { deck: ResolvedDeck }) {
  const { t } = useTranslation();
  const groups = useMemo(() => groupDeckCardsForEdit(deck), [deck]);

  return (
    <>
      <DeckSection
        cards={groups.personality}
        category="personality"
        deck={deck}
        required={PERSONALITY_PICKS}
        title={t("deck_edit.sections.personality")}
      />
      <DeckSection
        cards={groups.background}
        category="background"
        deck={deck}
        required={BACKGROUND_PICKS}
        title={t("deck_edit.sections.background")}
      />
      <DeckSection
        cards={groups.specialty}
        category="specialty"
        deck={deck}
        required={SPECIALTY_PICKS}
        title={t("deck_edit.sections.specialty")}
      />
      <DeckSection
        cards={groups.outside}
        category="outside"
        deck={deck}
        required={OUTSIDE_INTEREST_PICKS}
        title={t("deck_edit.sections.outside_interest")}
      />
      <PlayerCardSwapSection deck={deck} />
      <CampaignPanels deck={deck} />
    </>
  );
}

function DeckSection({
  cards,
  category,
  deck,
  required,
  title,
}: {
  cards: ResolvedCard[];
  category: Category;
  deck: ResolvedDeck;
  required: number;
  title: string;
}) {
  const updateCardQuantity = useStore((state) => state.updateCardQuantity);
  const pool = useCardPoolForCategory(deck, category);

  return (
    <section className={css["section"]}>
      <h2 className={css["section-heading"]}>
        {title}
        <span className={css["section-count"]}>
          {cards.length}/{required}
        </span>
      </h2>
      {cards.map((card) => (
        <ListCard
          key={card.card.code}
          card={card.card}
          highlightQuantity
          onChangeCardQuantity={(c, qty, limit) =>
            updateCardQuantity(deck.id, c.code, qty, limit, "slots", "set")
          }
          quantity={deck.slots[card.card.code] ?? 0}
          renderCardAfter={() => (
            <ReplacementPicker
              currentCode={card.card.code}
              deck={deck}
              pool={pool}
            />
          )}
        />
      ))}
    </section>
  );
}

function CampaignPanels({ deck }: { deck: ResolvedDeck }) {
  const { t } = useTranslation();
  const rewards = useCardsForSlots(deck.rewards);
  const displaced = useCardsForSlots(deck.displaced);
  const maladies = useCardsForSlots(deck.maladies);
  const deckCards = useCardsForSlots(deck.slots);
  const maladyPool = useCampaignPool("malady");
  const addMalady = useStore((state) => state.addMalady);
  const removeMalady = useStore((state) => state.removeMalady);

  if (!rewards.length && !displaced.length && !maladies.length) return null;

  return (
    <div className={css["campaign-panels"]}>
      <section className={css["campaign-panel"]}>
        <h2>{t("deck_edit.sections.rewards")}</h2>
        {rewards.length === 0 ? (
          <p className={css["empty"]}>{t("deck_edit.rewards.empty")}</p>
        ) : (
          rewards.map((card) => (
            <RewardCardRow
              key={card.card.code}
              card={card}
              deck={deck}
              deckCards={deckCards}
            />
          ))
        )}
      </section>

      <section className={css["campaign-panel"]}>
        <h2>{t("deck_edit.sections.displaced")}</h2>
        {displaced.length === 0 ? (
          <p className={css["empty"]}>{t("deck_edit.displaced.empty")}</p>
        ) : (
          displaced.map((card) => (
            <DisplacedCardRow
              key={card.card.code}
              card={card}
              deck={deck}
              deckCards={deckCards}
            />
          ))
        )}
      </section>

      <section className={css["campaign-panel"]}>
        <h2>{t("deck_edit.sections.maladies")}</h2>
        <select
          aria-label={t("deck_edit.actions.add_malady")}
          onChange={(evt) => {
            if (evt.target.value) addMalady(deck.id, evt.target.value);
            evt.target.value = "";
          }}
        >
          <option value="">{t("deck_edit.actions.add_malady")}</option>
          {maladyPool
            .filter(
              (card) => !maladies.some((m) => m.card.code === card.card.code),
            )
            .map((card) => (
              <option key={card.card.code} value={card.card.code}>
                {card.card.name}
              </option>
            ))}
        </select>
        {maladies.map((card) => (
          <ListCard
            key={card.card.code}
            card={card.card}
            renderCardAfter={() => (
              <div className={css["row-actions"]}>
                <Button onClick={() => removeMalady(deck.id, card.card.code)}>
                  {t("deck_edit.actions.remove")}
                </Button>
              </div>
            )}
          />
        ))}
      </section>
    </div>
  );
}

function RewardCardRow({
  card,
  deck,
  deckCards,
}: {
  card: ResolvedCard;
  deck: ResolvedDeck;
  deckCards: ResolvedCard[];
}) {
  const { t } = useTranslation();
  const [qty, setQty] = useState<1 | 2>(2);
  const swapRewardIntoSlots = useStore((state) => state.swapRewardIntoSlots);
  const removeReward = useStore((state) => state.removeUnlockedReward);

  return (
    <ListCard
      card={card.card}
      renderCardAfter={() => (
        <div className={css["row-actions"]}>
          <QuantitySelect value={qty} onChange={setQty} />
          <DisplacementPicker
            cards={deckCards}
            label={t("deck_edit.actions.swap_into_deck")}
            onSelect={(code) =>
              swapRewardIntoSlots(deck.id, card.card.code, code, qty)
            }
          />
          <Button onClick={() => removeReward(deck.id, card.card.code)}>
            {t("deck_edit.actions.remove")}
          </Button>
        </div>
      )}
    />
  );
}

function DisplacedCardRow({
  card,
  deck,
  deckCards,
}: {
  card: ResolvedCard;
  deck: ResolvedDeck;
  deckCards: ResolvedCard[];
}) {
  const { t } = useTranslation();
  const [qty, setQty] = useState<1 | 2>(2);
  const restoreDisplaced = useStore((state) => state.restoreDisplaced);

  return (
    <ListCard
      card={card.card}
      renderCardAfter={() => (
        <div className={css["row-actions"]}>
          <QuantitySelect value={qty} onChange={setQty} />
          <DisplacementPicker
            cards={deckCards}
            includeNone
            label={t("deck_edit.actions.restore")}
            onSelect={(code) =>
              restoreDisplaced(
                deck.id,
                card.card.code,
                code === "__none" ? undefined : code,
                qty,
              )
            }
          />
        </div>
      )}
    />
  );
}

function PlayerCardSwapSection({ deck }: { deck: ResolvedDeck }) {
  const { t } = useTranslation();
  const [incomingCode, setIncomingCode] = useState("");
  const [outgoingCode, setOutgoingCode] = useState("");
  const [qty, setQty] = useState<1 | 2>(2);
  const pool = usePlayerCardPool(deck);
  const deckCards = useCardsForSlots(deck.slots);
  const swapPlayerCardIntoSlots = useStore(
    (state) => state.swapPlayerCardIntoSlots,
  );

  const canSwap = !!incomingCode && !!outgoingCode;

  function handleSwap() {
    if (!canSwap) return;
    swapPlayerCardIntoSlots(deck.id, incomingCode, outgoingCode, qty);
    setIncomingCode("");
    setOutgoingCode("");
    setQty(2);
  }

  return (
    <section className={css["section"]}>
      <h2>{t("deck_edit.sections.player_cards")}</h2>
      <div className={css["swap-form"]}>
        <select
          aria-label={t("deck_edit.player_cards.incoming")}
          onChange={(evt) => setIncomingCode(evt.target.value)}
          value={incomingCode}
        >
          <option value="">{t("deck_edit.player_cards.incoming")}</option>
          {pool.map((card) => (
            <option key={card.card.code} value={card.card.code}>
              {card.card.name}
            </option>
          ))}
        </select>
        <DisplacementPicker
          cards={deckCards}
          controlled
          label={t("deck_edit.player_cards.outgoing")}
          onSelect={setOutgoingCode}
          value={outgoingCode}
        />
        <QuantitySelect value={qty} onChange={setQty} />
        <Button disabled={!canSwap} onClick={handleSwap} variant="primary">
          {t("deck_edit.actions.swap")}
        </Button>
      </div>
    </section>
  );
}

function DeckEditUnlockRewardsTab({ deck }: { deck: ResolvedDeck }) {
  const { t } = useTranslation();
  const rewardPool = useCampaignPool("reward");
  const unlockReward = useStore((state) => state.unlockReward);
  const removeReward = useStore((state) => state.removeUnlockedReward);

  return (
    <section className={css["section"]}>
      {rewardPool.length === 0 ? (
        <p className={css["empty"]}>{t("deck_edit.rewards.empty")}</p>
      ) : (
        rewardPool.map((card) => {
          const rewardQty = deck.rewards?.[card.card.code] ?? 0;
          const slotsQty = deck.slots[card.card.code] ?? 0;

          return (
            <ListCard
              key={card.card.code}
              card={card.card}
              renderCardAction={() => {
                if (slotsQty > 0) {
                  return (
                    <span className={css["muted"]}>
                      {t("deck_edit.rewards.in_deck")}
                    </span>
                  );
                }
                if (rewardQty > 0) {
                  return (
                    <div className={css["unlock-actions"]}>
                      <span className={css["muted"]}>
                        {t("deck_edit.rewards.unlocked")}
                      </span>
                      <Button
                        onClick={() => removeReward(deck.id, card.card.code)}
                      >
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
              }}
            />
          );
        })
      )}
    </section>
  );
}

function DeckEditNotesTab({ deck }: { deck: ResolvedDeck }) {
  const { t } = useTranslation();
  const updateAnnotation = useStore((state) => state.updateAnnotation);
  const cards = useCardsForSlots(deck.slots);

  return (
    <div className={css["notes"]}>
      {cards.map((card) => (
        <div className={css["note"]} key={card.card.code}>
          <ListCard card={card.card} omitDetails />
          <textarea
            aria-label={t("deck_edit.notes.annotation")}
            onChange={(evt) =>
              updateAnnotation(deck.id, card.card.code, evt.target.value)
            }
            value={deck.annotations[card.card.code] ?? ""}
          />
        </div>
      ))}
    </div>
  );
}

function ReplacementPicker({
  currentCode,
  deck,
  pool,
}: {
  currentCode: string;
  deck: ResolvedDeck;
  pool: ResolvedCard[];
}) {
  const { t } = useTranslation();
  const updateCardQuantity = useStore((state) => state.updateCardQuantity);

  const available = pool.filter((card) => !deck.slots[card.card.code]);
  if (!available.length) return null;

  return (
    <div className={css["picker-row"]}>
      <select
        aria-label={t("deck_edit.actions.replace")}
        onChange={(evt) => {
          const nextCode = evt.target.value;
          if (!nextCode) return;
          updateCardQuantity(deck.id, currentCode, 0, 2, "slots", "set");
          updateCardQuantity(deck.id, nextCode, 2, 2, "slots", "set");
          evt.target.value = "";
        }}
      >
        <option value="">{t("deck_edit.actions.replace")}</option>
        {available.map((card) => (
          <option key={card.card.code} value={card.card.code}>
            {card.card.name}
          </option>
        ))}
      </select>
    </div>
  );
}

function DisplacementPicker({
  cards,
  controlled,
  includeNone,
  label,
  onSelect,
  value,
}: {
  cards: ResolvedCard[];
  controlled?: boolean;
  includeNone?: boolean;
  label: string;
  onSelect: (code: string) => void;
  value?: string;
}) {
  const { t } = useTranslation();

  return (
    <select
      aria-label={label}
      onChange={(evt) => {
        onSelect(evt.target.value);
        if (!controlled) evt.target.value = "";
      }}
      {...(controlled ? { value: value ?? "" } : {})}
    >
      <option value="">{label}</option>
      {includeNone && <option value="__none">{t("common.none")}</option>}
      {cards.map((card) => (
        <option key={card.card.code} value={card.card.code}>
          {card.card.name}
        </option>
      ))}
    </select>
  );
}

function QuantitySelect({
  value,
  onChange,
}: {
  value: 1 | 2;
  onChange: (qty: 1 | 2) => void;
}) {
  const { t } = useTranslation();
  return (
    <select
      aria-label={t("deck_edit.actions.quantity")}
      onChange={(evt) => onChange(Number(evt.target.value) as 1 | 2)}
      value={value}
    >
      <option value={1}>1×</option>
      <option value={2}>2×</option>
    </select>
  );
}

function useResolvedCard(code: string | undefined) {
  const metadata = useStore(selectMetadata);
  const lookupTables = useStore(selectLookupTables);
  const collator = useStore(selectLocaleSortingCollator);

  return useMemo(() => {
    if (!code) return undefined;
    return resolveCardWithRelations(
      { metadata, lookupTables },
      collator,
      code,
      true,
    );
  }, [code, collator, lookupTables, metadata]);
}

function useCardsForSlots(slots: Slots | null | undefined) {
  const metadata = useStore(selectMetadata);
  const lookupTables = useStore(selectLookupTables);
  const collator = useStore(selectLocaleSortingCollator);

  return useMemo(
    () =>
      Object.entries(slots ?? {})
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
        .sort((a, b) => collator.compare(a.card.name, b.card.name)),
    [collator, lookupTables, metadata, slots],
  );
}

function useCampaignPool(category: "reward" | "malady") {
  return useResolvedPool((card) => card.category === category);
}

function usePlayerCardPool(deck: ResolvedDeck) {
  const metadata = useStore(selectMetadata);
  const aspectCard = metadata.cards[deck.aspect_code];

  return useResolvedPool((card) => {
    if (
      card.category !== "personality" &&
      card.category !== "background" &&
      card.category !== "specialty"
    ) {
      return false;
    }
    if ((deck.slots[card.code] ?? 0) > 0) return false;
    if (
      !card.aspect_requirement_type ||
      card.aspect_requirement_value == null
    ) {
      return true;
    }
    if (!aspectCard) return false;
    const stat: Record<string, number> = {
      AWA: aspectCard.aspect_awareness ?? 0,
      SPI: aspectCard.aspect_spirit ?? 0,
      FIT: aspectCard.aspect_fitness ?? 0,
      FOC: aspectCard.aspect_focus ?? 0,
    };
    return (
      (stat[card.aspect_requirement_type] ?? 0) >= card.aspect_requirement_value
    );
  });
}

function useCardPoolForCategory(deck: ResolvedDeck, category: Category) {
  return useResolvedPool((card) => {
    if (category === "personality") return card.category === "personality";
    if (category === "background") {
      return card.background_type === deck.background;
    }
    if (category === "specialty") {
      return card.specialty_type === deck.specialty;
    }
    if (category === "outside") {
      return (
        (card.category === "background" &&
          card.background_type !== deck.background) ||
        (card.category === "specialty" &&
          card.specialty_type !== deck.specialty)
      );
    }
    return false;
  });
}

function useResolvedPool(predicate: (card: CardT) => boolean) {
  const metadata = useStore(selectMetadata);
  const lookupTables = useStore(selectLookupTables);
  const collator = useStore(selectLocaleSortingCollator);

  return useMemo(
    () =>
      Object.values(metadata.cards)
        .filter(predicate)
        .sort((a, b) => collator.compare(a.name, b.name))
        .map((card) =>
          resolveCardWithRelations(
            { metadata, lookupTables },
            collator,
            card.code,
            true,
          ),
        )
        .filter((card): card is ResolvedCard => !!card),
    [collator, lookupTables, metadata, predicate],
  );
}

function groupDeckCardsForEdit(
  deck: ResolvedDeck,
): Record<Category, ResolvedCard[]> {
  const groups: Record<Category, ResolvedCard[]> = {
    personality: [],
    background: [],
    specialty: [],
    outside: [],
  };

  for (const [code, quantity] of Object.entries(deck.slots)) {
    if (!quantity) continue;
    const card = deck.cards.slots[code];
    if (!card) continue;

    if (card.card.category === "personality") {
      groups.personality.push(card);
    } else if (card.card.background_type === deck.background) {
      groups.background.push(card);
    } else if (card.card.specialty_type === deck.specialty) {
      groups.specialty.push(card);
    } else {
      groups.outside.push(card);
    }
  }

  return groups;
}

function formatValidation(error: DeckValidationError) {
  if ("details" in error && typeof error.details === "object") {
    if ("error" in error.details) return error.details.error;
    if ("count" in error.details && "countRequired" in error.details) {
      return `${error.type}: ${error.details.count}/${error.details.countRequired}`;
    }
  }
  return error.type;
}

export default DeckEdit;
