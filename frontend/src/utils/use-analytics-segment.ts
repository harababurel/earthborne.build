import { useEffect } from "react";
import { useStore } from "@/store";
import { selectIsInitialized } from "@/store/selectors/shared";

declare global {
  interface Window {
    plausible?: (event: string) => void;
  }
}

const AUTH_STORAGE_KEY = "analytics-auth-segment";
const LOCALE_STORAGE_KEY = "analytics-locale-segment";

const SEGMENT_AUTHENTICATED = "auth:signed-in";
const SEGMENT_ANONYMOUS = "auth:anonymous";

/**
 * Plausible's Growth plan has no custom properties, so visitor splits
 * (signed-in/anonymous, UI locale) are reported as goals instead. Goals bill
 * against the event quota, so each segment is only sent once per session — and
 * again only when its value actually changes mid-session.
 *
 * Every `locale:<code>` sent here needs a matching custom event goal in
 * Plausible, otherwise it won't show up on the dashboard.
 */
export function useAnalyticsSegment() {
  const sessionInitialized = useStore((state) => state.ui.sessionInitialized);
  const authenticated = useStore((state) => Boolean(state.auth.session));

  // Settings are hydrated from persisted state during store init.
  const storeInitialized = useStore(selectIsInitialized);
  const locale = useStore((state) => state.settings.locale);

  useEffect(() => {
    if (!sessionInitialized) return;
    sendSegment(
      AUTH_STORAGE_KEY,
      authenticated ? SEGMENT_AUTHENTICATED : SEGMENT_ANONYMOUS,
    );
  }, [sessionInitialized, authenticated]);

  useEffect(() => {
    if (!storeInitialized) return;
    sendSegment(LOCALE_STORAGE_KEY, `locale:${locale}`);
  }, [storeInitialized, locale]);
}

function sendSegment(storageKey: string, segment: string) {
  if (readSegment(storageKey) === segment) return;

  window.plausible?.(segment);
  writeSegment(storageKey, segment);
}

function readSegment(storageKey: string) {
  try {
    return sessionStorage.getItem(storageKey);
  } catch (_) {
    return null;
  }
}

function writeSegment(storageKey: string, segment: string) {
  try {
    sessionStorage.setItem(storageKey, segment);
  } catch (_) {}
}
