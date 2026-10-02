import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  loadCardTranslations,
  type TranslationSources,
} from "../scripts/card-translations.ts";
import { normalizeTranslationText, parsePo } from "../scripts/po-parser.ts";

describe("PO parsing", () => {
  it("decodes multiline strings and escapes while excluding headers, empty and obsolete entries", () => {
    const entries = parsePo(
      String.raw`msgid ""
msgstr ""
"Language: es\n"

# Translator comment
msgctxt "01001.text"
msgid "Scout.\n"
"Draw a card."
msgstr "Explora.\n"
"Roba una carta llamada \"Eco\"."

msgctxt "01002.name"
msgid "Untranslated"
msgstr ""

#~ msgctxt "01003.name"
#~ msgid "Removed"
#~ msgstr "Eliminado"
`,
      () => {},
    );
    expect(entries).toEqual([
      {
        id: "01001",
        field: "text",
        source: "Scout.\nDraw a card.",
        value: 'Explora.\nRoba una carta llamada "Eco".',
      },
    ]);
  });

  it("keeps the first duplicate and reports it", () => {
    const warnings: string[] = [];
    const entries = parsePo(
      `msgctxt "01001.name"
msgid "First"
msgstr "Primero"

msgctxt "01001.name"
msgid "Second"
msgstr "Segundo"`,
      (warning) => warnings.push(warning),
    );
    expect(entries.map((e) => e.value)).toEqual(["Primero"]);
    expect(warnings).toEqual([
      expect.stringContaining("Duplicate PO context '01001.name'"),
    ]);
  });

  it("normalizes actual paragraph breaks without breaking wrapped PO strings or icon markup", () => {
    expect(
      normalizeTranslationText("Unique.\r\n<b>Exhaust:</b> [AWA]<hr />Draw."),
    ).toBe("Unique.<hr><b>Exhaust:</b> [AWA]<hr>Draw.");
    expect(() =>
      parsePo('msgctxt "01001.name"\nmsgid "Unclosed', () => {}),
    ).toThrow("line 2");
  });
});

describe("translation loading", () => {
  it("remaps packs, retains stale translations, reports coverage and excludes taboos and unknown fields", async () => {
    const directory = await fs.mkdtemp(
      path.join(os.tmpdir(), "ebr-translations-"),
    );
    try {
      const locale = path.join(directory, "i18n", "es");
      await fs.mkdir(path.join(locale, "packs", "core"), { recursive: true });
      await fs.mkdir(path.join(locale, "taboos"));
      await fs.writeFile(
        path.join(locale, "packs.po"),
        `msgctxt "core.name"
msgid "Core set"
msgstr "Juego básico"`,
      );
      await fs.writeFile(
        path.join(locale, "areas.po"),
        `msgctxt "reach.name"
msgid "Within reach"
msgstr "Al alcance"`,
      );
      await fs.writeFile(
        path.join(locale, "packs", "core", "core.po"),
        `msgctxt "01001.text"
msgid "Unique.\\nDraw."
msgstr "Único.\\nRoba."

msgctxt "01002.text"
msgid "Old rules"
msgstr "Reglas anteriores"

msgctxt "01001.illustrator"
msgid "Artist"
msgstr "Artista"

msgctxt "99999.name"
msgid "Missing card"
msgstr "Carta ausente"`,
      );
      await fs.writeFile(
        path.join(locale, "taboos", "set_01.po"),
        `msgctxt "01001.text"
msgid "Unique.\\nDraw."
msgstr "Taboo text"`,
      );
      const sources: TranslationSources = {
        card: [
          { id: "01001", name: "Card", text: "Unique.<hr>Draw." },
          { id: "01002", text: "Updated rules" },
        ],
        pack: [{ id: "ebr", name: "Core set" }],
        set: [],
        subset: [],
        token: [],
        type: [],
        aspect: [],
        area: [{ id: "within_reach", name: "Within reach" }],
      };
      const reports: string[] = [];
      const rows = await loadCardTranslations(directory, sources, (message) =>
        reports.push(message),
      );
      expect(rows).toEqual(
        expect.arrayContaining([
          {
            locale: "es",
            entity: "area",
            entity_id: "within_reach",
            field: "name",
            value: "Al alcance",
          },
          {
            locale: "es",
            entity: "pack",
            entity_id: "ebr",
            field: "name",
            value: "Juego básico",
          },
          {
            locale: "es",
            entity: "card",
            entity_id: "01001",
            field: "text",
            value: "Único.<hr>Roba.",
          },
          {
            locale: "es",
            entity: "card",
            entity_id: "01002",
            field: "text",
            value: "Reglas anteriores",
          },
        ]),
      );
      expect(rows).toHaveLength(4);
      expect(reports).toContain(
        "Translation coverage es: 4/5 fields, 2/2 cards; 1 outdated sources (retained), 2 ignored entries",
      );
      expect(reports).toContain(
        "Translation coverage it: 0/5 fields, 0/2 cards; 0 outdated sources (retained), 0 ignored entries",
      );
    } finally {
      await fs.rm(directory, { recursive: true, force: true });
    }
  });
});
