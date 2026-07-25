/** biome-ignore-all lint/performance/noBarrelFile: TECH DEBT: look into `exports` */

export {
  CanonicalEmailSchema,
  type CompleteProfileRequest,
  CompleteProfileRequestSchema,
  type CompleteProfileResponse,
  CompleteProfileResponseSchema,
  type CreateEmailIdentityRequest,
  CreateEmailIdentityRequestSchema,
  type EmailIdentity,
  EmailIdentitySchema,
  type ForgotPasswordRequest,
  ForgotPasswordRequestSchema,
  type Identity,
  IdentitySchema,
  type LoginRequest,
  LoginRequestSchema,
  PASSWORD_MAX_LENGTH,
  PATTERN_VALID_PASSWORD,
  PATTERN_VALID_USERNAME,
  type ResendVerificationRequest,
  ResendVerificationRequestSchema,
  type ResetPasswordRequest,
  ResetPasswordRequestSchema,
  type SessionResponse,
  SessionResponseSchema,
  type SignupRequest,
  SignupRequestSchema,
  type UpdateCredentialsRequest,
  UpdateCredentialsRequestSchema,
  type VerifyEmailRequest,
  VerifyEmailRequestSchema,
} from "./dtos/auth.schema.ts";

export {
  type DateRange,
  DateRangeSchema,
} from "./dtos/date-range.schema.ts";

export {
  type DecklistMetaResponse,
  DecklistMetaResponseSchema,
} from "./dtos/decklist-meta-response.schema.ts";

export {
  type DecklistSearchRequest,
  DecklistSearchRequestSchema,
} from "./dtos/decklist-search-request.schema.ts";

export {
  type DecklistSearchResponse,
  DecklistSearchResponseSchema,
  type DecklistSearchResult,
} from "./dtos/decklist-search-response.schema.ts";
export {
  type UpdateProfileRequest,
  UpdateProfileRequestSchema,
} from "./dtos/profile.schema.ts";
export {
  PUBLIC_CAMPAIGN_SCHEMA_VERSION,
  type PublicCampaign,
  type PublicCampaignData,
  PublicCampaignDataSchema,
  PublicCampaignSchema,
  type PublicDeck,
  PublicDeckSchema,
  toPublicCampaign,
  toPublicDeck,
} from "./dtos/public-campaign.schema.ts";
export {
  type RangersDbDeck,
  RangersDbDeckSchema,
} from "./dtos/rangersdb.schema.ts";
export {
  type RecommendationsRequest,
  RecommendationsRequestSchema,
} from "./dtos/recommendations-request.schema.ts";
export {
  type Recommendation,
  RecommendationSchema,
  type RecommendationsResponse,
  RecommendationsResponseSchema,
} from "./dtos/recommendations-response.schema.ts";
export {
  type SealedDeckResponse,
  SealedDeckResponseSchema,
} from "./dtos/sealed-deck-response.schema.ts";
export {
  type AchievementCompletion,
  AchievementCompletionSchema,
  type AchievementsResponse,
  AchievementsResponseSchema,
  type AchievementsState,
  AchievementsStateSchema,
  type AchievementsWriteRequest,
  AchievementsWriteRequestSchema,
  type BlobResponse,
  BlobResponseSchema,
  type CampaignBatchItem,
  CampaignBatchItemSchema,
  type CampaignBatchResponse,
  CampaignBatchResponseSchema,
  type CampaignConflictResponse,
  CampaignConflictResponseSchema,
  type CampaignCreateRequest,
  CampaignCreateRequestSchema,
  type CampaignVisibilityRequest,
  CampaignVisibilityRequestSchema,
  type CampaignVisibilityResponse,
  CampaignVisibilityResponseSchema,
  type CampaignWriteRequest,
  CampaignWriteRequestSchema,
  type DeckBatchResponse,
  DeckBatchResponseSchema,
  type DeckConflictResponse,
  DeckConflictResponseSchema,
  type DeckCreateRequest,
  DeckCreateRequestSchema,
  type DeckWriteRequest,
  DeckWriteRequestSchema,
  type Folder,
  type FolderResponse,
  FolderResponseSchema,
  FolderSchema,
  type FolderState,
  FolderStateSchema,
  type FolderWriteRequest,
  FolderWriteRequestSchema,
  type ItemBatchRequest,
  ItemBatchRequestSchema,
  type ItemDeleteRequest,
  ItemDeleteRequestSchema,
  type ManifestItem,
  ManifestItemSchema,
  RevisionSchema,
  type SettingsResponse,
  SettingsResponseSchema,
  type SettingsState,
  SettingsStateSchema,
  type SettingsWriteRequest,
  SettingsWriteRequestSchema,
  SYNC_BATCH_LIMIT,
  type SyncedCampaign,
  SyncedCampaignSchema,
  type SyncedCampaignUpload,
  SyncedCampaignUploadSchema,
  type SyncedDeck,
  SyncedDeckSchema,
  type SyncedDeckUpload,
  SyncedDeckUploadSchema,
  SyncIdSchema,
  type SyncManifestResponse,
  SyncManifestResponseSchema,
  type WriteResponse,
  WriteResponseSchema,
} from "./dtos/sync.schema.ts";

export {
  cardApproachIconOrder,
  cardApproachIcons,
  cardAspectRequirement,
  cardEnergyCost,
} from "./lib/card-utils.ts";

export {
  APPROACH_ORDER,
  type ApproachKey,
  ASPECT_ORDER,
  type AspectKey,
  BACKGROUND_PICKS,
  BACKGROUND_TYPES,
  type BackgroundType,
  CARD_TYPE_ORDER,
  type CardType,
  CHALLENGE_ICONS,
  type ChallengeIcon,
  COMPARISON_OPERATOR,
  DECK_CARD_COPIES,
  DECK_SIZE,
  IRREGULAR_TOKEN_PLURALS,
  KEYWORDS,
  type Keyword,
  MAX_EQUIP_VALUE,
  MAX_INJURIES,
  OUTSIDE_INTEREST_PICKS,
  PATH_SET_TYPES,
  type PathSetType,
  PERSONALITY_PICKS,
  RANGER_CARD_CATEGORY,
  RANGER_SET_TYPES,
  type RangerCardCategory,
  SPECIALTY_PICKS,
  SPECIALTY_TYPES,
  type SpecialtyType,
  TERRAIN_TYPES,
  type TerrainType,
} from "./lib/constants.ts";

export {
  decodeSearch,
  encodeSearch,
} from "./lib/search-params.ts";
export {
  type CalendarEntry,
  type Campaign,
  type CampaignCycle,
  CampaignCycleSchema,
  type CampaignNote,
  CampaignSchema,
  type HistoryEntry,
  isCampaign,
  type MissionEntry,
  type NotableEvent,
  type RemovedEntry,
} from "./schemas/campaign.schema.ts";
export {
  type AspectCard,
  type Card,
  CardSchema,
  type RoleCard,
} from "./schemas/card.schema.ts";

export {
  type Deck,
  type DeckProblem,
  DeckSchema,
  type Id,
  idSchema,
  isDeck,
  type Slots,
  SlotsSchema,
} from "./schemas/deck.schema.ts";

export {
  type Decklist,
  DecklistSchema,
} from "./schemas/decklist.schema.ts";

export {
  type FanMadeCard,
  FanMadeCardSchema,
  type FanMadeProject,
  FanMadeProjectSchema,
} from "./schemas/fan-made-project.schema.ts";

export {
  type FanMadeProjectInfo,
  FanMadeProjectInfoSchema,
} from "./schemas/fan-made-project-info.schema.ts";
