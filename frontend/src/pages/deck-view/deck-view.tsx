import type { Id } from "@earthborne-build/shared";
import { useCallback, useEffect } from "react";
import { useLocation, useParams } from "wouter";
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
import { ErrorStatus } from "../errors/404";
import { ShareInner } from "../share/share";

function DeckView() {
  const { id, type } = useParams<{ id: string; type?: string }>();
  const [pathname] = useLocation();

  const setActiveList = useStore((state) => state.setActiveList);
  const hasDeck = useStore((state) => !!state.data.decks[id]);
  const isEditRoute = pathname.startsWith("/deck/edit/");

  useEffect(() => {
    // TECH DEBT: This should be handled by the views that mount a list.
    //            Requires persisting list state to the URL.
    setActiveList(undefined);
  }, [setActiveList]);

  if (hasDeck && (type === "deck" || isEditRoute)) {
    return <LocalDeckView id={id} isEditing={isEditRoute} />;
  }

  if (isEditRoute) {
    return <ErrorStatus statusCode={404} />;
  }

  return <ShareInner id={id} />;
}

function LocalDeckView({ id, isEditing }: { id: Id; isEditing: boolean }) {
  const history: History = [];
  const [, navigate] = useLocation();

  const resolvedDeck = useStore((state) =>
    selectResolvedDeckById(state, id, isEditing),
  );
  const createEdit = useStore((state) => state.createEdit);
  const discardEdits = useStore((state) => state.discardEdits);
  const hasEdit = useStore((state) => !!state.deckEdits[id]);
  const saveDeck = useStore((state) => state.saveDeck);

  useEffect(() => {
    if (isEditing && !hasEdit) createEdit(id, {});
  }, [createEdit, hasEdit, id, isEditing]);

  const startEditing = useCallback(() => {
    if (!hasEdit) createEdit(id, {});
    navigate(`/deck/edit/${id}`);
  }, [createEdit, hasEdit, id, navigate]);

  const saveEditing = useCallback(async () => {
    await saveDeck(id);
    navigate(`/deck/view/${id}`, { replace: true });
  }, [id, navigate, saveDeck]);

  const discardEditing = useCallback(() => {
    discardEdits(id);
    navigate(`/deck/view/${id}`, { replace: true });
  }, [discardEdits, id, navigate]);

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
