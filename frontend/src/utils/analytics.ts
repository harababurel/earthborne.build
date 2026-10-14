import { useEffect } from "react";
import { useStore } from "@/store";
import i18n from "./i18n";
import { getColorThemePreference } from "./use-color-theme";

type CustomProperties = Record<string, string>;

declare global {
  interface Window {
    plausible?: {
      init?: (config: {
        customProperties: (eventName: string) => CustomProperties;
      }) => void;
    };
  }
}

const AUTH_HINT_STORAGE_KEY = "analytics-auth";

/**
 * Every property sent here needs to be registered under Site settings ->
 * Custom properties in Plausible, otherwise it won't show up on the dashboard.
 * Values must stay low-cardinality and non-identifying (see privacy policy).
 */
export function initAnalytics() {
  window.plausible?.init?.({ customProperties: getCustomProperties });
}

/**
 * The first pageview fires before the session check completes, so it falls
 * back to the auth state remembered from the previous visit.
 */
export function useAnalyticsAuthHint() {
  const sessionInitialized = useStore((state) => state.ui.sessionInitialized);
  const authenticated = useStore((state) => Boolean(state.auth.session));

  useEffect(() => {
    if (!sessionInitialized) return;
    writeAuthHint(authenticated ? "signed-in" : "anonymous");
  }, [sessionInitialized, authenticated]);
}

function getCustomProperties(): CustomProperties {
  return {
    auth: getAuthSegment(),
    locale: i18n.language,
    theme: getColorThemePreference(),
    display_mode: window.matchMedia("(display-mode: standalone)").matches
      ? "standalone"
      : "browser",
  };
}

function getAuthSegment() {
  const state = useStore.getState();
  if (state.ui.sessionInitialized) {
    return state.auth.session ? "signed-in" : "anonymous";
  }
  return readAuthHint() ?? "anonymous";
}

function readAuthHint() {
  try {
    return localStorage.getItem(AUTH_HINT_STORAGE_KEY);
  } catch (_) {
    return null;
  }
}

function writeAuthHint(value: string) {
  try {
    localStorage.setItem(AUTH_HINT_STORAGE_KEY, value);
  } catch (_) {}
}
