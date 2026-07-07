import type {
  AchievementsResponse,
  FolderResponse,
  Id,
  SettingsResponse,
} from "@earthborne-build/shared";
import type { HttpClient } from "../services/http-client";
import type { AuthState } from "./auth.types";

export type SyncStatus =
  | "idle"
  | "loading"
  | "saving"
  | "synced"
  | "partial"
  | "conflict"
  | "error";

export type SettingsSyncState = {
  accountId: string | null;
  revision: string | null;
  lastSyncedAt: number | null;
  status: SyncStatus;
  error: string | null;
  conflict: SettingsResponse | null;
};

type ItemSyncConflictState = {
  kind: "update" | "delete";
  remoteVersion: string | null;
};

export type DeckSyncItemState = {
  version: string | null;
  status: SyncStatus;
  lastSyncedAt: number | null;
  error: string | null;
  conflict: ItemSyncConflictState | null;
};

export type DecksSyncState = {
  accountId: string | null;
  manifestVersion: string | null;
  lastSyncedAt: number | null;
  status: SyncStatus;
  error: string | null;
  items: Record<string, DeckSyncItemState>;
};

export type CampaignSyncItemState = {
  version: string | null;
  status: SyncStatus;
  lastSyncedAt: number | null;
  error: string | null;
  conflict: ItemSyncConflictState | null;
};

export type CampaignsSyncState = {
  accountId: string | null;
  manifestVersion: string | null;
  lastSyncedAt: number | null;
  status: SyncStatus;
  error: string | null;
  items: Record<string, CampaignSyncItemState>;
};

export type FoldersSyncState = {
  accountId: string | null;
  revision: string | null;
  lastSyncedAt: number | null;
  status: SyncStatus;
  error: string | null;
  conflict: FolderResponse | null;
};

export type AchievementsSyncState = {
  accountId: string | null;
  revision: string | null;
  lastSyncedAt: number | null;
  status: SyncStatus;
  error: string | null;
  conflict: AchievementsResponse | null;
};

export type SyncState = {
  sync: {
    settings: SettingsSyncState;
    decks: DecksSyncState;
    campaigns: CampaignsSyncState;
    folders: FoldersSyncState;
    achievements: AchievementsSyncState;
  };
};

type ItemConflictResolutionResult = {
  kind: NonNullable<DeckSyncItemState["conflict"]>["kind"];
};

export type SyncSlice = SyncState & {
  apiClient: HttpClient | null;
  setApiClient(client: HttpClient): void;
  bootstrapAuthenticatedState(client: HttpClient): Promise<void>;
  clearAccountState(auth?: AuthState): void;
  setSettingsSync(payload: Partial<SettingsSyncState>): void;
  setDecksSync(payload: Partial<DecksSyncState>): void;
  setCampaignsSync(payload: Partial<CampaignsSyncState>): void;
  setFoldersSync(payload: Partial<FoldersSyncState>): void;
  setAchievementsSync(payload: Partial<AchievementsSyncState>): void;
  setDeckSyncItem(id: Id, payload: Partial<DeckSyncItemState> | null): void;
  setCampaignSyncItem(
    id: Id,
    payload: Partial<CampaignSyncItemState> | null,
  ): void;
  loadRemoteFolders(client: HttpClient): Promise<void>;
  applyRemoteFolders(payload: FolderResponse): Promise<void>;
  saveFolders(
    client: HttpClient,
    opts?: { expectedRevision?: string | null },
  ): Promise<void>;
  loadRemoteAchievements(client: HttpClient): Promise<void>;
  applyRemoteAchievements(payload: AchievementsResponse): Promise<void>;
  saveAchievements(
    client: HttpClient,
    opts?: { expectedRevision?: string | null },
  ): Promise<void>;
  loadRemoteSettings(client: HttpClient): Promise<void>;
  applyRemoteSettings(payload: SettingsResponse): Promise<void>;
  saveSettings(
    client: HttpClient,
    opts?: { expectedRevision?: string | null },
  ): Promise<void>;
  syncAll(client: HttpClient): Promise<void>;
  syncDecks(client: HttpClient): Promise<void>;
  pushDeck(client: HttpClient, id: Id): Promise<void>;
  pushDeckDeletion(
    client: HttpClient,
    id: Id,
    expectedRevision: string | null,
  ): Promise<void>;
  syncCampaigns(client: HttpClient): Promise<void>;
  pushCampaign(client: HttpClient, id: Id): Promise<void>;
  pushCampaignDeletion(
    client: HttpClient,
    id: Id,
    expectedRevision: string | null,
  ): Promise<void>;
  resolveDeckConflictWithRefresh(
    client: HttpClient,
    id: Id,
  ): Promise<ItemConflictResolutionResult>;
  resolveDeckConflictWithDiscard(id: Id): Promise<ItemConflictResolutionResult>;
  resolveCampaignConflictWithRefresh(
    client: HttpClient,
    id: Id,
  ): Promise<ItemConflictResolutionResult>;
  resolveCampaignConflictWithDiscard(
    id: Id,
  ): Promise<ItemConflictResolutionResult>;
};
