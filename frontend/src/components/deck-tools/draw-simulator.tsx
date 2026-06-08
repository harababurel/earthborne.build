import type { Card } from "@earthborne-build/shared";
import {
  InfoIcon,
  MinusIcon,
  PlusIcon,
  ShuffleIcon,
  Undo2Icon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import type { ResolvedDeck } from "@/store/lib/types";
import { cx } from "@/utils/cx";
import { CardScan } from "../card-scan";
import { PortaledCardTooltip } from "../card-tooltip/card-tooltip-portaled";
import { Button } from "../ui/button";
import { Plane } from "../ui/plane";
import { useRestingTooltip } from "../ui/tooltip.hooks";
import type { SimulatorState } from "./draw-simulator.logic";
import {
  buildSimulatorDeck,
  createInitialSimulatorState,
  drawCards,
  getSetupCandidates,
  redrawSelection,
  reshuffleSelection,
} from "./draw-simulator.logic";
import css from "./draw-simulator.module.css";

type Props = {
  deck: ResolvedDeck;
};

export function DrawSimulator(props: Props) {
  const { deck } = props;
  const { t } = useTranslation();
  const simulatorDeck = useMemo(() => buildSimulatorDeck(deck), [deck]);
  const setupCandidates = useMemo(() => getSetupCandidates(deck), [deck]);
  const [cardWidth, setCardWidth] = useState(9);
  const [setupCode, setSetupCode] = useState<string>("");
  const [selection, setSelection] = useState<number[]>([]);
  const [state, setState] = useState<SimulatorState>(() =>
    createInitialSimulatorState(simulatorDeck, setupCode),
  );

  useEffect(() => {
    setSelection([]);
    setState(createInitialSimulatorState(simulatorDeck, setupCode));
  }, [simulatorDeck, setupCode]);

  useEffect(() => {
    if (
      setupCode &&
      !setupCandidates.some((candidate) => candidate.code === setupCode)
    ) {
      setSetupCode("");
    }
  }, [setupCandidates, setupCode]);

  const hasSelection = selection.length > 0;
  const selectedIds = selection
    .map((index) => state.hand[index]?.id)
    .filter((id): id is string => !!id);
  const hasSetupCandidates = setupCandidates.length > 0;
  const cardSizeStyle = {
    "--card-width": `${cardWidth}rem`,
  } as React.CSSProperties;

  return (
    <Plane className={css["container"]} as="article" style={cardSizeStyle}>
      <header className={css["header"]}>
        <h2 className={css["title"]}>
          <ShuffleIcon size="1em" />
          {t("draw_simulator.title")}
          <Button
            aria-label={t("draw_simulator.help_label")}
            iconOnly
            size="xs"
            tooltip={<DrawSimulatorHelp t={t} />}
            variant="bare"
          >
            <InfoIcon />
          </Button>
        </h2>
        <div className={css["size-actions"]}>
          <span>{t("draw_simulator.card_size")}</span>
          <Button
            disabled={cardWidth <= 7}
            iconOnly
            onClick={() => setCardWidth((current) => Math.max(7, current - 1))}
            size="xs"
            tooltip={t("draw_simulator.decrease_card_size")}
            variant="bare"
          >
            <MinusIcon />
          </Button>
          <Button
            disabled={cardWidth >= 12}
            iconOnly
            onClick={() => setCardWidth((current) => Math.min(12, current + 1))}
            size="xs"
            tooltip={t("draw_simulator.increase_card_size")}
            variant="bare"
          >
            <PlusIcon />
          </Button>
        </div>
      </header>

      {hasSetupCandidates && (
        <label className={css["setup-field"]}>
          <span>{t("draw_simulator.setup_label")}</span>
          <select
            onChange={(evt) => setSetupCode(evt.target.value)}
            value={setupCode}
          >
            <option value="">{t("draw_simulator.setup_none")}</option>
            {setupCandidates.map((card) => (
              <option key={card.code} value={card.code}>
                {card.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <nav className={css["nav"]}>
        {[1, 6].map((count) => (
          <Button
            key={count}
            onClick={() => {
              setSelection([]);
              setState((current) => drawCards(current, count));
            }}
            size="sm"
            tooltip={t("draw_simulator.draw_tooltip", {
              count,
              cards: t("common.card", { count }),
            })}
          >
            {t("draw_simulator.draw_count", { count })}
          </Button>
        ))}
        <Button
          onClick={() => {
            setSelection([]);
            setState(createInitialSimulatorState(simulatorDeck, setupCode));
          }}
          size="sm"
          tooltip={t("draw_simulator.reset_tooltip")}
        >
          <Undo2Icon size="1em" />
          {t("draw_simulator.reset")}
        </Button>
        <Button
          disabled={!hasSelection}
          onClick={() => {
            setState((current) => redrawSelection(current, selectedIds));
            setSelection([]);
          }}
          size="sm"
          tooltip={t("draw_simulator.redraw_tooltip")}
        >
          {t("draw_simulator.redraw")}
        </Button>
        <Button
          disabled={!hasSelection}
          onClick={() => {
            setState((current) => reshuffleSelection(current, selectedIds));
            setSelection([]);
          }}
          size="sm"
          tooltip={t("draw_simulator.reshuffle_tooltip")}
        >
          {t("draw_simulator.reshuffle")}
        </Button>
      </nav>

      {state.inPlay && (
        <section className={css["section"]}>
          <h3>{t("draw_simulator.in_play")}</h3>
          <ol className={css["drawn"]}>
            <li>
              <CardScan card={state.inPlay.card} lazy />
            </li>
          </ol>
        </section>
      )}

      <section className={css["section"]}>
        <h3>
          {t("draw_simulator.drawn_cards", {
            count: state.hand.length,
          })}
        </h3>
        {state.hand.length > 0 ? (
          <ol className={css["drawn"]}>
            {state.hand.map(({ card, id }, index) => (
              <DrawSimulatorCard
                card={card}
                index={index}
                key={id}
                selected={selection.includes(index)}
                toggleSelection={(index) => {
                  setSelection((current) =>
                    current.includes(index)
                      ? current.filter((i) => i !== index)
                      : [...current, index],
                  );
                }}
              />
            ))}
          </ol>
        ) : (
          <p className={css["empty"]}>{t("draw_simulator.empty_hand")}</p>
        )}
      </section>
    </Plane>
  );
}

type TranslationFn = ReturnType<typeof useTranslation>["t"];

function DrawSimulatorHelp(props: { t: TranslationFn }) {
  const { t } = props;
  return (
    <>
      {t("draw_simulator.help_prefix")}
      <LingeringInjuryLink>
        {t("draw_simulator.lingering_injury")}
      </LingeringInjuryLink>
      {t("draw_simulator.help_suffix")}
    </>
  );
}

function LingeringInjuryLink(props: { children?: React.ReactNode }) {
  const card = useStore((state) => state.metadata.cards["01240"]);
  const { refs, referenceProps, isMounted, floatingStyles, transitionStyles } =
    useRestingTooltip({ delay: 350 });

  return (
    <>
      <a {...referenceProps} href="/card/01240" ref={refs.setReference}>
        {props.children}
      </a>
      {card && isMounted && (
        <PortaledCardTooltip
          card={card}
          floatingStyles={floatingStyles}
          ref={refs.setFloating}
          transitionStyles={transitionStyles}
        />
      )}
    </>
  );
}

type DrawSimulatorCardProps = {
  card: Card;
  index: number;
  selected: boolean;
  toggleSelection: (index: number) => void;
};

function DrawSimulatorCard(props: DrawSimulatorCardProps) {
  const { card, index, selected, toggleSelection } = props;

  const { refs, referenceProps, isMounted, floatingStyles, transitionStyles } =
    useRestingTooltip({ delay: 350 });

  return (
    <li className={css["card"]}>
      <button
        {...referenceProps}
        aria-pressed={selected}
        className={cx(css["card-toggle"], selected && css["selected"])}
        onClick={() => toggleSelection(index)}
        ref={refs.setReference}
        type="button"
      >
        <CardScan card={card} draggable={false} preventFlip />
      </button>
      {isMounted && (
        <PortaledCardTooltip
          card={card}
          floatingStyles={floatingStyles}
          ref={refs.setFloating}
          transitionStyles={transitionStyles}
        />
      )}
    </li>
  );
}
