import type { TFunction } from "i18next";
import { GlobeIcon, Link2Icon, LockKeyholeIcon } from "lucide-react";
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
  tag: StorageProvider | "unlisted";
  t: TFunction;
}) {
  return (
    <>
      {tag === "local" && <LockKeyholeIcon />}
      {tag === "shared" && <GlobeIcon />}
      {tag === "unlisted" && <Link2Icon />}
      <span>{t(`deck.tags.${tag === "local" ? "private" : tag}`)}</span>
    </>
  );
}

export function ProviderTag({
  deck,
}: {
  deck: Pick<ResolvedDeck, "source" | "shared" | "listed"> | undefined;
}) {
  const { t } = useTranslation();

  const shared = deck?.shared || deck?.source === "shared";
  const tag = !shared ? "local" : deck?.listed ? "shared" : "unlisted";

  return (
    <Tag as="li" size="xs">
      <ProviderTagInner tag={tag} t={t} />
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
