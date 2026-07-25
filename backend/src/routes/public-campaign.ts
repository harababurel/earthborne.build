import {
  CampaignSchema,
  type Deck,
  DeckSchema,
  toPublicCampaign,
} from "@earthborne-build/shared";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import {
  getPublicCampaign,
  getPublicCampaignDecks,
} from "../db/queries/account-campaigns.ts";
import type { HonoEnv } from "../lib/hono-env.ts";

const router = new Hono<HonoEnv>();

router.get("/:id", async (c) => {
  const row = await getPublicCampaign(c.get("db"), c.req.param("id"));

  // A campaign that exists but is not shared must be indistinguishable from one
  // that does not exist, so private campaigns cannot be probed for.
  if (!row) {
    throw new HTTPException(404, { message: "Campaign not found" });
  }

  const campaign = CampaignSchema.parse(JSON.parse(row.data));

  const rows = await getPublicCampaignDecks(
    c.get("db"),
    row.account_id,
    campaign.deck_ids.map(String),
  );

  const decksById = new Map<string, Deck>(
    rows.map((deck) => [deck.id, DeckSchema.parse(JSON.parse(deck.data))]),
  );

  const decks = campaign.deck_ids
    .map((id) => decksById.get(String(id)))
    .filter((deck) => deck != null);

  return c.json(toPublicCampaign(campaign, decks));
});

export default router;
