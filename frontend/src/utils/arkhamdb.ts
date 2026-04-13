// Stub — ArkhamDB utilities removed. Will be replaced in Phase 4.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function assertCanPublishDeck(_deck: any): void {
  throw new Error("Publishing is not yet supported.");
}

export function incrementVersion(_version: string): string {
  return "1.0";
}

export function localizeArkhamDBBaseUrl(_locale: string): string {
  return "";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function redirectArkhamDBLinks(_event: any): void {
  // no-op
}
