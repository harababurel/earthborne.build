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
  de: { value: "de", label: "Deutsch (de)", additionalCharacters: "ß" },
  en: { value: "en", label: "English (en)" },
  es: { value: "es", label: "Español (es)", additionalCharacters: "ñ" },
  fr: { value: "fr", label: "Français (fr)" },
  ko: { value: "ko", label: "한국어/Korean (ko)", unicode: true },
  pl: { value: "pl", label: "Polski (pl)" },
  ru: { value: "ru", label: "Русский (ru)", unicode: true },
  "zh-cn": {
    value: "zh-cn",
    displayValue: "zh-Hans",
    label: "简体中文/Chinese (zh-Hans)",
    unicode: true,
  },
  zh: {
    value: "zh",
    displayValue: "zh-Hant",
    label: "繁體中文/Chinese (zh-Hant)",
    unicode: true,
  },
};

export const FLOATING_PORTAL_ID = "floating";

export const ISSUE_URL =
  "https://github.com/fspoettel/arkham.build/issues/new/choose";

export const MQ_FLOATING_SIDEBAR = "(max-width: 52rem)";
export const MQ_FLOATING_FILTERS = "(max-width: 75rem)";
export const MQ_MOBILE = "(pointer: coarse)";
export const MQ_WIDE_PREVIEW = "(min-width: 85rem)";

export const ARCHIVE_FOLDER_ID = "archive";

export type StorageProvider = "local" | "shared";

export const STORAGE_PROVIDERS = ["local", "shared"] as const;

export const DEFAULT_LIST_SORT_ID = "list_default";
