import { LogOutIcon, SettingsIcon, UserIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { useLogoutMutation } from "@/queries/mutations/auth";
import { useStore } from "@/store";
import { useHttpClient } from "@/store/services/http-client.context";
import { Button } from "../ui/button";
import {
  DropdownButton,
  DropdownItem,
  DropdownMenu,
} from "../ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import css from "./account-menu.module.css";
import { Avatar } from "./avatar";

export function AccountMenu() {
  const { t } = useTranslation();
  const _client = useHttpClient();
  const sessionInitialized = useStore((state) => state.ui.sessionInitialized);
  const session = useStore((state) => state.auth.session);
  const logoutMutation = useLogoutMutation();

  if (!sessionInitialized) return null;

  if (!session) {
    return (
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
          <Avatar account={session.account} />
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
