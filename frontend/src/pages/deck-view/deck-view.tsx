import type { Id } from "@arkham-build/shared";
import { useEffect } from "react";
import { useParams } from "wouter";
import { CardModalProvider } from "@/components/card-modal/card-modal-provider";
import {
  DeckDisplay,
  type DeckDisplayProps,
} from "@/components/deck-display/deck-display";
import { ResolvedDeckProvider } from "@/components/resolved-deck-context-provider";
import { useStore } from "@/store";
import {
  type History,
  selectDeckValid,
  selectResolvedDeckById,
} from "@/store/selectors/decks";
import { ShareInner } from "../share/share";

function DeckView() {
  const { id, type } = useParams<{ id: string; type: string }>();

  const setActiveList = useStore((state) => state.setActiveList);
  const hasDeck = useStore((state) => !!state.data.decks[id]);

  useEffect(() => {
    // TECH DEBT: This should be handled by the views that mount a list.
    //            Requires persisting list state to the URL.
    setActiveList(undefined);
  });

  if (hasDeck && type === "deck") {
    return <LocalDeckView id={id} />;
  }

  return <ShareInner id={id} />;
}

function LocalDeckView({ id }: { id: Id }) {
  const history: History = [];

  const resolvedDeck = useStore((state) =>
    selectResolvedDeckById(state, id, false),
  );
  if (!resolvedDeck) return null;

  return <DeckViewInner origin="local" deck={resolvedDeck} history={history} />;
}

function DeckViewInner({
  origin,
  deck,
  headerSlot,
  history,
  type,
}: Omit<DeckDisplayProps, "validation">) {
  const validation = useStore((state) => selectDeckValid(state, deck));

  return (
    <ResolvedDeckProvider resolvedDeck={deck}>
      <CardModalProvider>
        <DeckDisplay
          key={deck.id}
          origin={origin}
          deck={deck}
          headerSlot={headerSlot}
          history={history}
          validation={validation}
          type={type}
        />
      </CardModalProvider>
    </ResolvedDeckProvider>
  );
}

export default DeckView;
