type Locale = {
  value: string;
  label: string;
  unicode?: boolean;
  displayValue?: string;
  additionalCharacters?: string;
};

/**
 * If your language uses a different alphabet, please set the `unicode` flag here to `true`.
 * This is only necessary if the alphabet is not based on the latin alphabet at all.
 * Diacritics are fine and will be normalised with `String.prototype.normalize()` before searching.
 */
export const LOCALES: Record<string, Locale> = {
  en: { value: "en", label: "English (en)" },
};

export const FLOATING_PORTAL_ID = "floating";

export const ISSUE_URL =
  "https://github.com/harababurel/earthborne.build/issues/new/choose";

export const MQ_FLOATING_SIDEBAR = "(max-width: 52rem)";
export const MQ_FLOATING_FILTERS = "(max-width: 75rem)";
export const MQ_MOBILE = "(pointer: coarse)";
export const MQ_WIDE_PREVIEW = "(min-width: 85rem)";

export const ARCHIVE_FOLDER_ID = "archive";

export type StorageProvider = "local" | "shared";

export const STORAGE_PROVIDERS = ["local", "shared"] as const;

export const DEFAULT_LIST_SORT_ID = "list_default";
