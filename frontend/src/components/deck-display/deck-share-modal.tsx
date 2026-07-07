import { CheckIcon, ClipboardCopyIcon } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
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
