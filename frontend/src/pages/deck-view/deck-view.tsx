import type { Id } from "@earthborne-build/shared";
import { useCallback, useEffect, useState } from "react";
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
  const [isEditing, setIsEditing] = useState(false);

  const resolvedDeck = useStore((state) =>
    selectResolvedDeckById(state, id, isEditing),
  );
  const createEdit = useStore((state) => state.createEdit);
  const discardEdits = useStore((state) => state.discardEdits);
  const hasEdit = useStore((state) => !!state.deckEdits[id]);
  const saveDeck = useStore((state) => state.saveDeck);

  const startEditing = useCallback(() => {
    if (!hasEdit) createEdit(id, {});
    setIsEditing(true);
  }, [createEdit, hasEdit, id]);

  const saveEditing = useCallback(async () => {
    await saveDeck(id);
    setIsEditing(false);
  }, [id, saveDeck]);

  const discardEditing = useCallback(() => {
    discardEdits(id);
    setIsEditing(false);
  }, [discardEdits, id]);

  if (!resolvedDeck) return null;

  return (
    <DeckViewInner
      canEdit={isEditing}
      deck={resolvedDeck}
      history={history}
      onDiscardEdit={discardEditing}
      onSaveEdit={saveEditing}
      onStartEdit={startEditing}
      origin="local"
    />
  );
}

function DeckViewInner({
  canEdit,
  origin,
  deck,
  headerSlot,
  history,
  onDiscardEdit,
  onSaveEdit,
  onStartEdit,
  type,
}: Omit<DeckDisplayProps, "validation">) {
  const validation = useStore((state) => selectDeckValid(state, deck));

  return (
    <ResolvedDeckProvider canEdit={canEdit} resolvedDeck={deck}>
      <CardModalProvider>
        <DeckDisplay
          canEdit={canEdit}
          key={deck.id}
          origin={origin}
          deck={deck}
          headerSlot={headerSlot}
          history={history}
          onDiscardEdit={onDiscardEdit}
          onSaveEdit={onSaveEdit}
          onStartEdit={onStartEdit}
          validation={validation}
          type={type}
        />
      </CardModalProvider>
    </ResolvedDeckProvider>
  );
}

export default DeckView;
