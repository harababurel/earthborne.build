import { describeAccountEntityCrud } from "./account-entity-crud.ts";
import { makeCampaign } from "./test-utils.ts";

describeAccountEntityCrud({
  label: "campaign",
  path: "campaigns",
  table: "account_campaign",
  responseKey: "campaigns",
  makeEntity: makeCampaign,
});
