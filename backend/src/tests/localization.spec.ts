import { CardSchema, PackSchema } from "@earthborne-build/shared";
import { describe, expect } from "vitest";
import type { Database } from "../db/db.ts";
import { test } from "./test-utils.ts";

describe("localized public metadata", () => {
  test("translates cards field by field without changing English-derived values", async ({
    dependencies: { app, db },
  }) => {
    await seedMetadata(db);
    const english = CardSchema.parse(
      await (await app.request("/v2/public/cards/01001")).json(),
    );
    const res = await app.request("/v2/public/cards/01001?locale=es");
    expect(res.status).toBe(200);
    const translated = CardSchema.parse(await res.json());
    expect(translated).toEqual({
      ...english,
      name: "Explorador",
      text: "Texto traducido sin palabras clave.",
      challenge_sun: "Efecto de sol",
      challenge_mountain: "Efecto de montaña",
      challenge_crest: "Efecto de cresta",
      token_name: "carga",
      token_plural: "cargas",
    });
    expect(translated).toMatchObject({
      real_name: "Seeker",
      flavor: "English flavor",
      traits: "Expert / Tool",
      keywords: ["unique", "persistent"],
      is_unique: true,
      is_expert: true,
      alt_image_url: "01001a",
    });

    const list = await app.request("/v2/public/cards?locale=es");
    expect(list.status).toBe(200);
    const body = (await list.json()) as { data: unknown[] };
    expect(body.data.map((card) => CardSchema.parse(card))).toEqual([
      translated,
      expect.objectContaining({
        name: "Untranslated",
        real_name: "Untranslated",
      }),
    ]);
  });

  test("translates packs and sets with English fallback and stable identifiers", async ({
    dependencies: { app, db },
  }) => {
    await seedMetadata(db);
    const packs = await app.request("/v2/public/packs?locale=es");
    expect(packs.status).toBe(200);
    const packBody = (await packs.json()) as { data: unknown[] };
    expect(packBody.data.map((pack) => PackSchema.parse(pack))).toEqual([
      {
        id: "ebr",
        code: "ebr",
        name: "Guardabosques",
        real_name: "Earthborne Rangers",
        short_name: "EBR",
        position: 1,
      },
      {
        id: "sib",
        code: "sib",
        name: "Untranslated Pack",
        real_name: "Untranslated Pack",
        short_name: null,
        position: 2,
      },
    ]);

    const sets = await app.request("/v2/public/sets?locale=es");
    expect(sets.status).toBe(200);
    expect(await sets.json()).toEqual({
      data: expect.arrayContaining([
        expect.objectContaining({
          id: "test",
          name: "Conjunto",
          pack_code: "ebr",
        }),
        expect.objectContaining({
          id: "other",
          name: "Other Set",
          pack_code: "sib",
        }),
      ]),
    });
  });

  test("returns English for missing, explicit English, and unsupported locales", async ({
    dependencies: { app, db },
  }) => {
    await seedMetadata(db);
    for (const path of [
      "/v2/public/cards",
      "/v2/public/cards/01001",
      "/v2/public/packs",
      "/v2/public/sets",
    ]) {
      const english = await (await app.request(path)).json();
      for (const locale of ["en", "pseudo", "unknown", ""]) {
        const res = await app.request(`${path}?locale=${locale}`);
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual(english);
      }
    }
  });

  test("selects only the requested locale and falls back for incomplete token translations", async ({
    dependencies: { app, db },
  }) => {
    await seedMetadata(db);
    await db
      .insertInto("translation")
      .values([
        {
          locale: "de",
          entity: "card",
          entity_id: "01001",
          field: "name",
          value: "Sucher",
        },
        {
          locale: "de",
          entity: "card",
          entity_id: "01001",
          field: "flavor",
          value: "Deutscher Text",
        },
        {
          locale: "de",
          entity: "token",
          entity_id: "charge",
          field: "name",
          value: "Ladung",
        },
      ])
      .execute();
    const german = CardSchema.parse(
      await (await app.request("/v2/public/cards/01001?locale=de")).json(),
    );
    expect(german).toMatchObject({
      name: "Sucher",
      flavor: "Deutscher Text",
      text: "Unique. Persistent.<hr>English rules",
      token_name: "Ladung",
      token_plural: "charges",
      challenge_sun: "English sun",
    });
  });
});

describe("GET /version localization", () => {
  test("reports supported locales and the separate translation timestamp", async ({
    dependencies: { app, db },
  }) => {
    await seedMetadata(db);
    await db.deleteFrom("app_metadata").execute();
    await db
      .insertInto("app_metadata")
      .values([
        { key: "cards_updated_at", value: "2026-10-01T10:00:00.000Z" },
        { key: "translations_updated_at", value: "2026-10-02T11:00:00.000Z" },
      ])
      .execute();

    for (const locale of ["en", "de", "es", "fr", "it", "ru"]) {
      const res = await app.request(`/version?locale=${locale}`);
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({
        card_count: 2,
        cards_updated_at: "2026-10-01T10:00:00.000Z",
        translation_updated_at: "2026-10-02T11:00:00.000Z",
        locale,
      });
    }
    for (const query of ["", "?locale=pseudo", "?locale=unknown"]) {
      const res = await app.request(`/version${query}`);
      expect(await res.json()).toMatchObject({ locale: "en" });
    }
  });

  test("uses epoch timestamps before any metadata has been ingested", async ({
    dependencies: { app, db },
  }) => {
    await db.deleteFrom("app_metadata").execute();
    const res = await app.request("/version?locale=fr");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      card_count: 0,
      cards_updated_at: "1970-01-01T00:00:00.000Z",
      translation_updated_at: "1970-01-01T00:00:00.000Z",
      locale: "fr",
    });
  });
});

async function seedMetadata(db: Database) {
  await db
    .insertInto("pack")
    .values([
      { id: "ebr", name: "Earthborne Rangers", short_name: "EBR", position: 1 },
      { id: "sib", name: "Untranslated Pack", short_name: null, position: 2 },
    ])
    .execute();
  await db
    .insertInto("card_type")
    .values({ id: "gear", name: "Gear" })
    .execute();
  await db
    .insertInto("category")
    .values({ id: "ranger", name: "Ranger" })
    .execute();
  await db
    .insertInto("card_set")
    .values([
      { id: "test", name: "Test Set", type_id: null, size: 2 },
      { id: "other", name: "Other Set", type_id: null, size: 1 },
    ])
    .execute();
  await db
    .insertInto("token")
    .values({ id: "charge", name: "charge", plurals: "charge,charges" })
    .execute();
  await db
    .insertInto("card")
    .values([
      {
        id: "01001",
        code: "01001",
        name: "Seeker",
        pack_id: "ebr",
        set_id: "test",
        type_id: "gear",
        category_id: "ranger",
        text: "Unique. Persistent.<hr>English rules",
        traits: "Expert / Tool",
        flavor: "English flavor",
        token_id: "charge",
        token_count: 2,
        sun_challenge: "English sun",
        mountain_challenge: "English mountain",
        crest_challenge: "English crest",
        alt_imagesrc: "sheet.jpg",
      },
      {
        id: "02001",
        code: "02001",
        name: "Untranslated",
        pack_id: "sib",
        set_id: "other",
        type_id: "gear",
        category_id: "ranger",
      },
    ])
    .execute();
  await db
    .insertInto("translation")
    .values([
      {
        locale: "es",
        entity: "card",
        entity_id: "01001",
        field: "name",
        value: "Explorador",
      },
      {
        locale: "es",
        entity: "card",
        entity_id: "01001",
        field: "text",
        value: "Texto traducido sin palabras clave.",
      },
      {
        locale: "es",
        entity: "card",
        entity_id: "01001",
        field: "traits",
        value: "Experto / Herramienta",
      },
      {
        locale: "es",
        entity: "card",
        entity_id: "01001",
        field: "sun_challenge",
        value: "Efecto de sol",
      },
      {
        locale: "es",
        entity: "card",
        entity_id: "01001",
        field: "mountain_challenge",
        value: "Efecto de montaña",
      },
      {
        locale: "es",
        entity: "card",
        entity_id: "01001",
        field: "crest_challenge",
        value: "Efecto de cresta",
      },
      {
        locale: "es",
        entity: "token",
        entity_id: "charge",
        field: "name",
        value: "carga",
      },
      {
        locale: "es",
        entity: "token",
        entity_id: "charge",
        field: "plurals",
        value: "carga,cargas",
      },
      {
        locale: "es",
        entity: "pack",
        entity_id: "ebr",
        field: "name",
        value: "Guardabosques",
      },
      {
        locale: "es",
        entity: "set",
        entity_id: "test",
        field: "name",
        value: "Conjunto",
      },
    ])
    .execute();
}
