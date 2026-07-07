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

type Resolution = "push" | "refresh" | "discard";

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

  const resolveWithPush = useStore((state) =>
    type === "deck"
      ? state.resolveDeckConflictWithPush
      : state.resolveCampaignConflictWithPush,
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

  const run = useCallback(
    async (resolution: Resolution) => {
      if (!conflict) return;
      setIsPending(true);

      try {
        if (resolution === "discard") {
          navigate("/");
          await resolveWithDiscard(id);
        } else if (client) {
          if (resolution === "push") {
            await resolveWithPush(client, id);
          } else {
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
    },
    [
      conflict,
      id,
      type,
      resolveWithPush,
      resolveWithRefresh,
      resolveWithDiscard,
      client,
      navigate,
      toast,
      t,
    ],
  );

  if (!conflict) return null;

  const prefix = type === "deck" ? "deck_sync" : "campaign_sync";
  const remoteMissing = conflict.remoteVersion == null;

  return (
    <section className={cx(css["panel"], className)}>
      <header className={css["header"]}>
        <CircleHelp className={css["icon"]} size={16} />
        <h3 className={css["title"]}>{t(`${prefix}.conflict.title`)}</h3>
      </header>
      <p className={css["description"]}>
        {t(
          remoteMissing
            ? `${prefix}.conflict.description_remote_missing`
            : `${prefix}.conflict.description`,
        )}
      </p>
      {conflict.remoteVersion && (
        <p className={css["details"]}>
          {t(`${prefix}.conflict.remote_version`, {
            version: conflict.remoteVersion,
          })}
        </p>
      )}
      {syncItem?.error && <p className={css["details"]}>{syncItem.error}</p>}
      <div className={css["actions"]}>
        {remoteMissing ? (
          <Button
            data-testid={`${type}-conflict-discard-local`}
            disabled={isPending}
            onClick={() => run("discard")}
            size="sm"
            variant="secondary"
          >
            {t(`${prefix}.conflict.discard_local`)}
          </Button>
        ) : (
          <>
            <Button
              data-testid={`${type}-conflict-keep-local`}
              disabled={isPending}
              onClick={() => run("push")}
              size="sm"
              variant="secondary"
            >
              {t(`${prefix}.conflict.keep_local`)}
            </Button>
            <Button
              data-testid={`${type}-conflict-refresh`}
              disabled={isPending}
              onClick={() => run("refresh")}
              size="sm"
              variant="secondary"
            >
              {t(`${prefix}.conflict.refresh`)}
            </Button>
          </>
        )}
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
