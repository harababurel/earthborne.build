import type { Card } from "@earthborne-build/shared";
import { describe, expect, it } from "vitest";
import {
  cardFrontImageSource,
  cardIllustrator,
  parseCardTextHtml,
} from "./card-utils";

describe("parseCardTextHtml", () => {
  it("maps [right_arrow] to core-conditional span", () => {
    const text = "Exhaust this being. [right_arrow] Suffer 1 injury.";
    const expected =
      'Exhaust this being. <span class="core-conditional"></span> Suffer 1 injury.';
    expect(parseCardTextHtml(text)).toBe(expected);
  });

  it("maps Earthborne specific tokens to core- spans", () => {
    expect(parseCardTextHtml("[harm]")).toBe('<span class="core-harm"></span>');
    expect(parseCardTextHtml("[progress]")).toBe(
      '<span class="core-progress"></span>',
    );
    expect(parseCardTextHtml("[sun]")).toBe('<span class="core-sun"></span>');
    expect(parseCardTextHtml("[aspiration]")).toBe(
      '<span class="core-aspiration"></span>',
    );
  });

  it("maps [buck] to an inline Earthborne icon", () => {
    expect(parseCardTextHtml("[buck]")).toContain('<span class="core-buck">');
    expect(parseCardTextHtml("[buck]")).toContain("<svg");
    expect(parseCardTextHtml("[buck]")).toContain('fill="currentColor"');
  });

  it("maps stat tokens to bold colored text", () => {
    expect(parseCardTextHtml("[FIT]")).toBe('<b class="color-FIT">FIT</b>');
    expect(parseCardTextHtml("[SPI]")).toBe('<b class="color-SPI">SPI</b>');
  });

  it("maps known legacy icon tokens to icon- i tags", () => {
    expect(parseCardTextHtml("[action]")).toBe('<i class="icon-action"></i>');
  });

  it("handles numeric values in brackets as literal text", () => {
    expect(parseCardTextHtml("Repair [2]")).toBe("Repair [2]");
  });

  it("handles unknown values in brackets as literal text", () => {
    expect(parseCardTextHtml("Mend [X]")).toBe("Mend [X]");
  });

  it("handles escaped brackets", () => {
    expect(parseCardTextHtml("Escaped \\[token]")).toBe("Escaped [token]");
  });

  it("handles bold italic markers", () => {
    expect(parseCardTextHtml("[[text]]")).toBe("<b><em>text</em></b>");
  });

  it("maps notable event tags to a styled span", () => {
    expect(parseCardTextHtml("<e>CHIMNEY IS SETTLED</e>")).toBe(
      '<span class="card-notable-event">CHIMNEY IS SETTLED</span>',
    );
  });

  it("maps inline flavor tags to a styled span", () => {
    expect(parseCardTextHtml("<f>the vaulted walkways to</f>")).toBe(
      '<span class="card-flavor-text">the vaulted walkways to</span>',
    );
  });

  it("maps objective tags to a styled span", () => {
    expect(
      parseCardTextHtml("<o><b>Have 0 biscuits:</b> [guide] 1.02</o>"),
    ).toBe(
      '<span class="card-objective-text"><b>Have 0 biscuits:</b> <a class="card-guide-link" href="/rules?tab=campaign-guides#doc-campaign-guides-lure-of-the-valley-missions-1-02"><span class="core-guide"></span> 1.02</a></span>',
    );
  });

  it("links inline guide references to their campaign guide entry", () => {
    expect(parseCardTextHtml("See [guide] 3 for details.")).toBe(
      'See <a class="card-guide-link" href="/rules?tab=campaign-guides#doc-campaign-guides-lure-of-the-valley-white-sky"><span class="core-guide"></span> 3</a> for details.',
    );
  });

  it("resolves letter-suffixed guide references to their parent entry", () => {
    expect(parseCardTextHtml("[guide] 9.2")).toBe(
      '<a class="card-guide-link" href="/rules?tab=campaign-guides#doc-campaign-guides-lure-of-the-valley-marsh-of-rebirth-9-2"><span class="core-guide"></span> 9.2</a>',
    );
  });

  it("prefers the card's own pack over the base game for shared entries", () => {
    expect(parseCardTextHtml("[guide] 44", { packCode: "loa" })).toBe(
      '<a class="card-guide-link" href="/rules?tab=campaign-guides#doc-campaign-guides-legacy-of-the-ancestors-kordo-ranger-veteran"><span class="core-guide"></span> 44</a>',
    );

    expect(parseCardTextHtml("[guide] 44")).toBe(
      '<a class="card-guide-link" href="/rules?tab=campaign-guides#doc-campaign-guides-lure-of-the-valley-kordo-ranger-veteran"><span class="core-guide"></span> 44</a>',
    );
  });

  it("leaves unresolved guide references as a plain icon", () => {
    expect(parseCardTextHtml("[guide] 99999")).toBe(
      '<span class="core-guide"></span> 99999',
    );
  });

  it("does not link escaped guide tokens", () => {
    expect(parseCardTextHtml("\\[guide] 3")).toBe("[guide] 3");
  });

  it("supports line breaks inside objective tags when splitting paragraphs", () => {
    expect(
      parseCardTextHtml("<o>line 1\nline 2</o>", { splitParagraphs: true }),
    ).toBe('<p><span class="card-objective-text">line 1<br>line 2</span></p>');
  });

  it("maps newlines to line breaks", () => {
    expect(parseCardTextHtml("line 1\nline 2")).toBe("line 1<br>line 2");
  });

  it("maps explicit hr tags to styled separators", () => {
    expect(parseCardTextHtml("line 1<hr>line 2")).toBe(
      "line 1<hr class='break'>line 2",
    );
  });

  it("renders known location symbols above location names", () => {
    const result = parseCardTextHtml("<l>Atrox Mountain</l><l>Unknown</l>");

    expect(result).toContain('class="card-location-symbol"');
    expect(result).toContain("atrox-mountain.svg");
    expect(result.indexOf('class="card-location-symbol"')).toBeLessThan(
      result.indexOf('class="card-location-name"'),
    );
    expect(result).toContain(
      '<span class="card-location-cell"><span class="card-location-name"><span class="card-location-initial">U</span>nknown</span></span>',
    );
  });
});

describe("cardFrontImageSource", () => {
  it("uses standard art when mini role art is disabled", () => {
    expect(cardFrontImageSource(miniRoleCard(), false)).toBe("01037");
  });

  it("uses alternate art for ranger role cards when mini role art is enabled", () => {
    expect(cardFrontImageSource(miniRoleCard(), true)).toBe("01037a");
  });

  it("does not use alternate art for non-role cards", () => {
    expect(
      cardFrontImageSource(
        {
          ...miniRoleCard(),
          code: "01039",
          type_code: "gear",
        },
        true,
      ),
    ).toBe("01039");
  });

  it("falls back to standard art when no alternate art is present", () => {
    expect(
      cardFrontImageSource(
        {
          ...miniRoleCard(),
          alt_image_url: null,
        },
        true,
      ),
    ).toBe("01037");
  });
});

describe("cardIllustrator", () => {
  it("uses alternate illustrator only when alternate role art is active", () => {
    const card = miniRoleCard();

    expect(cardIllustrator(card, false)).toBe("Standard Artist");
    expect(cardIllustrator(card, true)).toBe("Alt Artist");
  });
});

function miniRoleCard(): Card {
  return {
    code: "01037",
    name: "Undaunted Seeker",
    pack_code: "ebr",
    type_code: "role",
    category_id: "ranger",
    illustrator: "Standard Artist",
    alt_image_url: "01037a",
    alt_illustrator: "Alt Artist",
  } as Card;
}
