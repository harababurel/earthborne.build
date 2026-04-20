import { BarChart3Icon, ExternalLinkIcon } from "lucide-react";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import PackIcon from "@/components/icons/pack-icon";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { useStore } from "@/store";
import type { SettingsState } from "@/store/slices/settings.types";
import { displayPackName } from "@/utils/formatting";
import { Button } from "../ui/button";
import { MediaCard } from "../ui/media-card";
import css from "./collection.module.css";

type Props = {
  canShowCounts?: boolean;
  settings: SettingsState;
  setSettings?: (settings: React.SetStateAction<SettingsState>) => void;
};

type CollectionGroup = {
  id: string;
  titleKey: string;
  packCodes: string[];
};

const BGG_LINKS: Record<string, string> = {
  ebr: "https://boardgamegeek.com/boardgame/342900/earthborne-rangers",
  loa: "https://boardgamegeek.com/boardgame/354291/earthborne-rangers-legacy-of-the-ancestors",
  sib: "https://boardgamegeek.com/boardgame/457239/earthborne-rangers-spire-in-bloom-valley-expansion",
  sos: "https://boardgamegeek.com/boardgameexpansion/466595/earthborne-rangers-shadow-of-the-storm-expansion",
  sotv: "https://boardgamegeek.com/boardgame/400328/earthborne-rangers-stewards-of-the-valley",
  motp: "https://boardgamegeek.com/boardgameexpansion/412737/earthborne-rangers-moments-on-the-path",
  mitv: "https://boardgamegeek.com/boardgame/457240/earthborne-rangers-moments-in-the-valley",
};

const FALLBACK_PACK_NAMES: Record<string, string> = {
  ebr: "Earthborne Rangers",
  loa: "Legacy of the Ancestors",
  sib: "Spire in Bloom",
  sos: "Shadow of the Storm",
  sotv: "Stewards of the Valley",
  motp: "Moments on the Path",
  mitv: "Moments in the Valley",
};

// Temporarily hide unreleased/repeat expansions until they are fully available
const TEMPORARILY_HIDDEN_PACKS = new Set(["itm", "sas", "rcd"]);

const COLLECTION_GROUPS: CollectionGroup[] = [
  {
    id: "core",
    titleKey: "settings.collection.groups.core",
    packCodes: ["ebr"],
  },
  {
    id: "campaign",
    titleKey: "settings.collection.groups.campaign",
    packCodes: ["loa"],
  },
  {
    id: "valley",
    titleKey: "settings.collection.groups.valley",
    packCodes: ["sib", "sos", "itm", "sas"],
  },
  {
    id: "player",
    titleKey: "settings.collection.groups.player",
    packCodes: ["rcd", "sotv"],
  },
  {
    id: "path",
    titleKey: "settings.collection.groups.path",
    packCodes: ["motp", "mitv"],
  },
];

export function CollectionSettings(props: Props) {
  const { canShowCounts, settings, setSettings } = props;

  const { t } = useTranslation();
  const metadata = useStore((state) => state.metadata);

  const canEdit = !!setSettings;

  const onCheckPack = useCallback(
    (packCode: string, val: boolean) => {
      setSettings?.((prev) => ({
        ...prev,
        collection: {
          ...prev.collection,
          [packCode]: val,
        },
      }));
    },
    [setSettings],
  );

  const assignedPackCodes = new Set(
    COLLECTION_GROUPS.flatMap((g) => g.packCodes),
  );
  const otherPacks = Object.values(metadata.packs).filter(
    (p) =>
      !assignedPackCodes.has(p.code) && !TEMPORARILY_HIDDEN_PACKS.has(p.code),
  );

  const groupsToRender = [...COLLECTION_GROUPS];
  if (otherPacks.length > 0) {
    groupsToRender.push({
      id: "other",
      titleKey: "settings.collection.groups.other",
      packCodes: otherPacks.map((p) => p.code),
    });
  }

  const packsWithBanners = new Set([
    "ebr",
    "loa",
    "sib",
    "sos",
    "sotv",
    "motp",
    "mitv",
  ]);

  return (
    <Field bordered>
      <FieldLabel className={css["collection-label"]} htmlFor="collection">
        <strong>{t("settings.collection.card_collection")}</strong>
        {!canShowCounts && (
          <Link asChild href="~/collection-stats">
            <Button as="a" variant="bare">
              <BarChart3Icon /> {t("collection_stats.title")}
            </Button>
          </Link>
        )}
      </FieldLabel>
      <fieldset
        className={css["container"]}
        data-testid="settings-collection"
        name="collection"
        id="collection"
      >
        {groupsToRender.map((group) => {
          const packs = group.packCodes
            .filter((code) => !TEMPORARILY_HIDDEN_PACKS.has(code))
            .map((code) => {
              if (metadata.packs[code]) return metadata.packs[code];

              // Provide a fallback pack so expansions display even if card data isn't ingested yet
              return {
                code,
                cycle_code: code,
                name: FALLBACK_PACK_NAMES[code] || code,
                real_name: FALLBACK_PACK_NAMES[code] || code,
                position: 999,
                official: true,
              } as Pack;
            })
            .filter(Boolean);

          if (packs.length === 0) return null;

          return (
            <div className={css["chapter"]} key={group.id}>
              <div className={css["chapter-header"]}>
                <h3 className={css["chapter-title"]}>{t(group.titleKey)}</h3>
              </div>
              <div className={css["cycles"]}>
                {packs.map((pack) => (
                  <MediaCard
                    key={pack.code}
                    bannerAlt={`${displayPackName(pack)} backdrop`}
                    bannerUrl={
                      packsWithBanners.has(pack.code)
                        ? `/assets/cycles/${pack.code}.avif`
                        : undefined
                    }
                    bannerMobileUrl={
                      pack.code === "sos" || pack.code === "sotv"
                        ? `/assets/cycles/${pack.code}_mobile.avif`
                        : undefined
                    }
                    htmlFor={
                      canEdit ? `collection-pack-${pack.code}` : undefined
                    }
                    title={
                      <label
                        htmlFor={`collection-pack-${pack.code}`}
                        className={css["cycle-header-container"]}
                        style={{
                          alignItems: "center",
                          justifyContent: "flex-start",
                          gap: "0.75rem",
                          cursor: canEdit ? "pointer" : "default",
                        }}
                      >
                        <Checkbox
                          disabled={!canEdit}
                          checked={!!settings.collection[pack.code]}
                          id={`collection-pack-${pack.code}`}
                          name={pack.code}
                          label={t("settings.collection.owned")}
                          hideLabel={true}
                          aria-label={`Toggle ownership of ${displayPackName(pack)}`}
                          onCheckedChange={(checked) =>
                            onCheckPack(pack.code, !!checked)
                          }
                        />
                        <div
                          className={css["cycle-label"]}
                          style={{ width: "auto", flex: "1 1 auto" }}
                        >
                          <PackIcon code={pack.code} />
                          {displayPackName(pack)}
                        </div>
                      </label>
                    }
                  >
                    <div
                      style={{
                        padding: "0.5rem 1rem",
                        borderTop: "1px solid var(--border-subtle)",
                      }}
                    >
                      {BGG_LINKS[pack.code] && (
                        <a
                          href={BGG_LINKS[pack.code]}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            color: "var(--text-secondary)",
                            fontSize: "var(--text-sm)",
                            textDecoration: "none",
                            width: "fit-content",
                          }}
                        >
                          <ExternalLinkIcon size={16} /> View on BoardGameGeek
                        </a>
                      )}
                    </div>
                  </MediaCard>
                ))}
              </div>
            </div>
          );
        })}
      </fieldset>
    </Field>
  );
}
