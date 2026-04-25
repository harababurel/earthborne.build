import type { Card } from "@earthborne-build/shared";
import type { LookupTables } from "@/store/lib/lookup-tables.types";
import type { Metadata } from "@/store/slices/metadata.types";
import { cycleOrPack, displayAttribute } from "@/utils/card-utils";
import { displayPackName } from "@/utils/formatting";

export type CardFormat =
  | "paragraph"
  | "paragraph_colored"
  | "header"
  | "header_with_set";

type Padding = "left" | "right" | "both" | false;

type TemplateStringPlaceholders = "class" | "name" | "code" | "set";

type CardFormatDefinition = {
  templateString: string;
  placeholderOptions: {
    class: {
      padding: Padding;
    };
    name: {
      classColored: boolean;
      subname: {
        display: boolean | "disambiguate";
        small: boolean;
        parentheses: boolean;
        padding: Padding;
      };
      level: {
        display: boolean | "disambiguate";
        type: "dots" | "number-parentheses" | "number-parenteses-with-zero";
        padding: Padding;
      };
    };
    set: {
      small: boolean;
      parentheses: boolean;
      collectionNumber: boolean;
      padding: Padding;
    };
  };
};

export const CARD_FORMATS: Record<CardFormat, CardFormatDefinition> = {
  paragraph: {
    templateString: "[{name}](/card/{code})",
    placeholderOptions: {
      class: {
        padding: "right",
      },
      name: {
        classColored: false,
        subname: {
          display: "disambiguate",
          small: true,
          parentheses: true,
          padding: "left",
        },
        level: {
          display: "disambiguate",
          type: "number-parentheses",
          padding: "left",
        },
      },
      set: {
        small: true,
        parentheses: true,
        collectionNumber: false,
        padding: "left",
      },
    },
  },
  paragraph_colored: {
    templateString: "[{name}](/card/{code})",
    placeholderOptions: {
      class: {
        padding: "right",
      },
      name: {
        classColored: true,
        subname: {
          display: "disambiguate",
          small: true,
          parentheses: true,
          padding: "left",
        },
        level: {
          display: "disambiguate",
          type: "number-parentheses",
          padding: "left",
        },
      },
      set: {
        small: true,
        parentheses: true,
        collectionNumber: false,
        padding: "left",
      },
    },
  },
  header: {
    templateString: "{class}[**{name}**](/card/{code})",
    placeholderOptions: {
      class: {
        padding: "right",
      },
      name: {
        classColored: true,
        subname: {
          display: "disambiguate",
          small: true,
          parentheses: true,
          padding: "left",
        },
        level: {
          display: true,
          type: "dots",
          padding: "left",
        },
      },
      set: {
        small: true,
        parentheses: true,
        collectionNumber: false,
        padding: "left",
      },
    },
  },
  header_with_set: {
    templateString: "{class}[**{name}**](/card/{code}){set}",
    placeholderOptions: {
      class: {
        padding: "right",
      },
      name: {
        classColored: true,
        subname: {
          display: "disambiguate",
          small: true,
          parentheses: true,
          padding: "left",
        },
        level: {
          display: true,
          type: "dots",
          padding: "left",
        },
      },
      set: {
        small: true,
        parentheses: true,
        collectionNumber: true,
        padding: "left",
      },
    },
  },
};

export function cardFormatDefinition(value: CardFormat) {
  return CARD_FORMATS[value];
}

function replacePlaceholder(
  str: string,
  placeholder: TemplateStringPlaceholders,
  replaceWith: string,
) {
  return str.replaceAll(`{${placeholder}}`, replaceWith);
}

function pad(str: string, padding: Padding): string {
  switch (padding) {
    case "left":
      return ` ${str}`;
    case "right":
      return `${str} `;
    case "both":
      return ` ${str} `;
    default:
      return str;
  }
}

function wrapHtmlTag(
  str: string,
  tag: string,
  attributes?: { [k: string]: string },
): string {
  if (!attributes) {
    return `<${tag}>${str}</${tag}>`;
  }

  const attributeString = Object.entries(attributes)
    .map(([key, value]) => `${key}="${value}"`)
    .join(" ");

  return `<${tag} ${attributeString}>${str}</${tag}>`;
}

function wrapParentheses(str: string): string {
  return `(${str})`;
}

function factionIcon(faction: string | undefined | null): string {
  switch (faction) {
    case "seeker":
    case "guardian":
    case "rogue":
    case "mystic":
    case "survivor":
      return `<span class="icon-${faction}"></span>`;
    default:
      return "";
  }
}

function getCardFactionIcons(card: Card): string {
  return [card.energy_aspect ?? card.aspect_requirement_type]
    .map(factionIcon)
    .filter(Boolean)
    .join("");
}

function getCardColor(card: Card): string {
  const aspect = card.energy_aspect ?? card.aspect_requirement_type;
  switch (aspect) {
    case "AWA":
    case "FIT":
    case "FOC":
    case "SPI":
      return `color-${aspect}`;
    default:
      return "";
  }
}

function wrapClassColor(str: string, card: Card): string {
  return wrapHtmlTag(str, "span", { class: getCardColor(card) });
}

export function cardToMarkdown(
  card: Card,
  metadata: Metadata,
  lookupTables: LookupTables,
  format: CardFormatDefinition,
) {
  let str = format.templateString;

  str = replacePlaceholder(str, "code", card.code);
  str = replacePlaceholder(str, "class", renderClass(card, format));
  str = replacePlaceholder(str, "set", renderSet(card, format, metadata));
  str = replacePlaceholder(
    str,
    "name",
    renderName(card, format, metadata, lookupTables),
  );

  return str;
}

function renderClass(card: Card, format: CardFormatDefinition) {
  const padding = format.placeholderOptions.class.padding;
  const str = getCardFactionIcons(card);

  if (!str || !padding) {
    return str;
  }

  return pad(str, padding);
}

function renderSet(
  card: Card,
  format: CardFormatDefinition,
  metadata: Metadata,
) {
  const pack = metadata.packs[card.pack_code];
  const cycle = metadata.cycles[pack.cycle_code];
  const config = format.placeholderOptions.set;

  let str = displayPackName(cycleOrPack(cycle, pack));

  if (config.collectionNumber) {
    str += ` #${card.set_position ?? card.set_code}`;
  }

  if (config.parentheses) {
    str = wrapParentheses(str);
  }

  if (config.small) {
    str = wrapHtmlTag(str, "span", { class: "small" });
  }

  if (config.padding) {
    str = pad(str, config.padding);
  }

  return str;
}

function renderName(
  card: Card,
  format: CardFormatDefinition,
  metadata: Metadata,
  lookupTables: LookupTables,
) {
  const config = format.placeholderOptions.name;

  const name = displayAttribute(card, "name");
  const subname = renderSubname(card, format, metadata, lookupTables);
  const level = renderLevel(card, format, lookupTables);

  const title = `${name}${subname}${level}`;
  return config.classColored ? wrapClassColor(title, card) : title;
}

function renderSubname(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _card: Card,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _format: CardFormatDefinition,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _metadata: Metadata,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _lookupTables: LookupTables,
) {
  // ER cards have no subname field.
  return "";
}

function renderLevel(
  _card: Card,
  _format: CardFormatDefinition,
  _lookupTables: LookupTables,
) {
  return "";
}
