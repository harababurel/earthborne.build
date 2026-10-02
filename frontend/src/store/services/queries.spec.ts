import { afterEach, describe, expect, it, vi } from "vitest";
import { queryCards, queryDataVersion, queryMetadata } from "./queries";

afterEach(() => vi.unstubAllGlobals());

describe("localized metadata requests", () => {
  it("sends the locale to every metadata endpoint and retains English pack names", async () => {
    const fetchMock = vi.fn((url: string) => {
      const data = url.includes("/packs")
        ? {
            data: [
              {
                id: "ebr",
                name: "Guardabosques",
                real_name: "Earthborne Rangers",
                short_name: "EBR",
                position: 1,
              },
            ],
          }
        : url.includes("/sets")
          ? { data: [] }
          : url.includes("/cards")
            ? { data: [] }
            : { locale: "es" };
      return Promise.resolve(
        new Response(JSON.stringify(data), {
          headers: { "Content-Type": "application/json" },
        }),
      );
    });
    vi.stubGlobal("fetch", fetchMock);
    const metadata = await queryMetadata("es");
    await queryCards("es");
    expect(await queryDataVersion("es")).toMatchObject({ locale: "es" });
    expect(metadata.pack[0]).toMatchObject({
      name: "Guardabosques",
      real_name: "Earthborne Rangers",
    });
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      `${import.meta.env.VITE_API_URL}/v2/public/packs?locale=es`,
      `${import.meta.env.VITE_API_URL}/v2/public/sets?locale=es`,
      `${import.meta.env.VITE_API_URL}/v2/public/cards?locale=es`,
      `${import.meta.env.VITE_API_URL}/version?locale=es`,
    ]);
  });
});
