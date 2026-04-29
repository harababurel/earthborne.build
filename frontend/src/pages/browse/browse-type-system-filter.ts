import type { Card } from "@earthborne-build/shared";
import type { CardTypeFilter } from "@/store/slices/lists.types";
import type { Filter } from "@/utils/fp";
import type { CardTypeTab } from "./set-tree";

export function browseTabListCardType(tab: CardTypeTab): CardTypeFilter {
  switch (tab) {
    case "ranger":
      return "player";
    case "path":
      return "path";
    case "location":
    case "weather":
    case "mission":
    case "role":
    case "aspect":
    case "challenge":
      return "";
  }
}

export function browseTypeSystemFilter(tab: CardTypeTab): Filter {
  switch (tab) {
    case "ranger":
      return (card: Card) => card.category != null;
    case "path":
      return (card: Card) =>
        card.type_code === "path" ||
        ((card.type_code === "being" || card.type_code === "feature") &&
          card.category == null);
    case "location":
      return (card: Card) => card.type_code === "location";
    case "weather":
      return (card: Card) => card.type_code === "weather";
    case "mission":
      return (card: Card) => card.type_code === "mission";
    case "role":
      return (card: Card) => card.type_code === "role";
    case "aspect":
      return (card: Card) => card.type_code === "aspect";
    case "challenge":
      return (card: Card) => card.type_code === "challenge";
  }
}
