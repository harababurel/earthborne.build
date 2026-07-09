import type { StoreState } from "../slices";
import v1Tov2 from "./migrations/0001-add-deck-history";
import v2Tov3 from "./migrations/0002-add-client-id";
import v3Tov4 from "./migrations/0003-add-lists-setting";
import v4Tov5 from "./migrations/0004-fix-investigator-default";
import v5Tov6 from "./migrations/0005-add-view-mode";
import v6Tov7 from "./migrations/0006-add-folders";
import v7Tov8 from "./migrations/0007-patch-card-chapter";
import v8Tov9 from "./migrations/0008-clear-metadata-for-er";
import v9Tov10 from "./migrations/0009-rename-investigator-list";
import v10Tov11 from "./migrations/0010-remove-role-list";
import v11Tov12 from "./migrations/0011-clean-list-sort-fields";
import v12Tov13 from "./migrations/0012-default-other-cards-sort";
import v13Tov14 from "./migrations/0013-add-campaigns";
import v14Tov15 from "./migrations/0014-campaign-travel-days";
import v15Tov16 from "./migrations/0015-add-accounts-and-sync";
import v16Tov17 from "./migrations/0016-add-share-listed";

export function migrate(
  persisted: Partial<StoreState>,
  version: number,
): Partial<StoreState> {
  const state = structuredClone(persisted);

  if (version < 2) {
    console.debug("[persist] migrate store: ", 2);
    v1Tov2(state, version);
  }

  if (version < 3) {
    console.debug("[persist] migrate store: ", 3);
    v2Tov3(state, version);
  }

  if (version < 4) {
    console.debug("[persist] migrate store: ", 4);
    v3Tov4(state, version);
  }

  if (version < 5) {
    console.debug("[persist] migrate store: ", 5);
    v4Tov5(state, version);
  }

  if (version < 6) {
    console.debug("[persist] migrate store: ", 6);
    v5Tov6(state, version);
  }

  if (version < 7) {
    console.debug("[persist] migrate store: ", 7);
    v6Tov7(state, version);
  }

  if (version < 8) {
    console.debug("[persist] migrate store: ", 8);
    v7Tov8(state, version);
  }

  if (version < 9) {
    console.debug("[persist] migrate store: ", 9);
    v8Tov9(state, version);
  }

  if (version < 10) {
    console.debug("[persist] migrate store: ", 10);
    v9Tov10(state, version);
  }

  if (version < 11) {
    console.debug("[persist] migrate store: ", 11);
    v10Tov11(state, version);
  }

  if (version < 12) {
    console.debug("[persist] migrate store: ", 12);
    v11Tov12(state, version);
  }

  if (version < 13) {
    console.debug("[persist] migrate store: ", 13);
    v12Tov13(state, version);
  }

  if (version < 14) {
    console.debug("[persist] migrate store: ", 14);
    v13Tov14(state, version);
  }

  if (version < 15) {
    console.debug("[persist] migrate store: ", 15);
    v14Tov15(state, version);
  }

  if (version < 16) {
    console.debug("[persist] migrate store: ", 16);
    v15Tov16(state, version);
  }

  if (version < 17) {
    console.debug("[persist] migrate store: ", 17);
    v16Tov17(state, version);
  }

  return state;
}
