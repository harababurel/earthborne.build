import type { AppSlice } from "./app.types";
import type { DataSlice } from "./data.types";
import type { DeckCollectionSlice } from "./deck-collection.types";
import type { DeckCreateSlice } from "./deck-create.types";
import type { DeckEditsSlice } from "./deck-edits.types";
import type { FanMadeDataSlice } from "./fan-made-data.types";
import type { ListsSlice } from "./lists.types";
import type { MetadataSlice } from "./metadata.types";
import type { RecommenderSlice } from "./recommender.types";
import type { SettingsSlice } from "./settings.types";
import type { SharingSlice } from "./sharing.types";
import type { UISlice } from "./ui.types";

export type StoreState = AppSlice &
  MetadataSlice &
  ListsSlice &
  UISlice &
  SettingsSlice &
  DataSlice &
  FanMadeDataSlice &
  DeckEditsSlice &
  DeckCreateSlice &
  DeckCollectionSlice &
  SharingSlice &
  RecommenderSlice;
