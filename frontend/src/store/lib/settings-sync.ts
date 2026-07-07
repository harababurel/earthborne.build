import type { SettingsState } from "../slices/settings.types";

const OMITTED_KEYS: Array<keyof SettingsState> = [
  "collection",
  "devModeEnabled",
  "fontSize",
  "flags",
  "defaultStorageProvider",
];

export function toRemoteSettings(
  settings: SettingsState,
): Record<string, unknown> {
  const remote: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(settings)) {
    if (!OMITTED_KEYS.includes(key as keyof SettingsState)) {
      remote[key] = value;
    }
  }
  return remote;
}

export function fromRemoteSettings(
  remoteSettings: unknown,
  localSettings: SettingsState,
): SettingsState {
  if (remoteSettings == null || typeof remoteSettings !== "object") {
    return localSettings;
  }
  const result = { ...localSettings };
  for (const [key, value] of Object.entries(remoteSettings)) {
    if (!OMITTED_KEYS.includes(key as keyof SettingsState)) {
      // biome-ignore lint/suspicious/noExplicitAny: generic setting key assignment
      (result as any)[key] = value;
    }
  }
  return result;
}
