import { useEffect } from "react";
import { useStore } from "@/store";

declare global {
  interface Window {
    plausible?: (event: string) => void;
  }
}

const STORAGE_KEY = "analytics-auth-segment";

const SEGMENT_AUTHENTICATED = "auth:signed-in";
const SEGMENT_ANONYMOUS = "auth:anonymous";

/**
 * Plausible's Growth plan has no custom properties, so the signed-in/anonymous
 * split is reported as a pair of goals instead. Both goals bill against the
 * event quota, so a segment is only sent once per session — and again only when
 * the visitor actually signs in or out mid-session.
 */
export function useAnalyticsSegment() {
  const sessionInitialized = useStore((state) => state.ui.sessionInitialized);
  const authenticated = useStore((state) => Boolean(state.auth.session));

  useEffect(() => {
    if (!sessionInitialized) return;

    const segment = authenticated ? SEGMENT_AUTHENTICATED : SEGMENT_ANONYMOUS;
    if (readSegment() === segment) return;

    window.plausible?.(segment);
    writeSegment(segment);
  }, [sessionInitialized, authenticated]);
}

function readSegment() {
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch (_) {
    return null;
  }
}

function writeSegment(segment: string) {
  try {
    sessionStorage.setItem(STORAGE_KEY, segment);
  } catch (_) {}
}
