import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect } from "vitest";
import type { Database } from "../db/db.ts";
import { test } from "./test-utils.ts";

let imageDir: string;

beforeEach(async () => {
  imageDir = await fs.mkdtemp(path.join(os.tmpdir(), "earthborne-images-"));
});

afterEach(async () => {
  await fs.rm(imageDir, { recursive: true, force: true });
});

describe("GET /images/:code", () => {
  test("serves full JPEG card images", async ({ dependencies }) => {
    dependencies.config.IMAGE_DIR = imageDir;
    await insertCard(dependencies.db);
    await fs.mkdir(path.join(imageDir, "ebr"), { recursive: true });
    await fs.writeFile(path.join(imageDir, "ebr", "01010.jpg"), "jpeg");

    const res = await dependencies.app.request("/images/01010");

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/jpeg");
    expect(res.headers.get("cache-control")).toBe(
      "public, max-age=31536000, immutable",
    );
    expect(await res.text()).toBe("jpeg");
  });

  test("serves WebP thumbnails for the thumb variant", async ({
    dependencies,
  }) => {
    dependencies.config.IMAGE_DIR = imageDir;
    await insertCard(dependencies.db);
    await fs.mkdir(path.join(imageDir, "ebr", "thumbs"), { recursive: true });
    await fs.writeFile(path.join(imageDir, "ebr", "01010.jpg"), "jpeg");
    await fs.writeFile(
      path.join(imageDir, "ebr", "thumbs", "01010.webp"),
      "webp",
    );

    const res = await dependencies.app.request("/images/01010?variant=thumb");

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/webp");
    expect(await res.text()).toBe("webp");
  });

  test("does not fall back to the full image for missing thumbnails", async ({
    dependencies,
  }) => {
    dependencies.config.IMAGE_DIR = imageDir;
    await insertCard(dependencies.db);
    await fs.mkdir(path.join(imageDir, "ebr"), { recursive: true });
    await fs.writeFile(path.join(imageDir, "ebr", "01010.jpg"), "jpeg");

    const res = await dependencies.app.request("/images/01010?variant=thumb");

    expect(res.status).toBe(404);
  });
});

async function insertCard(db: Database) {
  await db
    .insertInto("pack")
    .values({
      id: "ebr",
      name: "Earthborne Rangers",
      short_name: null,
      position: 1,
    })
    .execute();

  await db
    .insertInto("card_type")
    .values({ id: "path", name: "Path" })
    .execute();
  await db
    .insertInto("category")
    .values({ id: "path", name: "Path" })
    .execute();

  await db
    .insertInto("card")
    .values({
      id: "01010",
      code: "01010",
      pack_id: "ebr",
      category_id: "path",
      type_id: "path",
      name: "Test Card",
    })
    .execute();
}
