import type { TFunction } from "i18next";
import { LockKeyholeIcon, ShareIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ResolvedDeck } from "@/store/lib/types";
import type { StorageProvider } from "@/utils/constants";
import { capitalize } from "@/utils/formatting";
import { Tag } from "../ui/tag";
import css from "./deck-tags.module.css";

export function DeckTagsContainer({ children }: { children: React.ReactNode }) {
  return (
    <ul className={css["tags"]} data-testid="deck-tags">
      {children}
    </ul>
  );
}

export function DeckTags(props: { tags: string[] }) {
  const { tags } = props;

  return tags.map((tag, index) => (
    // biome-ignore lint/suspicious/noArrayIndexKey: order is stable.
    <Tag as="li" key={index} size="xs">
      {capitalize(tag.trim())}
    </Tag>
  ));
}

export function ProviderTagInner({
  tag,
  t,
}: {
  tag: StorageProvider;
  t: TFunction;
}) {
  return (
    <>
      {tag === "local" && <LockKeyholeIcon />}
      {tag === "shared" && <ShareIcon />}
      <span>
        {t(tag === "local" ? "deck.tags.private" : "deck.tags.shared")}
      </span>
    </>
  );
}

export function ProviderTag({
  deck,
}: {
  deck: Pick<ResolvedDeck, "source" | "shared"> | undefined;
}) {
  const { t } = useTranslation();
  const source = deck?.shared || deck?.source === "shared" ? "shared" : "local";

  return (
    <Tag as="li" size="xs">
      <ProviderTagInner tag={source} t={t} />
    </Tag>
  );
}

export function LimitedCardPoolTag(_props: {
  deck: unknown;
  omitLegacy?: boolean;
}) {
  return null;
}

export function SealedDeckTag(_props: { deck: unknown }) {
  return null;
}
