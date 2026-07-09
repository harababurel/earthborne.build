import {
  CheckIcon,
  ClipboardCopyIcon,
  LinkIcon,
  TrashIcon,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { useStore } from "@/store";
import {
  buildDeckShareModel,
  formatDeckShareMarkdown,
  formatDeckShareText,
  hasDisplacedCards,
  hasUnlockedRewards,
} from "@/store/lib/deck-share";
import type { ResolvedDeck } from "@/store/lib/types";
import { selectMetadata } from "@/store/selectors/shared";
import { useAccentColor } from "@/utils/use-accent-color";
import { useCopyToClipboard } from "@/utils/use-copy-to-clipboard";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import {
  DefaultModalContent,
  Modal,
  ModalActions,
  ModalBackdrop,
  ModalInner,
} from "../ui/modal";
import { useToast } from "../ui/toast.hooks";
import css from "./deck-share-modal.module.css";

type Props = {
  deck: ResolvedDeck;
};

export function DeckShareModal({ deck }: Props) {
  const { t } = useTranslation();
  const metadata = useStore(selectMetadata);
  const accentColor = useAccentColor(metadata.cards[deck.role_code]);

  const [includeRewards, setIncludeRewards] = useState(false);
  const [includeDisplaced, setIncludeDisplaced] = useState(false);
  const [markdown, setMarkdown] = useState(false);

  const rewardsAvailable = useMemo(
    () => hasUnlockedRewards(deck, metadata),
    [deck, metadata],
  );
  const displacedAvailable = useMemo(() => hasDisplacedCards(deck), [deck]);

  const output = useMemo(() => {
    const model = buildDeckShareModel(deck, metadata, t, {
      includeRewards,
      includeDisplaced,
    });
    return markdown
      ? formatDeckShareMarkdown(model)
      : formatDeckShareText(model);
  }, [deck, metadata, t, includeRewards, includeDisplaced, markdown]);

  return (
    <Modal style={accentColor}>
      <ModalBackdrop />
      <ModalInner size="45rem">
        <ModalActions />
        <DefaultModalContent title={t("deck_share.title")}>
          <PublicShareControls deck={deck} />
          <div className={css["options"]}>
            <Checkbox
              checked={includeRewards}
              data-testid="share-include-rewards"
              disabled={!rewardsAvailable}
              label={t("deck_share.include_rewards")}
              onCheckedChange={setIncludeRewards}
            />
            <Checkbox
              checked={includeDisplaced}
              data-testid="share-include-displaced"
              disabled={!displacedAvailable}
              label={t("deck_share.include_displaced")}
              onCheckedChange={setIncludeDisplaced}
            />
            <Checkbox
              checked={markdown}
              data-testid="share-markdown"
              label={t("deck_share.markdown")}
              onCheckedChange={setMarkdown}
            />
          </div>
          <ShareText text={output} />
        </DefaultModalContent>
      </ModalInner>
    </Modal>
  );
}

function PublicShareControls({ deck }: Props) {
  const { t } = useTranslation();
  const toast = useToast();
  const createShare = useStore((state) => state.createShare);
  const deleteShare = useStore((state) => state.deleteShare);
  const setShareListed = useStore((state) => state.setShareListed);
  const isShared = useStore((state) => !!state.sharing.decks[deck.id]);
  const listed = useStore((state) => state.sharing.listed[deck.id] ?? false);
  const [loading, setLoading] = useState(false);

  const shareUrl = `${window.location.origin}/share/${deck.id}`;

  const onCreateShare = useCallback(
    async (nextListed = false) => {
      setLoading(true);

      try {
        await createShare(String(deck.id), nextListed);
      } catch (err) {
        toast.show({
          children: t("deck_view.sharing.create_failed", {
            error: (err as Error)?.message,
          }),
          variant: "error",
        });
      } finally {
        setLoading(false);
      }
    },
    [createShare, deck.id, toast, t],
  );

  const onDeleteShare = useCallback(async () => {
    setLoading(true);

    try {
      await deleteShare(String(deck.id));
    } catch (err) {
      toast.show({
        children: t("deck_view.sharing.delete_failed", {
          error: (err as Error)?.message,
        }),
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [deleteShare, deck.id, toast, t]);

  const onChangeListed = useCallback(
    async (checked: boolean) => {
      setLoading(true);

      try {
        if (isShared) {
          await setShareListed(String(deck.id), checked);
        } else {
          await createShare(String(deck.id), checked);
        }
      } catch (err) {
        toast.show({
          children: t("deck_view.sharing.update_failed", {
            error: (err as Error)?.message,
          }),
          variant: "error",
        });
      } finally {
        setLoading(false);
      }
    },
    [createShare, deck.id, isShared, setShareListed, toast, t],
  );

  return (
    <section className={css["public-share"]}>
      <h3>{t("deck_view.sharing.title")}</h3>
      <p>
        <Trans
          i18nKey={
            isShared
              ? "deck_view.sharing.description_present"
              : "deck_view.sharing.create_tooltip"
          }
          components={{
            a: (
              <a
                href={shareUrl}
                rel="noreferrer"
                target="_blank"
                aria-label={t("deck_view.sharing.title")}
              >
                {t("deck_view.sharing.open")}
              </a>
            ),
            br: <br />,
          }}
        />
      </p>
      <div className={css["public-share-actions"]}>
        {isShared ? (
          <Button as="a" href={shareUrl} size="sm" target="_blank">
            <LinkIcon />
            {t("deck_view.sharing.open")}
          </Button>
        ) : (
          <Button
            disabled={loading}
            onClick={() => onCreateShare(false)}
            size="sm"
            variant="primary"
          >
            <LinkIcon />
            {t("deck_view.sharing.create")}
          </Button>
        )}
        {isShared && (
          <Button
            disabled={loading}
            onClick={onDeleteShare}
            size="sm"
            variant="bare"
          >
            <TrashIcon />
            {t("deck_view.sharing.delete")}
          </Button>
        )}
      </div>
      <Checkbox
        checked={isShared && listed}
        disabled={loading}
        label={t("deck_view.sharing.listed_label")}
        onCheckedChange={onChangeListed}
      />
      <p className={css["public-share-help"]}>
        {t("deck_view.sharing.listed_help")}
      </p>
    </section>
  );
}

function ShareText({ text }: { text: string }) {
  const { t } = useTranslation();
  const { copyToClipboard, isCopied } = useCopyToClipboard();

  const onCopy = useCallback(() => {
    copyToClipboard(text);
  }, [copyToClipboard, text]);

  return (
    <div className={css["share"]}>
      <div className={css["actions"]}>
        <Button onClick={onCopy} size="sm" variant="primary">
          {isCopied ? <CheckIcon /> : <ClipboardCopyIcon />}
          {isCopied ? t("ui.copy_to_clipboard_success") : t("deck_share.copy")}
        </Button>
      </div>
      <pre className={css["output"]} data-testid="deck-share-output">
        {text}
      </pre>
    </div>
  );
}
