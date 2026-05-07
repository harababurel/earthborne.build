import i18next from "i18next";
import { createSelector } from "reselect";
import type { Cycle } from "@/store/schemas/cycle.schema";
import type { Pack } from "@/store/schemas/pack.schema";
import i18n from "@/utils/i18n";
import { LOCALES, type StorageProvider } from "./constants";

export function capitalize(s: string | number) {
  const str = s.toString();
  if (!str.length) return str;

  return `${str[0].toUpperCase()}${str.slice(1)}`;
}

// `toLocaleDateString()` is slow, memoize it.
export const formatDate = createSelector(
  (date: string | number) => date,
  (date) =>
    new Date(date).toLocaleDateString(navigator.language, {
      dateStyle: "medium",
    }),
);

// `toLocaleString()` is slow, memoize it.
export const formatDateTime = createSelector(
  (date: string | number) => date,
  (date) =>
    new Date(date).toLocaleString(navigator.language, {
      dateStyle: "short",
      timeStyle: "short",
    }),
);

export function formatDataVersionTimestamp(
  date: string | number,
  now = new Date(),
  locale = navigator.language,
) {
  const parsed = parseDateAsUtc(date);
  if (!parsed) return date.toString();

  return `${formatUtcDateTime(parsed)} (${formatRelativeTime(parsed, now, locale)})`;
}

export function formatRelationTitle(id: string) {
  return i18next.t(`common.relations.${id}`);
}

export function formatGroupingType(type: string) {
  return i18n.t(`lists.categories.${type}`);
}

export function formatSlots(slots: string) {
  const slotStrs = slots.split(".");

  const formatted = slotStrs
    .map((slot) => i18n.t(`common.slot.${slot.trim().toLowerCase()}`))
    .join(". ");
  return `${formatted}${slotStrs.length > 1 ? "." : ""}`;
}

export function formatProviderName(name: StorageProvider) {
  return capitalize(name);
}

export function displayPackName(pack: Pack | Cycle) {
  return pack.name ?? pack.real_name ?? "";
}

export function shortenPackName(pack: Pack) {
  return displayPackName(pack)
    .replace(i18n.t("common.packs_new_format.encounter"), "")
    .replace(i18n.t("common.packs_new_format.player"), "")
    .trim();
}

export function formatDeckOptionString(str: string | undefined) {
  const key = `common.deck_options.${str}`;
  return i18n.exists(key) ? i18n.t(key) : (str ?? "");
}

export function dataLanguage() {
  return LOCALES[i18n.language]?.value;
}

function formatUtcDateTime(date: Date) {
  const datePart = [
    date.getUTCFullYear(),
    padDatePart(date.getUTCMonth() + 1),
    padDatePart(date.getUTCDate()),
  ].join("-");
  const timePart = [
    padDatePart(date.getUTCHours()),
    padDatePart(date.getUTCMinutes()),
    padDatePart(date.getUTCSeconds()),
  ].join(":");

  return `${datePart} ${timePart} UTC`;
}

function formatRelativeTime(date: Date, now: Date, locale: string) {
  const diffMs = date.getTime() - now.getTime();
  const absMs = Math.abs(diffMs);
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "always" });
  const [unit, unitMs] = relativeTimeUnit(absMs);
  const direction = diffMs < 0 ? -1 : 1;
  const value = direction * Math.max(1, Math.round(absMs / unitMs));

  return formatter.format(value, unit);
}

function relativeTimeUnit(ms: number): [Intl.RelativeTimeFormatUnit, number] {
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day;
  const year = 365 * day;

  if (ms < minute) return ["second", 1000];
  if (ms < hour) return ["minute", minute];
  if (ms < day) return ["hour", hour];
  if (ms < week) return ["day", day];
  if (ms < month) return ["week", week];
  if (ms < year) return ["month", month];

  return ["year", year];
}

function parseDateAsUtc(date: string | number) {
  if (typeof date === "number") {
    const parsed = new Date(date);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const hasTimezone = /(?:z|[+-]\d{2}:?\d{2})$/i.test(date);
  const parsed = new Date(hasTimezone ? date : `${date}Z`);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function padDatePart(value: number) {
  return value.toString().padStart(2, "0");
}
