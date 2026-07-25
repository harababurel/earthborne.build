import { z } from "zod";
import { CampaignSchema } from "../schemas/campaign.schema.ts";
import { DeckSchema } from "../schemas/deck.schema.ts";

export const SYNC_BATCH_LIMIT = 250;

export const SyncIdSchema = z.string().min(1).max(64);
export const RevisionSchema = z.uuid();

// Synced rows share the id with the client-side item, so uploaded item ids
// must fit the account_deck/account_campaign id column (length <= 64).
export const SyncableDeckSchema = DeckSchema.refine(
  (deck) => isValidSyncId(deck.id),
  { message: "Deck id must be between 1 and 64 characters" },
);

export const SyncableCampaignSchema = CampaignSchema.refine(
  (campaign) => isValidSyncId(campaign.id),
  { message: "Campaign id must be between 1 and 64 characters" },
);

export const ManifestItemSchema = z.object({
  id: SyncIdSchema,
  revision: RevisionSchema,
  updatedAt: z.string(),
});
export type ManifestItem = z.infer<typeof ManifestItemSchema>;

export const SyncManifestResponseSchema = z.object({
  decks: z.array(ManifestItemSchema),
  campaigns: z.array(ManifestItemSchema),
});
export type SyncManifestResponse = z.infer<typeof SyncManifestResponseSchema>;

export const ItemBatchRequestSchema = z.object({
  ids: z.array(SyncIdSchema).max(SYNC_BATCH_LIMIT),
});
export type ItemBatchRequest = z.infer<typeof ItemBatchRequestSchema>;

export const SyncedDeckSchema = z.object({
  data: DeckSchema,
  revision: RevisionSchema,
  updatedAt: z.string(),
});
export type SyncedDeck = z.infer<typeof SyncedDeckSchema>;

export const SyncedCampaignSchema = z.object({
  data: CampaignSchema,
  revision: RevisionSchema,
  updatedAt: z.string(),
});
export type SyncedCampaign = z.infer<typeof SyncedCampaignSchema>;

export const DeckBatchResponseSchema = z.object({
  decks: z.array(SyncedDeckSchema),
});
export type DeckBatchResponse = z.infer<typeof DeckBatchResponseSchema>;

// Public visibility rides along the batch response so the UI can render the
// share toggle without a second request. It stays off SyncedCampaignSchema
// itself, which also describes the complete-profile upload echo where the flag
// has no meaning.
export const CampaignBatchItemSchema = SyncedCampaignSchema.extend({
  public: z.boolean(),
});
export type CampaignBatchItem = z.infer<typeof CampaignBatchItemSchema>;

export const CampaignBatchResponseSchema = z.object({
  campaigns: z.array(CampaignBatchItemSchema),
});
export type CampaignBatchResponse = z.infer<typeof CampaignBatchResponseSchema>;

export const SyncedDeckUploadSchema = SyncedDeckSchema.omit({
  updatedAt: true,
});
export type SyncedDeckUpload = z.infer<typeof SyncedDeckUploadSchema>;

export const SyncedCampaignUploadSchema = SyncedCampaignSchema.omit({
  updatedAt: true,
});
export type SyncedCampaignUpload = z.infer<typeof SyncedCampaignUploadSchema>;

export const DeckCreateRequestSchema = z.object({
  data: SyncableDeckSchema,
});
export type DeckCreateRequest = z.infer<typeof DeckCreateRequestSchema>;

export const CampaignCreateRequestSchema = z.object({
  data: SyncableCampaignSchema,
});
export type CampaignCreateRequest = z.infer<typeof CampaignCreateRequestSchema>;

export const DeckWriteRequestSchema = z.object({
  data: SyncableDeckSchema,
  expectedRevision: RevisionSchema,
});
export type DeckWriteRequest = z.infer<typeof DeckWriteRequestSchema>;

export const CampaignWriteRequestSchema = z.object({
  data: SyncableCampaignSchema,
  expectedRevision: RevisionSchema,
});
export type CampaignWriteRequest = z.infer<typeof CampaignWriteRequestSchema>;

export const ItemDeleteRequestSchema = z.object({
  expectedRevision: RevisionSchema,
});
export type ItemDeleteRequest = z.infer<typeof ItemDeleteRequestSchema>;

// No expectedRevision: visibility is server-owned and deliberately outside the
// optimistic-concurrency scheme, so toggling it never conflicts with an edit.
export const CampaignVisibilityRequestSchema = z.object({
  public: z.boolean(),
});
export type CampaignVisibilityRequest = z.infer<
  typeof CampaignVisibilityRequestSchema
>;

export const CampaignVisibilityResponseSchema = z.object({
  public: z.boolean(),
});
export type CampaignVisibilityResponse = z.infer<
  typeof CampaignVisibilityResponseSchema
>;

export const DeckConflictResponseSchema = z.object({
  data: DeckSchema,
  revision: RevisionSchema,
});
export type DeckConflictResponse = z.infer<typeof DeckConflictResponseSchema>;

export const CampaignConflictResponseSchema = z.object({
  data: CampaignSchema,
  revision: RevisionSchema,
});
export type CampaignConflictResponse = z.infer<
  typeof CampaignConflictResponseSchema
>;

export const WriteResponseSchema = z.object({
  revision: RevisionSchema,
});
export type WriteResponse = z.infer<typeof WriteResponseSchema>;

export const FolderSchema = z.object({
  id: z.string().max(255),
  name: z.string().max(255),
  icon: z.string().max(255).optional(),
  color: z.string().max(255).optional(),
  parent_id: z.string().max(255).optional(),
});
export type Folder = z.infer<typeof FolderSchema>;

export const FolderStateSchema = z.object({
  folders: z.record(z.string().max(255), FolderSchema),
  deckFolders: z.record(z.string().max(64), z.string().max(255)),
});
export type FolderState = z.infer<typeof FolderStateSchema>;

export const SettingsStateSchema = z.record(z.string(), z.unknown());
export type SettingsState = z.infer<typeof SettingsStateSchema>;

export const AchievementCompletionSchema = z.object({
  date: z.string().optional(),
});
export type AchievementCompletion = z.infer<typeof AchievementCompletionSchema>;

export const AchievementsStateSchema = z.object({
  completed: z.record(
    z.string(),
    z.union([z.boolean(), AchievementCompletionSchema]),
  ),
});
export type AchievementsState = z.infer<typeof AchievementsStateSchema>;

export const BlobResponseSchema = z.object({
  state: z.unknown(),
  revision: RevisionSchema,
});
export type BlobResponse = z.infer<typeof BlobResponseSchema>;

export const FolderResponseSchema = z.object({
  state: FolderStateSchema,
  revision: RevisionSchema,
});
export type FolderResponse = z.infer<typeof FolderResponseSchema>;

export const FolderWriteRequestSchema = z.object({
  state: FolderStateSchema,
  expectedRevision: RevisionSchema.nullable(),
});
export type FolderWriteRequest = z.infer<typeof FolderWriteRequestSchema>;

export const SettingsResponseSchema = z.object({
  settings: SettingsStateSchema,
  revision: RevisionSchema,
});
export type SettingsResponse = z.infer<typeof SettingsResponseSchema>;

export const SettingsWriteRequestSchema = z.object({
  settings: SettingsStateSchema,
  expectedRevision: RevisionSchema.nullable(),
});
export type SettingsWriteRequest = z.infer<typeof SettingsWriteRequestSchema>;

export const AchievementsResponseSchema = z.object({
  state: AchievementsStateSchema,
  revision: RevisionSchema,
});
export type AchievementsResponse = z.infer<typeof AchievementsResponseSchema>;

export const AchievementsWriteRequestSchema = z.object({
  state: AchievementsStateSchema,
  expectedRevision: RevisionSchema.nullable(),
});
export type AchievementsWriteRequest = z.infer<
  typeof AchievementsWriteRequestSchema
>;

function isValidSyncId(id: string | number) {
  const length = String(id).length;
  return length >= 1 && length <= 64;
}
