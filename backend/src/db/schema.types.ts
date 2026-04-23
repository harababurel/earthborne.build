/**
 * Kysely type definitions for the Earthborne Rangers SQLite schema.
 * Manually maintained — update when migrations change.
 *
 * SQLite types: INTEGER → number, TEXT → string, booleans stored as 0/1 integers.
 */

export interface Pack {
  id: string;
  name: string;
  short_name: string | null;
  position: number;
}

export interface Aspect {
  id: string; // AWA | FIT | FOC | SPI
  name: string;
  short_name: string;
}

export interface CardType {
  id: string; // moment | gear | attachment | being | feature | attribute | role | aspect | stat | malady | mission | location | challenge
  name: string;
}

export interface SetType {
  id: string; // background | specialty | terrain
  name: string;
}

export interface CardSet {
  id: string; // traveler | artisan | shaper | etc.
  name: string;
  type_id: string | null;
  size: number | null;
}

export interface Token {
  id: string;
  name: string;
  plurals: string | null;
}

export interface Area {
  id: string; // play | reach | along
  name: string;
}

export interface Category {
  id: string; // ranger | path | location | weather | mission | challenge
  name: string;
}

export interface Card {
  id: string;
  code: string;
  pack_id: string;
  category_id: string | null;
  set_id: string | null;
  set_position: number | null;
  position: number;
  quantity: number;
  deck_limit: number | null;
  type_id: string;
  aspect_id: string | null;
  level: number | null;
  cost: number | null;
  equip: number | null;
  presence: number | null;
  harm: string | number | null;
  progress: string | number | null;
  progress_fixed: number | null; // 0 | 1
  approach_conflict: number | null;
  approach_reason: number | null;
  approach_exploration: number | null;
  approach_connection: number | null;
  aspect_awareness: number | null;
  aspect_fitness: number | null;
  aspect_focus: number | null;
  aspect_spirit: number | null;
  token_id: string | null;
  token_count: number | null;
  area_id: string | null;
  guide_entry: string | null;
  locations: string | null; // JSON array as text
  back_card_id: string | null;
  illustrator: string | null;
  spoiler: number | null; // 0 | 1
  name: string;
  traits: string | null;
  text: string | null;
  flavor: string | null;
  objective: string | null;
  imagesrc: string | null;
  image_rect: string | null;
  sun_challenge: string | null;
  mountain_challenge: string | null;
  crest_challenge: string | null;
}

export interface FanMadeProjectInfo {
  id: string;
  bucket_path: string;
  meta: string; // JSON as text
}

export interface AppMetadata {
  key: string;
  value: string;
}

export interface SharedDeck {
  id: string;
  client_id: string;
  data: string; // JSON as text
  history: string; // JSON as text
  created_at: string;
  updated_at: string;
}

export interface DB {
  pack: Pack;
  aspect: Aspect;
  card_type: CardType;
  set_type: SetType;
  card_set: CardSet;
  token: Token;
  area: Area;
  category: Category;
  card: Card;
  fan_made_project_info: FanMadeProjectInfo;
  app_metadata: AppMetadata;
  shared_deck: SharedDeck;
}
