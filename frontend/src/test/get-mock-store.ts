import allCardStub from "@test/fixtures/stubs/all_card.json";
import dataVersionStub from "@test/fixtures/stubs/data_version.json";
import metadataStub from "@test/fixtures/stubs/metadata.json";
import { useStore } from "@/store";
import type {
  AllCardResponse,
  DataVersionResponse,
  MetadataResponse,
} from "@/store/services/queries";

// Stubs use the legacy AH JSON shape; cast through unknown to satisfy ER types.
const metadataAny = metadataStub as unknown as {
  data: { pack: MetadataResponse["pack"] };
};
const dataVersionAny = dataVersionStub as unknown as {
  data?: { all_card_updated?: DataVersionResponse[] };
};
const allCardAny = allCardStub as unknown as {
  data?: { all_card?: AllCardResponse };
};

function queryStubMetadata(): Promise<MetadataResponse> {
  return Promise.resolve({
    pack: metadataAny.data.pack,
  });
}

function queryStubDataVersion(): Promise<DataVersionResponse> {
  const dataVersion =
    dataVersionAny.data?.all_card_updated?.[0] ?? dataVersionAny;
  return Promise.resolve(dataVersion as DataVersionResponse);
}

function queryStubCardData(): Promise<AllCardResponse> {
  const allCards = allCardAny.data?.all_card ?? allCardAny;
  return Promise.resolve(allCards as AllCardResponse);
}

export async function getMockStore() {
  useStore.setState(useStore.getInitialState(), true);
  const state = useStore.getState();
  await state.init(queryStubMetadata, queryStubDataVersion, queryStubCardData);
  return useStore;
}
