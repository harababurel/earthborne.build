import {
  DatabaseBackupIcon,
  LibraryIcon,
  RefreshCw,
  SlidersVerticalIcon,
  UserIcon,
} from "lucide-react";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearch } from "wouter";
import { CollectionSettings } from "@/components/collection/collection";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTabUrlState } from "@/components/ui/tabs.hooks";
import { useToast } from "@/components/ui/toast.hooks";
import { AppLayout } from "@/layouts/app-layout";
import { useStore } from "@/store";
import {
  selectAccountSyncStatus,
  selectOrphanedConflicts,
} from "@/store/selectors/sync";
import type { ColorScheme, SettingsState } from "@/store/slices/settings.types";
import { useColorThemeManager } from "@/utils/use-color-theme";
import { useGoBack } from "@/utils/use-go-back";
import { AccountSettings } from "./account-settings";
import { AppBuild } from "./app-build";
import { BackupRestore } from "./backup-restore";
import { CardDataSync } from "./card-data-sync";
import { CardDisplaySettings } from "./card-display";
import { ColorSchemeSetting } from "./color-scheme";
import { DevModeSetting } from "./dev-mode";
import { FontSizeSetting } from "./font-size";
import { ListSettings } from "./list-settings";
import { LocaleSetting } from "./locale-setting";
import { MiniRoleArtSetting } from "./mini-role-art-setting";
import { Section } from "./section";
import css from "./settings.module.css";
import { ShowAllCardsSetting } from "./show-all-cards";
import { SortPunctuationSetting } from "./sort-punctuation-setting";
import { ThemeSetting } from "./theme";

function Settings() {
  const settings = useStore((state) => state.settings);
  const applySettings = useStore((state) => state.applySettings);

  const colorThemeManager = useColorThemeManager();

  return (
    <SettingsInner
      colorTheme={colorThemeManager.theme}
      colorScheme={colorThemeManager.colorScheme as ColorScheme}
      key={`${settingsKey(settings)}-${colorThemeManager.theme}-${colorThemeManager.colorScheme}`}
      settings={settings}
      updateColorTheme={colorThemeManager.update}
      updateSettings={applySettings}
    />
  );
}

function SettingsInner({
  colorTheme: persistedColorTheme,
  colorScheme: persistedColorScheme,
  settings: persistedSettings,
  updateColorTheme,
  updateSettings,
}: {
  colorTheme: string;
  colorScheme: ColorScheme;
  settings: SettingsState;
  updateColorTheme: (theme: string, scheme: string) => void;
  updateSettings: (settings: SettingsState) => Promise<void>;
}) {
  const { t } = useTranslation();

  const [tab, onTabChange] = useTabUrlState<
    "account" | "general" | "collection" | "backup"
  >("general");
  const session = useStore((state) => state.auth.session);

  const search = useSearch();
  const toast = useToast();
  const goBack = useGoBack(search.includes("login_state") ? "/" : undefined);
  const [settings, setSettings] = useState(structuredClone(persistedSettings));
  const [theme, setTheme] = useState<string>(persistedColorTheme);
  const [colorScheme, setColorScheme] =
    useState<ColorScheme>(persistedColorScheme);
  const onSubmit = useCallback(
    async (evt: React.FormEvent) => {
      evt.preventDefault();

      const toastId = toast.show({
        children: t("settings.saving"),
        variant: "loading",
      });

      try {
        await updateSettings({ ...settings, colorScheme: colorScheme });
        updateColorTheme(theme, colorScheme);
        toast.dismiss(toastId);
      } catch (err) {
        toast.dismiss(toastId);
        toast.show({
          children: t("settings.error", { error: (err as Error).message }),
          variant: "error",
        });
      }
    },
    [updateSettings, settings, toast, t, theme, colorScheme, updateColorTheme],
  );

  return (
    <AppLayout title={t("settings.title")} mainClassName={css["main"]}>
      <div className={css["settings"]}>
        <header className={css["header"]}>
          <h1 className={css["title"]}>{t("settings.title")}</h1>

          <div id="settings-header-portal" />

          <div className={css["header-actions"]}>
            <Button
              data-testid="settings-back"
              onClick={goBack}
              type="button"
              variant="bare"
            >
              {t("common.back")}
            </Button>
            {tab !== "account" && (
              <Button
                data-testid="settings-save"
                form="settings-form"
                type="submit"
                variant="primary"
              >
                {t("settings.save")}
              </Button>
            )}
          </div>
        </header>
        <div className={css["container"]}>
          <div className={css["row"]}>
            <Section title={t("settings.card_data.title")}>
              <CardDataSync showDetails />
            </Section>
            <Section title={t("settings.app.title")}>
              <AppBuild />
            </Section>
          </div>
          <Tabs value={tab} onValueChange={onTabChange}>
            <TabsList>
              {session && (
                <TabsTrigger data-testid="tab-account" value="account">
                  <UserIcon />
                  <span>{t("settings.account.title")}</span>
                </TabsTrigger>
              )}
              <TabsTrigger data-testid="tab-general" value="general">
                <SlidersVerticalIcon />
                <span>{t("settings.general.title")}</span>
              </TabsTrigger>
              <TabsTrigger data-testid="tab-collection" value="collection">
                <LibraryIcon />
                <span>{t("settings.collection.title")}</span>
              </TabsTrigger>
              <TabsTrigger data-testid="tab-backup" value="backup">
                <DatabaseBackupIcon />
                <span>{t("settings.backup.title")}</span>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="account">
              <AccountSettings
                key={session?.account.name ?? ""}
                session={session}
              />
            </TabsContent>
            <form id="settings-form" onSubmit={onSubmit}>
              <TabsContent value="general">
                <Section title={t("settings.display.title")}>
                  <LocaleSetting
                    settings={settings}
                    setSettings={setSettings}
                  />
                  <ThemeSetting setTheme={setTheme} theme={theme} />
                  <ColorSchemeSetting
                    colorScheme={colorScheme}
                    setColorScheme={(val: string) =>
                      setColorScheme(val as ColorScheme)
                    }
                  />
                  <FontSizeSetting
                    settings={settings}
                    setSettings={setSettings}
                  />
                  <CardDisplaySettings
                    settings={settings}
                    setSettings={setSettings}
                  />
                  <MiniRoleArtSetting
                    settings={settings}
                    setSettings={setSettings}
                  />
                  <SortPunctuationSetting
                    settings={settings}
                    setSettings={setSettings}
                  />
                </Section>
                <Section title={t("settings.lists.title")}>
                  <div className={css["lists"]}>
                    <ListSettings
                      listKey="player"
                      title={t("settings.lists.ranger_cards", {
                        defaultValue: "Ranger cards",
                      })}
                      settings={settings}
                      setSettings={setSettings}
                    />
                    <ListSettings
                      listKey="path"
                      title={t("settings.lists.path_cards", {
                        defaultValue: "Path cards",
                      })}
                      settings={settings}
                      setSettings={setSettings}
                    />
                    <ListSettings
                      listKey="all"
                      title={t("settings.lists.other_cards")}
                      settings={settings}
                      setSettings={setSettings}
                    />
                    <ListSettings
                      listKey="deck"
                      title={t("settings.lists.deck_view")}
                      settings={settings}
                      setSettings={setSettings}
                    />
                    <ListSettings
                      listKey="deckScans"
                      title={t("settings.lists.deck_view_scans")}
                      settings={settings}
                      setSettings={setSettings}
                    />
                  </div>
                </Section>
              </TabsContent>
              <TabsContent value="collection">
                <Section title={t("settings.collection.title")}>
                  <ShowAllCardsSetting
                    settings={settings}
                    setSettings={setSettings}
                  />
                  <CollectionSettings
                    settings={settings}
                    setSettings={setSettings}
                  />
                </Section>
              </TabsContent>
              <TabsContent value="backup">
                {session && (
                  <Section title={t("settings.account.sync.title")}>
                    <AccountSyncSection />
                  </Section>
                )}
                <Section title={t("settings.backup.title")}>
                  <BackupRestore />
                </Section>
                <Section title={t("settings.developer.title")}>
                  <DevModeSetting
                    settings={settings}
                    setSettings={setSettings}
                  />
                </Section>
              </TabsContent>
            </form>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  );
}

function settingsKey(settings: SettingsState): string {
  return JSON.stringify(settings);
}

function AccountSyncSection() {
  const { t } = useTranslation();
  const toast = useToast();

  const syncStatus = useStore(selectAccountSyncStatus);
  const isSyncPending = syncStatus === "loading" || syncStatus === "saving";
  const syncAll = useStore((state) => state.syncAll);
  const client = useStore((state) => state.apiClient);

  const onSync = useCallback(async () => {
    if (!client) return;
    const toastId = toast.show({
      children: t("auth.menu.syncing"),
      variant: "loading",
    });
    try {
      await syncAll(client);
      toast.dismiss(toastId);
      toast.show({
        children: t("auth.menu.sync_status.synced"),
        variant: "success",
      });
    } catch (err) {
      toast.dismiss(toastId);
      toast.show({
        children: t("auth.menu.sync_error", { error: (err as Error).message }),
        variant: "error",
      });
    }
  }, [client, syncAll, toast, t]);

  return (
    <div className={css["account-sync"]}>
      <p className={css["sync-info"]}>
        {t("settings.account.sync.description")}
      </p>
      <div className={css["sync-status-row"]}>
        <span>
          {t("settings.account.sync.status_label")}{" "}
          <strong>{t(`auth.menu.sync_status.${syncStatus}`)}</strong>
        </span>
        <Button
          data-testid="settings-account-sync-now"
          disabled={isSyncPending}
          onClick={onSync}
          size="sm"
          variant="secondary"
        >
          <RefreshCw
            size={14}
            className={isSyncPending ? css["spin"] : undefined}
          />
          {t("settings.account.sync.button")}
        </Button>
      </div>
      <OrphanedConflictsList />
    </div>
  );
}

function OrphanedConflictsList() {
  const { t } = useTranslation();
  const toast = useToast();

  const conflicts = useStore(selectOrphanedConflicts);
  const client = useStore((state) => state.apiClient);
  const resolveDeckConflictWithRefresh = useStore(
    (state) => state.resolveDeckConflictWithRefresh,
  );
  const resolveCampaignConflictWithRefresh = useStore(
    (state) => state.resolveCampaignConflictWithRefresh,
  );
  const pushDeckDeletion = useStore((state) => state.pushDeckDeletion);
  const pushCampaignDeletion = useStore((state) => state.pushCampaignDeletion);

  const [isPending, setIsPending] = useState(false);

  const run = useCallback(
    async (action: () => Promise<unknown>) => {
      setIsPending(true);
      try {
        await action();
      } catch (err) {
        toast.show({
          children: t("auth.menu.sync_error", {
            error: (err as Error).message,
          }),
          variant: "error",
        });
      } finally {
        setIsPending(false);
      }
    },
    [toast, t],
  );

  if (!client) return null;
  if (!conflicts.decks.length && !conflicts.campaigns.length) return null;

  const rows = [
    ...conflicts.decks.map((id) => ({
      id: `deck-${id}`,
      label: t("settings.account.sync.conflict_deck_label", { id }),
      restore: () => resolveDeckConflictWithRefresh(client, id),
      deleteRemote: () => {
        const conflict = useStore.getState().sync.decks.items[id]?.conflict;
        return pushDeckDeletion(client, id, conflict?.remoteVersion ?? null);
      },
    })),
    ...conflicts.campaigns.map((id) => ({
      id: `campaign-${id}`,
      label: t("settings.account.sync.conflict_campaign_label", { id }),
      restore: () => resolveCampaignConflictWithRefresh(client, id),
      deleteRemote: () => {
        const conflict = useStore.getState().sync.campaigns.items[id]?.conflict;
        return pushCampaignDeletion(
          client,
          id,
          conflict?.remoteVersion ?? null,
        );
      },
    })),
  ];

  return (
    <div className={css["sync-conflicts"]} data-testid="sync-conflicts">
      <h4 className={css["sync-conflicts-title"]}>
        {t("settings.account.sync.conflicts_title")}
      </h4>
      <p className={css["sync-info"]}>
        {t("settings.account.sync.conflicts_description")}
      </p>
      {rows.map((row) => (
        <div className={css["sync-conflict-row"]} key={row.id}>
          <span>{row.label}</span>
          <div className={css["sync-conflict-actions"]}>
            <Button
              disabled={isPending}
              onClick={() => run(row.restore)}
              size="sm"
              variant="secondary"
            >
              {t("settings.account.sync.conflict_restore")}
            </Button>
            <Button
              disabled={isPending}
              onClick={() => run(row.deleteRemote)}
              size="sm"
              variant="secondary"
            >
              {t("settings.account.sync.conflict_delete_remote")}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default Settings;
