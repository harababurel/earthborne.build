import {
  type AspectKey,
  BACKGROUND_PICKS,
  BACKGROUND_TYPES,
  type Card as CardT,
  OUTSIDE_INTEREST_PICKS,
  SPECIALTY_PICKS,
} from "@arkham-build/shared";
import type { TFunction } from "i18next";
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useParams } from "wouter";
import { Card } from "@/components/card/card";
import { CardModalProvider } from "@/components/card-modal/card-modal-provider";
import { CardScan } from "@/components/card-scan";
import { PortaledCardTooltip } from "@/components/card-tooltip/card-tooltip-portaled";
import { Footer } from "@/components/footer";
import { Masthead } from "@/components/masthead";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast.hooks";
import { DefaultTooltip } from "@/components/ui/tooltip";
import { useRestingTooltip } from "@/components/ui/tooltip.hooks";
import { useStore } from "@/store";
import type { ResolvedCard } from "@/store/lib/types";
import {
  selectDeckCreateAspectCards,
  selectDeckCreateBackgroundCards,
  selectDeckCreateChecked,
  selectDeckCreateOutsideInterestCards,
  selectDeckCreatePersonalityCards,
  selectDeckCreateRole,
  selectDeckCreateSpecialtyCards,
} from "@/store/selectors/deck-create";
import type { DeckCreateStep } from "@/store/slices/deck-create.types";
import { cx } from "@/utils/cx";
import { useAccentColor } from "@/utils/use-accent-color";
import css from "./deck-create.module.css";

const steps: DeckCreateStep[] = [
  "name",
  "aspect",
  "background",
  "specialty",
  "personality",
  "outside_interest",
  "review",
];

function DeckCreate() {
  const { code } = useParams<{ code: string }>();
  const deckCreate = useStore((state) => state.deckCreate);
  const destroy = useStore((state) => state.resetCreate);
  const initialize = useStore((state) => state.initCreate);

  useEffect(() => {
    initialize(code);
    return () => destroy();
  }, [code, destroy, initialize]);

  return deckCreate ? (
    <CardModalProvider>
      <DeckCreateInner />
    </CardModalProvider>
  ) : null;
}

function DeckCreateInner() {
  const deckCreate = useStore(selectDeckCreateChecked);
  const role = useStore(selectDeckCreateRole);
  const cssVariables = useAccentColor(role.card);

  return (
    <div className={cx(css["wizard-layout"], "fade-in")} style={cssVariables}>
      <Masthead className={css["layout-header"]} />
      <main className={css["wizard"]}>
        <DeckCreateProgress />
        {deckCreate.step === "name" && <DeckCreateStepName />}
        {deckCreate.step === "aspect" && <DeckCreateStepAspect />}
        {deckCreate.step === "background" && <DeckCreateStepBackground />}
        {deckCreate.step === "specialty" && <DeckCreateStepSpecialty />}
        {deckCreate.step === "personality" && <DeckCreateStepPersonality />}
        {deckCreate.step === "outside_interest" && (
          <DeckCreateStepOutsideInterest />
        )}
        {deckCreate.step === "review" && <DeckCreateStepReview />}
        <DeckCreateNavigation />
      </main>
      <footer className={css["layout-footer"]}>
        <Footer />
      </footer>
    </div>
  );
}

function DeckCreateProgress() {
  const { t } = useTranslation();
  const deckCreate = useStore(selectDeckCreateChecked);
  const current = steps.indexOf(deckCreate.step);

  return (
    <ol className={css["progress"]}>
      {steps.map((step, index) => (
        <li
          className={cx(
            css["progress-step"],
            index <= current && css["progress-step-active"],
          )}
          key={step}
        >
          {index < current && <CheckIcon />}
          <span>{t(`deck_create.steps.${step}`)}</span>
        </li>
      ))}
    </ol>
  );
}

function DeckCreateStepName() {
  const { t } = useTranslation();
  const deckCreate = useStore(selectDeckCreateChecked);
  const setName = useStore((state) => state.deckCreateSetName);
  const setProvider = useStore((state) => state.deckCreateSetProvider);

  const providerOptions = useMemo(
    () => [
      { value: "local", label: t("deck_edit.config.storage_provider.local") },
      {
        value: "shared",
        label: t("deck_edit.config.storage_provider.shared"),
      },
    ],
    [t],
  );

  return (
    <section className={css["wizard-step"]}>
      <h1>{t("deck_create.name.title")}</h1>
      <Field full padded>
        <FieldLabel htmlFor="name">{t("deck_edit.config.name")}</FieldLabel>
        <input
          id="name"
          onChange={(evt) => setName(evt.target.value)}
          type="text"
          value={deckCreate.name}
        />
      </Field>
      <Field full padded>
        <FieldLabel htmlFor="provider">
          {t("deck_edit.config.storage_provider.title")}
        </FieldLabel>
        <Select
          id="provider"
          onChange={(evt) =>
            setProvider(evt.target.value as "local" | "shared")
          }
          options={providerOptions}
          required
          value={deckCreate.provider}
        />
      </Field>
    </section>
  );
}

function DeckCreateStepAspect() {
  const { t } = useTranslation();
  const deckCreate = useStore(selectDeckCreateChecked);
  const cards = useStore(selectDeckCreateAspectCards);
  const setAspect = useStore((state) => state.deckCreateSetAspect);

  return (
    <PickerStep title={t("deck_create.aspect.title")}>
      <CardGrid>
        {cards.map((card) => (
          <SelectableCard
            key={card.card.code}
            card={card}
            onSelect={() => setAspect(card.card.code)}
            selected={deckCreate.aspectCode === card.card.code}
          />
        ))}
      </CardGrid>
    </PickerStep>
  );
}

function DeckCreateStepBackground() {
  const { t } = useTranslation();
  const deckCreate = useStore(selectDeckCreateChecked);
  const setBackground = useStore((state) => state.deckCreateSetBackground);
  const toggle = useStore((state) => state.deckCreateToggleBackgroundCard);
  const aspectCards = useStore(selectDeckCreateAspectCards);
  const cards = useStore((state) =>
    selectDeckCreateBackgroundCards(state, deckCreate.background),
  );
  const aspectCard = aspectCards.find(
    (card) => card.card.code === deckCreate.aspectCode,
  );
  const count = selectedCount(deckCreate.backgroundSlots);

  return (
    <PickerStep
      count={count}
      target={BACKGROUND_PICKS}
      title={t("deck_create.background.title")}
    >
      <div className={css["background-options"]}>
        {BACKGROUND_TYPES.map((type) => (
          <button
            className={cx(
              css["background-option"],
              deckCreate.background === type && css["background-option-active"],
            )}
            key={type}
            onClick={() => setBackground(type)}
            type="button"
          >
            <span className={css["background-option-title"]}>
              {t(`deck_create.background_type.${type}`)}
            </span>
            <span className={css["background-option-description"]}>
              {t(`deck_create.background_type_description.${type}`)}
            </span>
          </button>
        ))}
      </div>
      <CardGrid>
        {cards.map((card) => (
          <SelectableCard
            key={card.card.code}
            card={card}
            disabledReason={
              deckCreate.backgroundSlots[card.card.code]
                ? undefined
                : getBackgroundCardDisabledReason(
                    t,
                    card.card,
                    aspectCard?.card,
                    count,
                  )
            }
            disabled={
              !deckCreate.backgroundSlots[card.card.code] &&
              (!!getAspectRequirementShortfall(card.card, aspectCard?.card) ||
                count >= BACKGROUND_PICKS)
            }
            onSelect={() => toggle(card.card.code)}
            selected={!!deckCreate.backgroundSlots[card.card.code]}
          />
        ))}
      </CardGrid>
    </PickerStep>
  );
}

function DeckCreateStepSpecialty() {
  const { t } = useTranslation();
  const deckCreate = useStore(selectDeckCreateChecked);
  const role = useStore(selectDeckCreateRole);
  const specialty = role.card.specialty_type ?? undefined;
  const cards = useStore((state) =>
    selectDeckCreateSpecialtyCards(state, specialty),
  );
  const toggle = useStore((state) => state.deckCreateToggleSpecialtyCard);

  return (
    <PickerStep
      count={selectedCount(deckCreate.specialtySlots)}
      target={SPECIALTY_PICKS}
      title={t("deck_create.specialty.title")}
    >
      <CardGrid>
        {cards.map((card) => (
          <SelectableCard
            key={card.card.code}
            card={card}
            disabled={
              !deckCreate.specialtySlots[card.card.code] &&
              selectedCount(deckCreate.specialtySlots) >= SPECIALTY_PICKS
            }
            onSelect={() => toggle(card.card.code)}
            selected={!!deckCreate.specialtySlots[card.card.code]}
          />
        ))}
      </CardGrid>
    </PickerStep>
  );
}

function DeckCreateStepPersonality() {
  const { t } = useTranslation();
  const cards = useStore(selectDeckCreatePersonalityCards);

  return (
    <PickerStep title={t("deck_create.personality.title")}>
      <CardGrid>
        {cards.map((card) => (
          <SelectableCard key={card.card.code} card={card} selected />
        ))}
      </CardGrid>
    </PickerStep>
  );
}

function DeckCreateStepOutsideInterest() {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const deckCreate = useStore(selectDeckCreateChecked);
  const role = useStore(selectDeckCreateRole);
  const cards = useStore((state) =>
    selectDeckCreateOutsideInterestCards(
      state,
      deckCreate.background,
      role.card.specialty_type ?? undefined,
    ),
  );
  const toggle = useStore((state) => state.deckCreateToggleOutsideInterest);
  const filtered = cards.filter((card) =>
    card.card.name.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <PickerStep
      count={selectedCount(deckCreate.outsideInterestSlots)}
      target={OUTSIDE_INTEREST_PICKS}
      title={t("deck_create.outside_interest.title")}
    >
      <input
        aria-label={t("deck_create.search")}
        onChange={(evt) => setQuery(evt.target.value)}
        placeholder={t("deck_create.search")}
        type="search"
        value={query}
      />
      <CardGrid>
        {filtered.map((card) => (
          <SelectableCard
            key={card.card.code}
            card={card}
            onSelect={() => toggle(card.card.code)}
            selected={!!deckCreate.outsideInterestSlots[card.card.code]}
          />
        ))}
      </CardGrid>
    </PickerStep>
  );
}

function DeckCreateStepReview() {
  const { t } = useTranslation();
  const deckCreate = useStore(selectDeckCreateChecked);
  const role = useStore(selectDeckCreateRole);
  const aspectCards = useStore(selectDeckCreateAspectCards);
  const personality = useStore(selectDeckCreatePersonalityCards);
  const background = useStore((state) =>
    selectDeckCreateBackgroundCards(state, deckCreate.background),
  );
  const specialty = useStore((state) =>
    selectDeckCreateSpecialtyCards(
      state,
      role.card.specialty_type ?? undefined,
    ),
  );
  const outside = useStore((state) =>
    selectDeckCreateOutsideInterestCards(
      state,
      deckCreate.background,
      role.card.specialty_type ?? undefined,
    ),
  );

  const aspect = aspectCards.find(
    (card) => card.card.code === deckCreate.aspectCode,
  );

  return (
    <section className={css["wizard-step"]}>
      <h1>{t("deck_create.review.title")}</h1>
      <div className={css["identity"]}>
        <Card resolvedCard={role} size="compact" />
        {aspect && <Card resolvedCard={aspect} size="compact" />}
      </div>
      <ReviewGroup
        cards={personality}
        slots={deckCreate.personalitySlots}
        title={t("deck_create.steps.personality")}
      />
      <ReviewGroup
        cards={background}
        slots={deckCreate.backgroundSlots}
        title={t("deck_create.steps.background")}
      />
      <ReviewGroup
        cards={specialty}
        slots={deckCreate.specialtySlots}
        title={t("deck_create.steps.specialty")}
      />
      <ReviewGroup
        cards={outside}
        slots={deckCreate.outsideInterestSlots}
        title={t("deck_create.steps.outside_interest")}
      />
    </section>
  );
}

function DeckCreateNavigation() {
  const { t } = useTranslation();
  const toast = useToast();
  const [, navigate] = useLocation();
  const deckCreate = useStore(selectDeckCreateChecked);
  const setStep = useStore((state) => state.deckCreateSetStep);
  const createDeck = useStore((state) => state.createDeck);
  const index = steps.indexOf(deckCreate.step);
  const isReview = deckCreate.step === "review";

  const onCreate = useCallback(async () => {
    const toastId = toast.show({
      children: t("deck_create.loading"),
      variant: "loading",
    });

    try {
      const id = await createDeck();
      navigate(`/deck/edit/${id}`, { replace: true });
    } catch (err) {
      toast.show({
        children: t("deck_create.error", { error: (err as Error).message }),
        variant: "error",
      });
    } finally {
      toast.dismiss(toastId);
    }
  }, [createDeck, navigate, t, toast]);

  return (
    <nav className={css["wizard-nav"]}>
      <Button
        disabled={index === 0}
        onClick={() => setStep(steps[index - 1])}
        variant="secondary"
      >
        <ArrowLeftIcon />
        {t("common.back")}
      </Button>
      {isReview ? (
        <Button
          disabled={!canAdvance(deckCreate)}
          onClick={onCreate}
          variant="primary"
        >
          <CheckIcon />
          {t("deck.actions.create")}
        </Button>
      ) : (
        <Button
          disabled={!canAdvance(deckCreate)}
          onClick={() => setStep(steps[index + 1])}
          variant="primary"
        >
          {t("common.next")}
          <ArrowRightIcon />
        </Button>
      )}
    </nav>
  );
}

function PickerStep({
  children,
  count,
  target,
  title,
}: {
  children: React.ReactNode;
  count?: number;
  target?: number;
  title: string;
}) {
  return (
    <section className={css["wizard-step"]}>
      <header className={css["step-header"]}>
        <h1>{title}</h1>
        {target != null && count != null && (
          <span>
            {count} / {target}
          </span>
        )}
      </header>
      {children}
    </section>
  );
}

function CardGrid({ children }: { children: React.ReactNode }) {
  return <div className={css["card-grid"]}>{children}</div>;
}

function SelectableCard({
  card,
  disabled,
  disabledReason,
  onSelect,
  selected,
}: {
  card: ResolvedCard;
  disabled?: boolean;
  disabledReason?: string;
  onSelect?: () => void;
  selected: boolean;
}) {
  const { refs, referenceProps, isMounted, floatingStyles, transitionStyles } =
    useRestingTooltip();

  const button = (
    <button
      aria-disabled={disabled || undefined}
      className={cx(
        css["selectable-card"],
        selected && css["selected"],
        disabled && css["selectable-card-disabled"],
      )}
      onClick={disabled ? undefined : onSelect}
      type="button"
    >
      <Card
        resolvedCard={card}
        size="compact"
        slotImageWrapperProps={{
          ...referenceProps,
          ref: refs.setReference,
        }}
      />
    </button>
  );

  return (
    <>
      {disabledReason ? (
        <DefaultTooltip tooltip={disabledReason}>{button}</DefaultTooltip>
      ) : (
        button
      )}
      {isMounted && (
        <PortaledCardTooltip
          card={card.card}
          ref={refs.setFloating}
          floatingStyles={floatingStyles}
          transitionStyles={transitionStyles}
          tooltip={
            <div className={css["card-scan-tooltip"]}>
              <CardScan card={card.card} lazy />
            </div>
          }
        />
      )}
    </>
  );
}

function getBackgroundCardDisabledReason(
  t: TFunction,
  card: CardT,
  aspectCard: CardT | undefined,
  selectedCountValue: number,
) {
  const shortfall = getAspectRequirementShortfall(card, aspectCard);
  if (shortfall) {
    return t("deck_create.card_disabled.aspect_requirement", {
      actual: shortfall.actual,
      aspect: t(`common.factions.${shortfall.aspect.toLowerCase()}`),
      required: shortfall.required,
    });
  }

  if (selectedCountValue >= BACKGROUND_PICKS) {
    return t("deck_create.card_disabled.background_limit", {
      count: selectedCountValue,
      target: BACKGROUND_PICKS,
    });
  }

  return undefined;
}

function getAspectRequirementShortfall(
  card: CardT,
  aspectCard: CardT | undefined,
) {
  const aspect = card.aspect_requirement_type;
  const required = card.aspect_requirement_value;
  if (!aspect || required == null) return undefined;

  const actual = aspectCard ? getAspectValue(aspectCard, aspect) : 0;
  if (actual >= required) return undefined;

  return { actual, aspect, required };
}

function getAspectValue(card: CardT, aspect: AspectKey) {
  switch (aspect) {
    case "AWA":
      return card.aspect_awareness ?? 0;
    case "FIT":
      return card.aspect_fitness ?? 0;
    case "FOC":
      return card.aspect_focus ?? 0;
    case "SPI":
      return card.aspect_spirit ?? 0;
  }
}

function ReviewGroup({
  cards,
  slots,
  title,
}: {
  cards: ResolvedCard[];
  slots: Record<string, number>;
  title: string;
}) {
  return (
    <section className={css["review-group"]}>
      <h2>{title}</h2>
      <ul>
        {cards
          .filter((card) => slots[card.card.code] > 0)
          .map((card) => (
            <li key={card.card.code}>
              {slots[card.card.code]}x {card.card.name}
            </li>
          ))}
      </ul>
    </section>
  );
}

function selectedCount(slots: Record<string, number>) {
  return Object.values(slots).filter((quantity) => quantity > 0).length;
}

function canAdvance(deckCreate: ReturnType<typeof selectDeckCreateChecked>) {
  if (deckCreate.step === "name") return deckCreate.name.trim().length > 0;
  if (deckCreate.step === "aspect") return !!deckCreate.aspectCode;
  if (deckCreate.step === "background") {
    return (
      !!deckCreate.background &&
      selectedCount(deckCreate.backgroundSlots) === BACKGROUND_PICKS
    );
  }
  if (deckCreate.step === "specialty") {
    return selectedCount(deckCreate.specialtySlots) === SPECIALTY_PICKS;
  }
  if (deckCreate.step === "outside_interest") {
    return (
      selectedCount(deckCreate.outsideInterestSlots) === OUTSIDE_INTEREST_PICKS
    );
  }
  return true;
}

export default DeckCreate;
