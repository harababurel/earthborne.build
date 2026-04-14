import type { Card } from "@arkham-build/shared";
import { splitMultiValue } from "@/utils/card-utils";
import { displayPackName } from "@/utils/formatting";
import type {
  FieldDescriptor,
  FieldLookup,
  FieldLookupContext,
  FieldType,
} from "./interpreter.types";

export class BackArray<T> extends Array<T> {
  constructor(items: T[]) {
    super(...items);
  }
}

interface FieldDefinition {
  aliases?: string[];
  legacyAlias?: string;
  lookup: (onlyBacks: boolean) => FieldLookup;
  name: string;
  type: FieldType;
}

const fieldDefinitions: FieldDefinition[] = [
  // Approach icons — icons committed as effort during tests.
  {
    aliases: ["conflict", "c"],
    lookup: backResolver((card) => card.approach_conflict ?? null),
    name: "approach_conflict",
    type: "number",
  },
  {
    aliases: ["reason", "re"],
    lookup: backResolver((card) => card.approach_reason ?? null),
    name: "approach_reason",
    type: "number",
  },
  {
    aliases: ["exploration", "ex"],
    lookup: backResolver((card) => card.approach_exploration ?? null),
    name: "approach_exploration",
    type: "number",
  },
  {
    aliases: ["connection", "cn"],
    lookup: backResolver((card) => card.approach_connection ?? null),
    name: "approach_connection",
    type: "number",
  },

  // Aspect stat values (on aspect cards only).
  {
    aliases: ["awa"],
    lookup: backResolver((card) => card.aspect_awareness ?? null),
    name: "awareness",
    type: "number",
  },
  {
    aliases: ["fit"],
    lookup: backResolver((card) => card.aspect_fitness ?? null),
    name: "fitness",
    type: "number",
  },
  {
    aliases: ["foc"],
    lookup: backResolver((card) => card.aspect_focus ?? null),
    name: "focus",
    type: "number",
  },
  {
    aliases: ["spi"],
    lookup: backResolver((card) => card.aspect_spirit ?? null),
    name: "spirit",
    type: "number",
  },

  // Background/specialty/category membership.
  {
    aliases: ["bg"],
    lookup: backResolver((card) => card.background_type ?? null),
    name: "background",
    type: "string",
  },
  {
    aliases: ["cat"],
    lookup: backResolver((card) => card.category ?? null),
    name: "category",
    type: "string",
  },
  {
    aliases: ["sp"],
    lookup: backResolver((card) => card.specialty_type ?? null),
    name: "specialty",
    type: "string",
  },

  // Cost and aspect requirements.
  {
    aliases: ["co"],
    lookup: backResolver((card) => card.energy_cost ?? null),
    name: "cost",
    type: "number",
  },
  {
    aliases: ["ea"],
    lookup: backResolver((card, { i18n }) => {
      if (!card.energy_aspect) return null;
      if (i18n.language === "en") return card.energy_aspect;
      return [
        card.energy_aspect,
        i18n.t(`common.aspects.${card.energy_aspect}`),
      ];
    }),
    name: "energy_aspect",
    type: "string",
  },
  {
    aliases: ["ar"],
    lookup: backResolver((card, { i18n }) => {
      if (!card.aspect_requirement_type) return null;
      if (i18n.language === "en") return card.aspect_requirement_type;
      return [
        card.aspect_requirement_type,
        i18n.t(`common.aspects.${card.aspect_requirement_type}`),
      ];
    }),
    name: "aspect_requirement",
    type: "string",
  },
  {
    aliases: ["arv"],
    lookup: backResolver((card) => card.aspect_requirement_value ?? null),
    name: "aspect_requirement_value",
    type: "number",
  },

  // Gear equip value.
  {
    aliases: ["eq"],
    lookup: backResolver((card) => card.equip_value ?? null),
    name: "equip",
    type: "number",
  },

  // Path card thresholds.
  {
    aliases: ["pr"],
    lookup: backResolver((card) => card.presence ?? null),
    name: "presence",
    type: "number",
  },
  {
    aliases: ["ha"],
    lookup: backResolver((card) => card.harm_threshold ?? null),
    name: "harm",
    type: "number",
  },
  {
    aliases: ["pg"],
    lookup: backResolver((card) => card.progress_threshold ?? null),
    name: "progress",
    type: "number",
  },

  // Card text fields.
  {
    aliases: ["fl"],
    lookup: backResolver((card) => card.flavor ?? null),
    name: "flavor",
    type: "text",
  },
  {
    aliases: ["na"],
    lookup: backResolver((card) => card.name),
    name: "name",
    type: "string",
  },
  {
    aliases: ["txt"],
    lookup: backResolver((card) => card.text ?? null),
    name: "text",
    type: "text",
  },
  {
    aliases: ["tr"],
    lookup: backResolver((card, { i18n }) => {
      const value = card.traits;
      if (value == null) return null;

      const traits = splitMultiValue(value);
      if (i18n.language === "en") return traits;

      return [
        ...traits,
        ...traits.map((trait) => i18n.t(`common.traits.${trait}`)),
      ];
    }),
    name: "trait",
    type: "string",
  },
  {
    aliases: ["kw"],
    lookup: backResolver((card) => card.keywords ?? null),
    name: "keyword",
    type: "string",
  },

  // Type and identity.
  {
    aliases: ["code"],
    lookup: backResolver((card) => card.code),
    name: "id",
    type: "string",
  },
  {
    aliases: ["ty"],
    lookup: backResolver((card, { i18n }) => {
      if (i18n.language === "en") return card.type_code;
      return [card.type_code, i18n.t(`common.type.${card.type_code}`)];
    }),
    name: "type",
    type: "string",
  },

  // Pack/set membership.
  {
    aliases: ["pa"],
    lookup: backResolver((card, { metadata }) => {
      const setCode = card.set_code ?? "";
      const pack = setCode ? metadata.packs[setCode] : undefined;
      if (!pack) return setCode || null;
      return [card.set_code, displayPackName(pack)];
    }),
    name: "pack",
    type: "string",
  },
  {
    aliases: ["sc"],
    lookup: backResolver((card) => card.set_code),
    name: "set",
    type: "string",
  },

  // Meta.
  {
    aliases: ["dl", "limit"],
    lookup: backResolver((card) => card.deck_limit ?? null),
    name: "deck_limit",
    type: "number",
  },
  {
    aliases: ["il", "illu"],
    lookup: backResolver((card) => card.illustrator ?? null),
    name: "illustrator",
    type: "string",
  },
  {
    lookup: () => (card, ctx) => {
      if (!ctx.deck) return null;
      return ctx.deck.slots[card.code] ?? null;
    },
    name: "in_deck",
    type: "number",
  },
  {
    aliases: ["xp"],
    lookup: backResolver((card) => card.is_expert ?? false),
    name: "is_expert",
    type: "boolean",
  },
  {
    aliases: ["un"],
    lookup: backResolver((card) => card.is_unique ?? false),
    name: "is_unique",
    type: "boolean",
  },
  {
    aliases: ["qt", "qty"],
    lookup: backResolver((card) => card.quantity ?? null),
    name: "quantity",
    type: "number",
  },

  // Token on the card.
  {
    aliases: ["tok"],
    lookup: backResolver((card) => card.token_name ?? null),
    name: "token",
    type: "string",
  },
];

// ER cards don't have separate back-card representations in the data model,
// so backResolver simply wraps the resolver transparently for both front and
// back variants. The onlyBacks parameter is kept to satisfy the FieldDefinition
// interface used by buildAllFields.
function backResolver(resolver: FieldLookup) {
  return (_onlyBacks = false) => {
    return (card: Card, ctx: FieldLookupContext) => resolver(card, ctx);
  };
}

function buildAllFields(): Record<string, FieldDescriptor> {
  const map: Record<string, FieldDescriptor> = {};

  for (const field of fieldDefinitions) {
    const descriptor: FieldDescriptor = {
      lookup: field.lookup(false),
      type: field.type,
    };

    map[field.name] = descriptor;

    const backField = {
      lookup: field.lookup(true),
      type: field.type,
    };

    map[`back:${field.name}`] = backField;

    if (field.aliases) {
      for (const alias of field.aliases) {
        map[alias] = descriptor;
        map[`back:${alias}`] = backField;
      }
    }

    if (field.legacyAlias) {
      map[field.legacyAlias] = descriptor;
    }
  }

  return map;
}

export const fields = buildAllFields();
