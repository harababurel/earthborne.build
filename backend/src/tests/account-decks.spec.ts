import { describeAccountEntityCrud } from "./account-entity-crud.ts";
import { makeDeck } from "./test-utils.ts";

describeAccountEntityCrud({
  label: "deck",
  path: "decks",
  table: "account_deck",
  responseKey: "decks",
  makeEntity: makeDeck,
});
