import type { Id } from "@earthborne-build/shared";
import { CircleHelp } from "lucide-react";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast.hooks";
import { useStore } from "@/store";
import { cx } from "@/utils/cx";
import css from "./sync-conflict-panel.module.css";

type Props = {
  className?: string;
  id: Id;
  type: "deck" | "campaign";
};

export function SyncConflictPanel(props: Props) {
  const { className, id, type } = props;
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const toast = useToast();

  const syncItem = useStore((state) =>
    type === "deck"
      ? state.sync.decks.items[id]
      : state.sync.campaigns.items[id],
  );

  const resolveWithRefresh = useStore((state) =>
    type === "deck"
      ? state.resolveDeckConflictWithRefresh
      : state.resolveCampaignConflictWithRefresh,
  );

  const resolveWithDiscard = useStore((state) =>
    type === "deck"
      ? state.resolveDeckConflictWithDiscard
      : state.resolveCampaignConflictWithDiscard,
  );

  const client = useStore((state) => state.apiClient);
  const [isPending, setIsPending] = useState(false);

  const conflict = syncItem?.conflict;

  const run = useCallback(async () => {
    if (!conflict) return;
    setIsPending(true);

    try {
      if (conflict.remoteVersion == null) {
        navigate("/");
        await resolveWithDiscard(id);
      } else {
        if (client) {
          await resolveWithRefresh(client, id);
        }
      }
    } catch (error) {
      toast.show({
        children: t(
          type === "deck"
            ? "deck_sync.conflict.action_error"
            : "campaign_sync.conflict.action_error",
          { error: (error as Error).message },
        ),
        variant: "error",
      });
    } finally {
      setIsPending(false);
    }
  }, [
    conflict,
    id,
    type,
    resolveWithRefresh,
    resolveWithDiscard,
    client,
    navigate,
    toast,
    t,
  ]);

  if (!conflict) return null;

  const actionLabel =
    conflict.remoteVersion == null
      ? type === "deck"
        ? "deck_sync.conflict.discard_local"
        : "campaign_sync.conflict.discard_local"
      : type === "deck"
        ? "deck_sync.conflict.refresh"
        : "campaign_sync.conflict.refresh";

  const descriptionLabel =
    conflict.remoteVersion == null
      ? type === "deck"
        ? "deck_sync.conflict.description_remote_missing"
        : "campaign_sync.conflict.description_remote_missing"
      : type === "deck"
        ? "deck_sync.conflict.description"
        : "campaign_sync.conflict.description";

  const testId =
    conflict.remoteVersion == null
      ? `${type}-conflict-discard-local`
      : `${type}-conflict-refresh`;

  const titleLabel =
    type === "deck"
      ? "deck_sync.conflict.title"
      : "campaign_sync.conflict.title";

  return (
    <section className={cx(css["panel"], className)}>
      <header className={css["header"]}>
        <CircleHelp className={css["icon"]} size={16} />
        <h3 className={css["title"]}>{t(titleLabel)}</h3>
      </header>
      <p className={css["description"]}>{t(descriptionLabel)}</p>
      {conflict.remoteVersion && (
        <p className={css["details"]}>
          {t(
            type === "deck"
              ? "deck_sync.conflict.remote_version"
              : "campaign_sync.conflict.remote_version",
            { version: conflict.remoteVersion },
          )}
        </p>
      )}
      {syncItem?.error && <p className={css["details"]}>{syncItem.error}</p>}
      <div className={css["actions"]}>
        <Button
          data-testid={testId}
          disabled={isPending}
          onClick={run}
          size="sm"
          variant="secondary"
        >
          {t(actionLabel)}
        </Button>
      </div>
    </section>
  );
}

export function SyncConflictOverlay(props: Props) {
  return (
    <div className={css["overlay"]}>
      <SyncConflictPanel
        {...props}
        className={cx(css["overlay-panel"], props.className)}
      />
    </div>
  );
}
