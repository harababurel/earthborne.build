import {
  DatabaseBackupIcon,
  LibraryIcon,
  SlidersVerticalIcon,
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
import type { ColorScheme, SettingsState } from "@/store/slices/settings.types";
import { useColorThemeManager } from "@/utils/use-color-theme";
import { useGoBack } from "@/utils/use-go-back";
import { BackupRestore } from "./backup-restore";
import { CardDataSync } from "./card-data-sync";
import { CardDisplaySettings } from "./card-display";
import { ColorSchemeSetting } from "./color-scheme";
import { DevModeSetting } from "./dev-mode";
import { FontSizeSetting } from "./font-size";
import { ListSettings } from "./list-settings";
import { LocaleSetting } from "./locale-setting";
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

  const [tab, onTabChange] = useTabUrlState("general");

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
      <form className={css["settings"]} onSubmit={onSubmit}>
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
            <Button data-testid="settings-save" type="submit" variant="primary">
              {t("settings.save")}
            </Button>
          </div>
        </header>
        <div className={css["container"]}>
          <div className={css["row"]}>
            <Section title={t("settings.card_data.title")}>
              <CardDataSync showDetails />
            </Section>
          </div>
          <Tabs value={tab} onValueChange={onTabChange}>
            <TabsList>
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
            <TabsContent value="general">
              <Section title={t("settings.display.title")}>
                <LocaleSetting settings={settings} setSettings={setSettings} />
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
                <SortPunctuationSetting
                  settings={settings}
                  setSettings={setSettings}
                />
              </Section>
              <Section title={t("settings.lists.title")}>
                <div className={css["lists"]}>
                  <ListSettings
                    listKey="player"
                    title={t("common.player_cards")}
                    settings={settings}
                    setSettings={setSettings}
                  />
                  <ListSettings
                    listKey="encounter"
                    title={t("common.encounter_cards")}
                    settings={settings}
                    setSettings={setSettings}
                  />
                  <ListSettings
                    listKey="mixed"
                    title={t("lists.all_cards")}
                    settings={settings}
                    setSettings={setSettings}
                  />
                  <ListSettings
                    listKey="investigator"
                    title={t("common.type.investigator", { count: 2 })}
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
              <Section title={t("settings.backup.title")}>
                <BackupRestore />
              </Section>
              <Section title={t("settings.developer.title")}>
                <DevModeSetting settings={settings} setSettings={setSettings} />
              </Section>
            </TabsContent>
          </Tabs>
        </div>
      </form>
    </AppLayout>
  );
}

function settingsKey(settings: SettingsState): string {
  return JSON.stringify(settings);
}

export default Settings;
