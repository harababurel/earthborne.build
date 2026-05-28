import {
  ASPECT_ORDER,
  type AspectKey,
  BACKGROUND_PICKS,
  BACKGROUND_TYPES,
  type Card as CardT,
  OUTSIDE_INTEREST_PICKS,
  PERSONALITY_PICKS,
  SPECIALTY_PICKS,
  SPECIALTY_TYPES,
} from "@earthborne-build/shared";
import type { TFunction } from "i18next";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  FilterIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "wouter";
import { AspectStats } from "@/components/aspect-stats";
import { Card } from "@/components/card/card";
import { CardText } from "@/components/card/card-text";
import { CardListContainer } from "@/components/card-list/card-list-container";
import { CardModalProvider } from "@/components/card-modal/card-modal-provider";
import { CardScan } from "@/components/card-scan";
import { PortaledCardTooltip } from "@/components/card-tooltip/card-tooltip-portaled";
import { CollapseSidebarButton } from "@/components/collapse-sidebar-button";
import deckSidebarCss from "@/components/deck-display/sidebar.module.css";
import { Filters } from "@/components/filters/filters";
import { Footer } from "@/components/footer";
import { Masthead } from "@/components/masthead";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { HotkeyTooltip } from "@/components/ui/hotkey";
import { Plane } from "@/components/ui/plane";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast.hooks";
import { DefaultTooltip } from "@/components/ui/tooltip";
import { useRestingTooltip } from "@/components/ui/tooltip.hooks";
import { useStore } from "@/store";
import { filterRangerCards } from "@/store/lib/filtering";
import type { ResolvedCard } from "@/store/lib/types";
import {
  selectDeckCreateAspectCards,
  selectDeckCreateBackgroundCards,
  selectDeckCreateChecked,
  selectDeckCreateOutsideInterestCards,
  selectDeckCreatePersonalityCards,
  selectDeckCreateRole,
  selectDeckCreateRoleCards,
  selectDeckCreateSpecialtyCards,
} from "@/store/selectors/deck-create";
import type { DeckCreateStep } from "@/store/slices/deck-create.types";
import { cx } from "@/utils/cx";
import { displayPackName } from "@/utils/formatting";
import { and, type Filter } from "@/utils/fp";
import { useAccentColor } from "@/utils/use-accent-color";
import { useHotkey } from "@/utils/use-hotkey";
import css from "./deck-create.module.css";

const steps: DeckCreateStep[] = [
  "name",
  "aspect",
  "personality",
  "background",
  "specialty",
  "outside_interest",
  "role",
  "review",
];

function DeckCreate() {
  const deckCreate = useStore((state) => state.deckCreate);
  const destroy = useStore((state) => state.resetCreate);
  const initialize = useStore((state) => state.initCreate);

  useEffect(() => {
    initialize();
    return () => destroy();
  }, [destroy, initialize]);

  return deckCreate ? (
    <CardModalProvider>
      <DeckCreateInner />
    </CardModalProvider>
  ) : null;
}

function DeckCreateInner() {
  const deckCreate = useStore(selectDeckCreateChecked);
  const role = useStore(selectDeckCreateRole);
  const aspectCards = useStore(selectDeckCreateAspectCards);
  const aspectCard = aspectCards.find(
    (card) => card.card.code === deckCreate.aspectCode,
  );
  const accentSource = role?.card ?? aspectCard?.card;
  const cssVariables = useAccentColor(accentSource);

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
        {deckCreate.step === "role" && <DeckCreateStepRole />}
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
  const groups = groupAspectCardsByPack(cards);

  return (
    <PickerStep title={t("deck_create.aspect.title")}>
      <div className={css["aspect-pack-groups"]}>
        {groups.map((group) => (
          <section className={css["aspect-pack-group"]} key={group.packCode}>
            <h2 className={css["section-delimiter"]}>{group.packName}</h2>
            <CardGrid className={css["aspect-card-grid"]}>
              {group.cards.map((card) => (
                <SelectableAspectCard
                  key={card.card.code}
                  card={card}
                  onSelect={() => setAspect(card.card.code)}
                  selected={deckCreate.aspectCode === card.card.code}
                />
              ))}
            </CardGrid>
          </section>
        ))}
      </div>
    </PickerStep>
  );
}

function SelectableAspectCard({
  card,
  onSelect,
  selected,
}: {
  card: ResolvedCard;
  onSelect: () => void;
  selected: boolean;
}) {
  return (
    <button
      aria-label={card.card.name}
      className={cx(
        css["selectable-card"],
        css["aspect-option"],
        selected && css["selected"],
      )}
      onClick={onSelect}
      type="button"
    >
      <AspectStats aspectCard={card.card} />
      <CardText
        size="full"
        text={card.card.text ?? undefined}
        typeCode={card.card.type_code ?? ""}
      />
    </button>
  );
}

function groupAspectCardsByPack(cards: ResolvedCard[]) {
  const groups = new Map<
    string,
    {
      cards: ResolvedCard[];
      packCode: string;
      packName: string;
      position: number;
    }
  >();

  for (const card of cards) {
    const packCode = card.pack?.code ?? card.card.pack_code;
    const group = groups.get(packCode);

    if (group) {
      group.cards.push(card);
    } else {
      groups.set(packCode, {
        cards: [card],
        packCode,
        packName: card.pack ? displayPackName(card.pack) : packCode,
        position: card.pack?.position ?? Number.MAX_SAFE_INTEGER,
      });
    }
  }

  return Array.from(groups.values()).sort(
    (a, b) => a.position - b.position || a.packName.localeCompare(b.packName),
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
  const setSpecialty = useStore((state) => state.deckCreateSetSpecialty);
  const toggle = useStore((state) => state.deckCreateToggleSpecialtyCard);
  const aspectCards = useStore(selectDeckCreateAspectCards);
  const cards = useStore((state) =>
    selectDeckCreateSpecialtyCards(state, deckCreate.specialty),
  );
  const roleCards = useStore((state) =>
    selectDeckCreateRoleCards(state, deckCreate.specialty),
  );
  const aspectCard = aspectCards.find(
    (card) => card.card.code === deckCreate.aspectCode,
  );
  const count = selectedCount(deckCreate.specialtySlots);

  return (
    <PickerStep
      count={count}
      target={SPECIALTY_PICKS}
      title={t("deck_create.specialty.title")}
    >
      <div className={css["background-options"]}>
        {SPECIALTY_TYPES.map((type) => (
          <button
            className={cx(
              css["background-option"],
              deckCreate.specialty === type && css["background-option-active"],
            )}
            key={type}
            onClick={() => setSpecialty(type)}
            type="button"
          >
            <span className={css["background-option-title"]}>
              {t(`deck_create.specialty_type.${type}`)}
            </span>
            <span className={css["background-option-description"]}>
              {t(`deck_create.specialty_type_description.${type}`)}
            </span>
          </button>
        ))}
      </div>
      {deckCreate.specialty && roleCards.length > 0 && (
        <div className={css["role-preview"]}>
          <p className={css["role-preview-label"]}>
            {t("deck_create.specialty.role_preview")}
          </p>
          <div className={css["card-grid"]}>
            {roleCards.map((card) => (
              <div className={css["role-preview-card"]} key={card.card.code}>
                <Card resolvedCard={card} size="compact" />
              </div>
            ))}
          </div>
        </div>
      )}
      <CardGrid>
        {cards.map((card) => (
          <SelectableCard
            key={card.card.code}
            card={card}
            disabledReason={
              deckCreate.specialtySlots[card.card.code]
                ? undefined
                : getSpecialtyCardDisabledReason(
                    t,
                    card.card,
                    aspectCard?.card,
                    count,
                  )
            }
            disabled={
              !deckCreate.specialtySlots[card.card.code] &&
              (!!getAspectRequirementShortfall(card.card, aspectCard?.card) ||
                count >= SPECIALTY_PICKS)
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
  const deckCreate = useStore(selectDeckCreateChecked);
  const cards = useStore(selectDeckCreatePersonalityCards);
  const select = useStore((state) => state.deckCreateSelectPersonalityCard);

  const byAspect = ASPECT_ORDER.map((aspect) => ({
    aspect,
    cards: cards.filter((c) => c.card.aspect_requirement_type === aspect),
  }));

  const count = selectedCount(deckCreate.personalitySlots);

  return (
    <PickerStep
      count={count}
      target={PERSONALITY_PICKS}
      title={t("deck_create.personality.title")}
    >
      <p className={css["step-instructions"]}>
        {t("deck_create.personality.instructions")}
      </p>
      {byAspect.map(({ aspect, cards: aspectCards }) => {
        const hasSelection = aspectCards.some(
          (c) => !!deckCreate.personalitySlots[c.card.code],
        );
        return (
          <div key={aspect} className={css["personality-section"]}>
            <h2 className={css["section-delimiter"]}>
              {t(`common.factions.${aspect.toLowerCase()}`)}
            </h2>
            <CardGrid>
              {aspectCards.map((card) => {
                const selected = !!deckCreate.personalitySlots[card.card.code];
                return (
                  <SelectableCard
                    key={card.card.code}
                    card={card}
                    disabled={!selected && hasSelection}
                    onSelect={() => select(card.card.code)}
                    selected={selected}
                  />
                );
              })}
            </CardGrid>
          </div>
        );
      })}
    </PickerStep>
  );
}

function DeckCreateStepOutsideInterest() {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const deckCreate = useStore(selectDeckCreateChecked);
  const cards = useStore(selectDeckCreateOutsideInterestCards);
  const toggle = useStore((state) => state.deckCreateToggleOutsideInterest);

  const alreadySelected = useMemo(() => {
    return new Set([
      ...Object.keys(deckCreate.backgroundSlots),
      ...Object.keys(deckCreate.specialtySlots),
    ]);
  }, [deckCreate.backgroundSlots, deckCreate.specialtySlots]);

  const filtered = cards.filter(
    (card) =>
      !alreadySelected.has(card.card.code) &&
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

function DeckCreateStepRole() {
  const { t } = useTranslation();
  const deckCreate = useStore(selectDeckCreateChecked);
  const cards = useStore((state) =>
    selectDeckCreateRoleCards(state, deckCreate.specialty),
  );
  const setRole = useStore((state) => state.deckCreateSetRole);

  return (
    <PickerStep title={t("deck_create.role.title")}>
      <CardGrid>
        {cards.map((card) => (
          <SelectableCard
            key={card.card.code}
            card={card}
            onSelect={() => setRole(card.card.code)}
            selected={deckCreate.roleCode === card.card.code}
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
    selectDeckCreateSpecialtyCards(state, deckCreate.specialty),
  );
  const outside = useStore(selectDeckCreateOutsideInterestCards);

  const aspect = aspectCards.find(
    (card) => card.card.code === deckCreate.aspectCode,
  );
  const sections = [
    {
      cards: personality,
      slots: deckCreate.personalitySlots,
    },
    {
      cards: background,
      slots: deckCreate.backgroundSlots,
    },
    {
      cards: specialty,
      slots: deckCreate.specialtySlots,
    },
    {
      cards: outside,
      slots: deckCreate.outsideInterestSlots,
    },
  ];

  return (
    <section className={css["wizard-step"]}>
      <h1>{t("deck_create.review.title")}</h1>
      <div className={css["review-layout"]}>
        <DeckCreateReviewIdentity
          aspect={aspect?.card}
          background={deckCreate.background}
          deckSize={reviewDeckSize(sections)}
          outsideInterest={selectedOutsideInterest(outside, deckCreate)}
          role={role?.card}
          specialty={deckCreate.specialty}
        />
        <ReviewCardsDisplay sections={sections} />
      </div>
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

function CardGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cx(css["card-grid"], className)}>{children}</div>;
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

function getSpecialtyCardDisabledReason(
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

  if (selectedCountValue >= SPECIALTY_PICKS) {
    return t("deck_create.card_disabled.specialty_limit", {
      count: selectedCountValue,
      target: SPECIALTY_PICKS,
    });
  }

  return undefined;
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

type ReviewSection = {
  cards: ResolvedCard[];
  slots: Record<string, number>;
};

const reviewListKey = "deck-create-review";

function DeckCreateReviewIdentity({
  aspect,
  background,
  deckSize,
  outsideInterest,
  role,
  specialty,
}: {
  aspect: CardT | undefined;
  background: string | undefined;
  deckSize: number;
  outsideInterest: CardT | undefined;
  role: CardT | undefined;
  specialty: string | undefined;
}) {
  const { t } = useTranslation();
  const { refs, referenceProps, isMounted, floatingStyles, transitionStyles } =
    useRestingTooltip();
  const cssVariables = useAccentColor(role);

  return (
    <aside
      className={cx(css["review-identity"], deckSidebarCss["container"])}
      style={cssVariables}
    >
      <div className={deckSidebarCss["sidebar-inner"]}>
        <Plane className={deckSidebarCss["section"]}>
          <h2 className={deckSidebarCss["section-title"]}>
            {t("deck_create.steps.role")}
          </h2>
          <div className={deckSidebarCss["card-info"]}>
            <h3 className={deckSidebarCss["card-name"]}>{role?.name}</h3>
            {role && (
              <CardScan
                card={role}
                className={deckSidebarCss["card-scan"]}
                hideFlipButton
                lazy
              />
            )}
            <CardText
              size="full"
              text={role?.text ?? undefined}
              typeCode={role?.type_code ?? ""}
            />
          </div>
        </Plane>

        <Plane className={deckSidebarCss["combined-section"]}>
          <div className={deckSidebarCss["column"]}>
            <h2 className={deckSidebarCss["section-title"]}>
              {t("deck_create.steps.aspect")}
            </h2>
            <div className={deckSidebarCss["card-info"]}>
              <AspectStats aspectCard={aspect} />
              <CardText
                size="full"
                text={aspect?.text ?? undefined}
                typeCode={aspect?.type_code ?? ""}
              />
            </div>
          </div>

          <div className={deckSidebarCss["divider"]} />

          <div className={deckSidebarCss["column"]}>
            <h2 className={deckSidebarCss["section-title"]}>
              {t("deck_create.steps.review")}
            </h2>
            <div className={deckSidebarCss["identity-info"]}>
              <div className={deckSidebarCss["identity-item"]}>
                <span className={deckSidebarCss["identity-label"]}>
                  {t("deck.evolution.status")}
                </span>
                <span className={deckSidebarCss["identity-value"]}>
                  <DefaultTooltip
                    tooltip={t("deck.evolution.starter_description")}
                  >
                    <span className={deckSidebarCss["status-value"]}>
                      {t("deck.evolution.starter")}
                    </span>
                  </DefaultTooltip>
                </span>
              </div>
              <div className={deckSidebarCss["identity-item"]}>
                <span className={deckSidebarCss["identity-label"]}>
                  {t("deck.stats.deck_size")}
                </span>
                <span className={deckSidebarCss["identity-value"]}>
                  {deckSize}
                </span>
              </div>
              {background && (
                <ReviewIdentitySet
                  label={t("deck_create.steps.background")}
                  tooltip={t(
                    `deck_create.background_type_description.${background}`,
                  )}
                  value={t(`common.set.${background}`)}
                />
              )}
              {specialty && (
                <ReviewIdentitySet
                  label={t("deck_create.steps.specialty")}
                  tooltip={t(
                    `deck_create.specialty_type_description.${specialty}`,
                  )}
                  value={t(`common.set.${specialty}`)}
                />
              )}
              {outsideInterest && (
                <div className={deckSidebarCss["identity-item"]}>
                  <span className={deckSidebarCss["identity-label"]}>
                    {t("deck_create.steps.outside_interest")}
                  </span>
                  <span className={deckSidebarCss["identity-value"]}>
                    <Link
                      {...referenceProps}
                      className={deckSidebarCss["card-link"]}
                      href={`/card/${outsideInterest.code}`}
                      ref={refs.setReference}
                      style={{
                        color: outsideInterest.aspect_requirement_type
                          ? `var(--color-${outsideInterest.aspect_requirement_type.toLowerCase()})`
                          : undefined,
                      }}
                    >
                      {outsideInterest.name}
                    </Link>
                    {isMounted && (
                      <PortaledCardTooltip
                        card={outsideInterest}
                        ref={refs.setFloating}
                        floatingStyles={floatingStyles}
                        transitionStyles={transitionStyles}
                      />
                    )}
                  </span>
                </div>
              )}
            </div>
          </div>
        </Plane>
      </div>
    </aside>
  );
}

function ReviewIdentitySet({
  label,
  tooltip,
  value,
}: {
  label: string;
  tooltip: string;
  value: string;
}) {
  return (
    <div className={deckSidebarCss["identity-item"]}>
      <span className={deckSidebarCss["identity-label"]}>{label}</span>
      <span className={deckSidebarCss["identity-value"]}>
        <DefaultTooltip tooltip={tooltip}>
          <span className={deckSidebarCss["status-value"]}>{value}</span>
        </DefaultTooltip>
      </span>
    </div>
  );
}

function ReviewCardsDisplay({ sections }: { sections: ReviewSection[] }) {
  const { t } = useTranslation();
  const [filtersOpen, setFiltersOpen] = useState(true);
  const allCards = sections.flatMap(({ cards, slots }) =>
    cards.filter((card) => slots[card.card.code] > 0),
  );
  const allSlots = sections.reduce<Record<string, number>>((acc, section) => {
    for (const [code, quantity] of Object.entries(section.slots)) {
      acc[code] = quantity;
    }
    return acc;
  }, {});

  useDeckCreateReviewList(allCards.map((card) => card.card.code));
  const activeList = useStore((state) => state.activeList);

  const toggleFilters = useCallback(() => {
    setFiltersOpen((open) => !open);
  }, []);

  const closeFilters = useCallback(() => {
    setFiltersOpen(false);
  }, []);

  useHotkey("alt+2", toggleFilters);

  if (allCards.length === 0) return null;
  if (activeList !== reviewListKey) return null;

  return (
    <div
      className={cx(
        css["review-display"],
        !filtersOpen && css["review-display-filters-collapsed"],
      )}
    >
      <div className={css["review-list-panel"]}>
        <CardListContainer
          hideFooter
          quantities={allSlots}
          slotRight={
            <HotkeyTooltip
              keybind="alt+2"
              description={t("lists.actions.toggle_filters")}
            >
              <Button onClick={toggleFilters} iconOnly size="lg">
                <FilterIcon />
              </Button>
            </HotkeyTooltip>
          }
        />
      </div>
      {filtersOpen && (
        <div className={css["review-filters"]}>
          <CollapseSidebarButton
            hotkey="alt+2"
            hotkeyLabel={t("lists.actions.toggle_filters")}
            onClick={closeFilters}
            orientation="right"
          />
          <Filters targetDeck={undefined} />
        </div>
      )}
    </div>
  );
}

function useDeckCreateReviewList(cardCodes: string[]) {
  const addList = useStore((state) => state.addList);
  const removeList = useStore((state) => state.removeList);
  const setActiveList = useStore((state) => state.setActiveList);
  const cardCodeKey = useMemo(
    () => [...cardCodes].sort().join("|"),
    [cardCodes],
  );

  useEffect(() => {
    const codes = new Set(cardCodeKey ? cardCodeKey.split("|") : []);
    const selectedCardsFilter: Filter = (card) => codes.has(card.code);

    addList(
      reviewListKey,
      { card_type: "player" },
      {
        additionalFilters: ["pack", "illustrator"],
        systemFilter: and([filterRangerCards, selectedCardsFilter]),
      },
    );
    setActiveList(reviewListKey);

    return () => {
      if (useStore.getState().activeList === reviewListKey) {
        setActiveList(undefined);
      }
      removeList(reviewListKey);
    };
  }, [addList, cardCodeKey, removeList, setActiveList]);
}

function selectedCount(slots: Record<string, number>) {
  return Object.values(slots).filter((quantity) => quantity > 0).length;
}

function reviewDeckSize(sections: ReviewSection[]) {
  return sections.reduce(
    (total, section) =>
      total +
      Object.values(section.slots).reduce(
        (sectionTotal, quantity) => sectionTotal + quantity,
        0,
      ),
    0,
  );
}

function selectedOutsideInterest(
  outsideCards: ResolvedCard[],
  deckCreate: ReturnType<typeof selectDeckCreateChecked>,
) {
  return outsideCards.find(
    (card) => deckCreate.outsideInterestSlots[card.card.code],
  )?.card;
}

function canAdvance(deckCreate: ReturnType<typeof selectDeckCreateChecked>) {
  if (deckCreate.step === "name") return deckCreate.name.trim().length > 0;
  if (deckCreate.step === "aspect") return !!deckCreate.aspectCode;
  if (deckCreate.step === "personality") {
    return selectedCount(deckCreate.personalitySlots) === PERSONALITY_PICKS;
  }
  if (deckCreate.step === "background") {
    return (
      !!deckCreate.background &&
      selectedCount(deckCreate.backgroundSlots) === BACKGROUND_PICKS
    );
  }
  if (deckCreate.step === "specialty") {
    return (
      !!deckCreate.specialty &&
      selectedCount(deckCreate.specialtySlots) === SPECIALTY_PICKS
    );
  }
  if (deckCreate.step === "outside_interest") {
    return (
      selectedCount(deckCreate.outsideInterestSlots) === OUTSIDE_INTEREST_PICKS
    );
  }
  if (deckCreate.step === "role") return !!deckCreate.roleCode;
  return true;
}

export default DeckCreate;
