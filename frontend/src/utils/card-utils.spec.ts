import { describe, expect, it } from "vitest";
import { parseCardTextHtml } from "./card-utils";

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

  it("maps stat tokens to bold colored text", () => {
    expect(parseCardTextHtml("[FIT]")).toBe('<b class="color-FIT">FIT</b>');
    expect(parseCardTextHtml("[SPI]")).toBe('<b class="color-SPI">SPI</b>');
  });

  it("maps other tokens to icon- i tags", () => {
    expect(parseCardTextHtml("[action]")).toBe('<i class="icon-action"></i>');
  });

  it("handles numeric values in brackets as literal text", () => {
    expect(parseCardTextHtml("Repair [2]")).toBe("Repair [2]");
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

  it("maps newlines to line breaks", () => {
    expect(parseCardTextHtml("line 1\nline 2")).toBe("line 1<br>line 2");
  });

  it("maps explicit hr tags to styled separators", () => {
    expect(parseCardTextHtml("line 1<hr>line 2")).toBe(
      "line 1<hr class='break'>line 2",
    );
  });
});
