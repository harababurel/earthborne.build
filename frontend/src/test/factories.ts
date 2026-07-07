import type { Deck } from "@earthborne-build/shared";
import type { StoreState } from "@/store/slices";
import type {
  CampaignSyncItemState,
  DeckSyncItemState,
  SyncStatus,
} from "@/store/slices/sync.types";

type Session = NonNullable<StoreState["auth"]["session"]>;

type AuthOptions = {
  account?: Partial<Session["account"]>;
  identities?: Session["identities"];
};

type SyncStateOptions = {
  accountId?: string | null;
  deckItems?: StoreState["sync"]["decks"]["items"];
  campaignItems?: StoreState["sync"]["campaigns"]["items"];
  deckStatus?: SyncStatus;
  campaignStatus?: SyncStatus;
  folders?: Partial<StoreState["sync"]["folders"]>;
  achievements?: Partial<StoreState["sync"]["achievements"]>;
  lastSyncedAt?: number | null;
  manifestVersion?: string | null;
  settings?: Partial<StoreState["sync"]["settings"]>;
  decks?: Partial<StoreState["sync"]["decks"]>;
  campaigns?: Partial<StoreState["sync"]["campaigns"]>;
};

export function makeTestDeck(overrides: Partial<Deck> = {}): Deck {
  return {
    date_creation: "2026-01-01T00:00:00.000Z",
    date_update: "2026-01-01T00:00:00.000Z",
    description_md: "",
    id: "deck-id",
    meta: "{}",
    name: "Deck",
    problem: null,
    slots: {},
    rewards: null,
    displaced: null,
    maladies: null,
    source: null,
    tags: "",
    user_id: null,
    aspect_code: "insight",
    role_code: "shepherd",
    background: "shepherd",
    specialty: "conciliator",
    ...overrides,
  };
}

export function makeData(
  overrides: Partial<StoreState["data"]> = {},
): StoreState["data"] {
  return {
    decks: {},
    campaigns: {},
    folders: {},
    deckFolders: {},
    history: {},
    ...overrides,
  };
}

export function makeAuthenticatedAuth({
  account,
  identities = [],
}: AuthOptions = {}): StoreState["auth"] {
  return {
    status: "authenticated",
    session: {
      account: {
        id: "account-id",
        name: "User",
        profileComplete: true,
        ...account,
      },
      identities,
    },
  };
}

export function makeSyncState({
  accountId = "account-id",
  deckItems = {},
  campaignItems = {},
  deckStatus = "synced",
  campaignStatus = "synced",
  folders,
  achievements,
  lastSyncedAt = null,
  manifestVersion = "1",
  settings,
  decks,
  campaigns,
}: SyncStateOptions = {}): StoreState["sync"] {
  return {
    settings: {
      accountId,
      revision: "1",
      lastSyncedAt,
      status: "synced",
      error: null,
      conflict: null,
      ...settings,
    },
    decks: {
      accountId,
      manifestVersion,
      lastSyncedAt,
      status: deckStatus,
      error: null,
      items: deckItems,
      ...decks,
    },
    campaigns: {
      accountId,
      manifestVersion,
      lastSyncedAt,
      status: campaignStatus,
      error: null,
      items: campaignItems,
      ...campaigns,
    },
    folders: {
      accountId,
      revision: "1",
      lastSyncedAt,
      status: "synced",
      error: null,
      conflict: null,
      ...folders,
    },
    achievements: {
      accountId,
      revision: "1",
      lastSyncedAt,
      status: "synced",
      error: null,
      conflict: null,
      ...achievements,
    },
  };
}

export function makeSyncItem(
  overrides: Partial<DeckSyncItemState> = {},
): DeckSyncItemState {
  return {
    version: "1",
    status: "synced",
    lastSyncedAt: null,
    error: null,
    conflict: null,
    ...overrides,
  };
}

export function makeCampaignSyncItem(
  overrides: Partial<CampaignSyncItemState> = {},
): CampaignSyncItemState {
  return {
    version: "1",
    status: "synced",
    lastSyncedAt: null,
    error: null,
    conflict: null,
    ...overrides,
  };
}

export function makeConflictSyncItem(
  overrides: Partial<DeckSyncItemState> = {},
): DeckSyncItemState {
  return makeSyncItem({
    status: "conflict",
    conflict: {
      kind: "update",
      remoteVersion: "2",
    },
    ...overrides,
  });
}
