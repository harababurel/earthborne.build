import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useColorThemeManager } from "@/utils/use-color-theme";
import { ToggleGroup, ToggleGroupItem } from "./ui/toggle-group";

export function ThemeQuickSwitch() {
  const { t } = useTranslation();
  const { theme, colorScheme, update } = useColorThemeManager();

  return (
    <ToggleGroup
      icons
      type="single"
      value={theme}
      onValueChange={(val) => {
        if (val) update(val, colorScheme);
      }}
    >
      <ToggleGroupItem
        value="light"
        tooltip={t("settings.display.theme_light")}
      >
        <SunIcon />
      </ToggleGroupItem>
      <ToggleGroupItem value="dark" tooltip={t("settings.display.theme_dark")}>
        <MoonIcon />
      </ToggleGroupItem>
      <ToggleGroupItem
        value="system"
        tooltip={t("settings.display.theme_system")}
      >
        <MonitorIcon />
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
