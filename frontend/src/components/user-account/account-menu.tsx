import { LogOutIcon, RefreshCw, SettingsIcon, UserIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { useLogoutMutation } from "@/queries/mutations/auth";
import { useStore } from "@/store";
import { selectAccountSyncStatus } from "@/store/selectors/sync";
import type { SyncStatus } from "@/store/slices/sync.types";
import { Button } from "../ui/button";
import {
  DropdownButton,
  DropdownItem,
  DropdownMenu,
} from "../ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { StatusBubble } from "../ui/status-bubble";
import css from "./account-menu.module.css";
import { Avatar } from "./avatar";

export function AccountMenu() {
  const { t } = useTranslation();
  const sessionInitialized = useStore((state) => state.ui.sessionInitialized);
  const session = useStore((state) => state.auth.session);
  const logoutMutation = useLogoutMutation();

  const syncStatus = useStore(selectAccountSyncStatus);
  const isSyncPending = isPendingSyncStatus(syncStatus);
  const syncAll = useStore((state) => state.syncAll);
  const client = useStore((state) => state.apiClient);

  const onSyncAccount = () => {
    if (client) {
      void syncAll(client).catch(console.error);
    }
  };

  if (!sessionInitialized) return null;

  if (!session) {
    return (
      <div className={css["login-wrapper"]}>
        <Link asChild href="~/auth/login">
          <Button
            as="a"
            data-testid="masthead-login"
            iconOnly
            tooltip={t("auth.login.action")}
            variant="bare"
          >
            <UserIcon />
          </Button>
        </Link>
        <span aria-hidden="true" className={css["login-badge"]} />
      </div>
    );
  }

  const onLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          aria-label={t("auth.menu.logged_in_as", {
            name: session.account.name,
          })}
          className={css["trigger"]}
          type="button"
        >
          <Avatar account={session.account}>
            <StatusBubble
              data-sync-status={syncStatus}
              data-testid="masthead-account-sync-status"
              variant={syncStatusToBubbleVariant(syncStatus)}
            />
          </Avatar>
        </button>
      </PopoverTrigger>
      <PopoverContent>
        <DropdownMenu>
          <DropdownItem>
            <div className={css["user-info"]}>
              <span className={css["user-label"]}>{t("auth.username")}</span>
              <span className={css["username"]}>{session.account.name}</span>
            </div>
          </DropdownItem>
          <hr />
          <Link asChild href="~/settings">
            <DropdownButton as="a" data-testid="masthead-settings-link">
              <SettingsIcon size={16} /> {t("settings.title")}
            </DropdownButton>
          </Link>
          <DropdownButton
            disabled={isSyncPending || logoutMutation.isPending}
            onClick={onSyncAccount}
            data-testid="masthead-account-sync"
          >
            <RefreshCw size={16} /> {t("auth.menu.sync_account")}
          </DropdownButton>
          {isProblemSyncStatus(syncStatus) && (
            <DropdownItem>
              <p className={css["sync-status"]}>
                {t(`auth.menu.sync_status.${syncStatus}`)}
              </p>
            </DropdownItem>
          )}
          <hr />
          <DropdownButton
            disabled={logoutMutation.isPending}
            onClick={onLogout}
            data-testid="masthead-logout"
          >
            <LogOutIcon size={16} /> {t("auth.logout")}
          </DropdownButton>
        </DropdownMenu>
      </PopoverContent>
    </Popover>
  );
}

function isPendingSyncStatus(status: SyncStatus) {
  return status === "loading" || status === "saving";
}

function isProblemSyncStatus(status: SyncStatus) {
  return status === "conflict" || status === "error" || status === "partial";
}

function syncStatusToBubbleVariant(
  status: SyncStatus,
): React.ComponentProps<typeof StatusBubble>["variant"] {
  switch (status) {
    case "conflict":
    case "partial":
      return "warning";
    case "error":
      return "error";
    case "loading":
    case "saving":
      return "loading";
    case "idle":
    case "synced":
      return "success";
  }
}
