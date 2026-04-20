import allCardStub from "@test/fixtures/stubs/all_card.json";
import dataVersionStub from "@test/fixtures/stubs/data_version.json";
import metadataStub from "@test/fixtures/stubs/metadata.json";
import { useStore } from "@/store";
import factions from "@/store/services/data/factions.json";
import reprintPacks from "@/store/services/data/reprint_packs.json";
import subTypes from "@/store/services/data/subtypes.json";
import types from "@/store/services/data/types.json";
import { packToApiFormat } from "@/utils/arkhamdb-json-format";

// Stubs use the legacy AH JSON shape; cast through unknown to satisfy ER types.
/* eslint-disable @typescript-eslint/no-explicit-any */
const metadataAny = metadataStub as any;
const dataVersionAny = dataVersionStub as any;
const allCardAny = allCardStub as any;
/* eslint-enable @typescript-eslint/no-explicit-any */

function queryStubMetadata() {
  return Promise.resolve({
    ...metadataAny.data,
    pack: metadataAny.data.pack,
    reprint_pack: reprintPacks.map(packToApiFormat),
    faction: factions,
    type: types,
    subtype: subTypes,
  });
}

function queryStubDataVersion() {
  return Promise.resolve(
    dataVersionAny.data?.all_card_updated?.[0] ?? dataVersionAny,
  );
}

function queryStubCardData() {
  const allCards = allCardAny.data?.all_card ?? allCardAny;
  return Promise.resolve(allCards);
}

export async function getMockStore() {
  useStore.setState(useStore.getInitialState(), true);
  const state = useStore.getState();
  await state.init(queryStubMetadata, queryStubDataVersion, queryStubCardData);
  return useStore;
}
