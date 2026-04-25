import type { Card as CardT, Slots } from "@earthborne-build/shared";
import { CheckIcon, MinusIcon, PlusIcon } from "lucide-react";
import { useCallback, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useParams } from "wouter";
import { Card } from "@/components/card/card";
import { DeckEvolutionBadge } from "@/components/deck-evolution-badge";
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
  const role = useResolvedCard(deck.role_code);
  const aspect = useResolvedCard(deck.aspect_code);

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
        {aspect && <Card resolvedCard={aspect} size="compact" />}
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
          <TabsTrigger value="campaign">
            {t("deck_edit.tabs.campaign")}
          </TabsTrigger>
          <TabsTrigger value="notes">{t("deck_edit.tabs.notes")}</TabsTrigger>
        </TabsList>
        <TabsContent className={css["tab"]} value="deck">
          <DeckEditDeckTab deck={deck} />
        </TabsContent>
        <TabsContent className={css["tab"]} value="campaign">
          <DeckEditCampaignTab deck={deck} />
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
        title={t("deck_edit.sections.personality")}
      />
      <DeckSection
        cards={groups.background}
        category="background"
        deck={deck}
        title={t("deck_edit.sections.background")}
      />
      <DeckSection
        cards={groups.specialty}
        category="specialty"
        deck={deck}
        title={t("deck_edit.sections.specialty")}
      />
      <DeckSection
        cards={groups.outside}
        category="outside"
        deck={deck}
        title={t("deck_edit.sections.outside_interest")}
      />
    </>
  );
}

function DeckSection({
  cards,
  category,
  deck,
  title,
}: {
  cards: ResolvedCard[];
  category: Category;
  deck: ResolvedDeck;
  title: string;
}) {
  const { t } = useTranslation();
  const updateCardQuantity = useStore((state) => state.updateCardQuantity);
  const pool = useCardPoolForCategory(deck, category);

  return (
    <section className={css["section"]}>
      <h2>{title}</h2>
      {cards.map((card) => (
        <div className={css["card-row"]} key={card.card.code}>
          <div>
            <span className={css["card-name"]}>{card.card.name}</span>
            <ReplacementPicker
              deck={deck}
              currentCode={card.card.code}
              pool={pool}
            />
          </div>
          <div className={css["row-actions"]}>
            <Button
              iconOnly
              onClick={() =>
                updateCardQuantity(deck.id, card.card.code, -1, 2, "slots")
              }
              tooltip={t("deck_edit.actions.decrease")}
            >
              <MinusIcon />
            </Button>
            <span>{deck.slots[card.card.code] ?? 0}</span>
            <Button
              iconOnly
              onClick={() =>
                updateCardQuantity(deck.id, card.card.code, 1, 2, "slots")
              }
              tooltip={t("deck_edit.actions.increase")}
            >
              <PlusIcon />
            </Button>
          </div>
        </div>
      ))}
    </section>
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
        {pool
          .filter((card) => !deck.slots[card.card.code])
          .map((card) => (
            <option key={card.card.code} value={card.card.code}>
              {card.card.name}
            </option>
          ))}
      </select>
    </div>
  );
}

function DeckEditCampaignTab({ deck }: { deck: ResolvedDeck }) {
  const { t } = useTranslation();
  const rewards = useCardsForSlots(deck.rewards);
  const displaced = useCardsForSlots(deck.displaced);
  const maladies = useCardsForSlots(deck.maladies);
  const rewardPool = useCampaignPool("reward");
  const maladyPool = useCampaignPool("malady");
  const unlockReward = useStore((state) => state.unlockReward);
  const removeReward = useStore((state) => state.removeUnlockedReward);
  const addMalady = useStore((state) => state.addMalady);
  const removeMalady = useStore((state) => state.removeMalady);
  const swapRewardIntoSlots = useStore((state) => state.swapRewardIntoSlots);
  const restoreDisplaced = useStore((state) => state.restoreDisplaced);
  const deckCards = useCardsForSlots(deck.slots);

  const starter = !rewards.length && !displaced.length && !maladies.length;

  return (
    <>
      {starter && (
        <p className={css["empty"]}>{t("deck_edit.campaign.empty")}</p>
      )}
      <CampaignSection
        addLabel={t("deck_edit.actions.add_reward")}
        cards={rewards}
        onAdd={(code) => unlockReward(deck.id, code)}
        pool={rewardPool}
        title={t("deck.evolution.rewards")}
      >
        {(card) => (
          <>
            <DisplacementPicker
              cards={deckCards}
              label={t("deck_edit.actions.add_to_deck")}
              onSelect={(code) =>
                swapRewardIntoSlots(deck.id, card.card.code, code)
              }
            />
            <Button onClick={() => removeReward(deck.id, card.card.code)}>
              {t("deck_edit.actions.remove")}
            </Button>
          </>
        )}
      </CampaignSection>
      <section className={css["section"]}>
        <h2>{t("deck.evolution.displaced")}</h2>
        {displaced.map((card) => (
          <div className={css["card-row"]} key={card.card.code}>
            <span className={css["card-name"]}>{card.card.name}</span>
            <DisplacementPicker
              cards={deckCards}
              includeNone
              label={t("deck_edit.actions.restore")}
              onSelect={(code) =>
                restoreDisplaced(
                  deck.id,
                  card.card.code,
                  code === "__none" ? undefined : code,
                )
              }
            />
          </div>
        ))}
      </section>
      <CampaignSection
        addLabel={t("deck_edit.actions.add_malady")}
        cards={maladies}
        onAdd={(code) => addMalady(deck.id, code)}
        pool={maladyPool}
        title={t("deck.evolution.maladies")}
      >
        {(card) => (
          <Button onClick={() => removeMalady(deck.id, card.card.code)}>
            {t("deck_edit.actions.remove")}
          </Button>
        )}
      </CampaignSection>
    </>
  );
}

function CampaignSection({
  addLabel,
  cards,
  children,
  onAdd,
  pool,
  title,
}: {
  addLabel: string;
  cards: ResolvedCard[];
  children: (card: ResolvedCard) => React.ReactNode;
  onAdd: (code: string) => void;
  pool: ResolvedCard[];
  title: string;
}) {
  return (
    <section className={css["section"]}>
      <h2>{title}</h2>
      <select
        aria-label={addLabel}
        onChange={(evt) => {
          if (evt.target.value) onAdd(evt.target.value);
          evt.target.value = "";
        }}
      >
        <option value="">{addLabel}</option>
        {pool
          .filter(
            (card) =>
              !cards.some((current) => current.card.code === card.card.code),
          )
          .map((card) => (
            <option key={card.card.code} value={card.card.code}>
              {card.card.name}
            </option>
          ))}
      </select>
      {cards.map((card) => (
        <div className={css["card-row"]} key={card.card.code}>
          <span className={css["card-name"]}>{card.card.name}</span>
          <div className={css["row-actions"]}>{children(card)}</div>
        </div>
      ))}
    </section>
  );
}

function DisplacementPicker({
  cards,
  includeNone,
  label,
  onSelect,
}: {
  cards: ResolvedCard[];
  includeNone?: boolean;
  label: string;
  onSelect: (code: string) => void;
}) {
  const { t } = useTranslation();

  return (
    <select
      aria-label={label}
      onChange={(evt) => {
        onSelect(evt.target.value);
        evt.target.value = "";
      }}
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

function DeckEditNotesTab({ deck }: { deck: ResolvedDeck }) {
  const { t } = useTranslation();
  const updateAnnotation = useStore((state) => state.updateAnnotation);
  const cards = useCardsForSlots(deck.slots);

  return (
    <div className={css["notes"]}>
      {cards.map((card) => (
        <label className={css["note"]} key={card.card.code}>
          <span className={css["card-name"]}>{card.card.name}</span>
          <textarea
            aria-label={t("deck_edit.notes.annotation")}
            onChange={(evt) =>
              updateAnnotation(deck.id, card.card.code, evt.target.value)
            }
            value={deck.annotations[card.card.code] ?? ""}
          />
        </label>
      ))}
    </div>
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
