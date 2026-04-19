import { useCallback, useEffect, useState } from "react";
import logoBotanical from "@/assets/logo/logo-botanical.png";
import logoClay from "@/assets/logo/logo-clay.png";
import logoNord from "@/assets/logo/logo-nord.png";
import i18n from "@/utils/i18n";
import { useMedia } from "./use-media";

export function getAvailableThemes(): Record<string, string> {
  return {
    dark: i18n.t("settings.display.theme_dark"),
    light: i18n.t("settings.display.theme_light"),
    system: i18n.t("settings.display.theme_system"),
  };
}

export function getAvailableColorSchemes(): Record<string, string> {
  return {
    botanical: i18n.t("settings.display.color_scheme_botanical"),
    clay: i18n.t("settings.display.color_scheme_clay"),
    nord: i18n.t("settings.display.color_scheme_nord"),
  };
}

const DEFAULT_THEME = "dark";
const DEFAULT_COLOR_SCHEME = "botanical";

export function getColorThemePreference() {
  const pref = localStorage.getItem("color-scheme-preference");
  if (pref && getAvailableThemes()[pref]) return pref;
  return DEFAULT_THEME;
}

export function getColorSchemePreference() {
  const pref = localStorage.getItem("color-variant-preference");
  if (pref && getAvailableColorSchemes()[pref]) return pref;
  return DEFAULT_COLOR_SCHEME;
}

function persistColorTheme(theme: string | null | undefined) {
  localStorage.setItem("color-scheme-preference", theme ?? DEFAULT_THEME);
}

function persistColorScheme(scheme: string | null | undefined) {
  localStorage.setItem(
    "color-variant-preference",
    scheme ?? DEFAULT_COLOR_SCHEME,
  );
}

export function applyColorTheme(
  theme: string,
  scheme: string,
  prefersDarkMode: boolean,
) {
  if (theme === "system") {
    document.documentElement.dataset.theme = prefersDarkMode ? "dark" : "light";
  } else {
    document.documentElement.dataset.theme = theme;
  }

  document.documentElement.dataset.colorScheme = scheme;
}

export function useColorThemeManager() {
  const [currentTheme, setCurrentTheme] = useState(getColorThemePreference());
  const [currentScheme, setCurrentScheme] = useState(
    getColorSchemePreference(),
  );

  const prefersDarkMode = useMedia("(prefers-color-scheme: dark)");

  const updateColorScheme = useCallback(
    (themeValue: string, schemeValue: string) => {
      const nextTheme = themeValue || DEFAULT_THEME;
      const nextScheme = schemeValue || DEFAULT_COLOR_SCHEME;

      setCurrentTheme(nextTheme);
      setCurrentScheme(nextScheme);

      persistColorTheme(nextTheme);
      persistColorScheme(nextScheme);

      applyColorTheme(nextTheme, nextScheme, prefersDarkMode);
    },
    [prefersDarkMode],
  );

  return {
    theme: currentTheme,
    colorScheme: currentScheme,
    update: updateColorScheme,
  } as const;
}

export function useResolvedColorTheme() {
  const { theme } = useColorThemeManager();

  const isDarkMode = useMedia("(prefers-color-scheme: dark)");

  if (theme === "system") {
    return isDarkMode ? "dark" : "light";
  }

  return theme;
}

export function useLogoUrl() {
  const { colorScheme } = useColorThemeManager();

  switch (colorScheme) {
    case "botanical":
      return logoBotanical;
    case "clay":
      return logoClay;
    default:
      return logoNord;
  }
}

export function useColorThemeListener() {
  const prefersDarkMode = useMedia("(prefers-color-scheme: dark)");
  useEffect(() => {
    const theme = getColorThemePreference();
    const scheme = getColorSchemePreference();
    applyColorTheme(theme, scheme, prefersDarkMode);
  }, [prefersDarkMode]);
}
