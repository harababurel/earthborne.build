import { displayAttribute } from "@/utils/card-utils";
import i18n from "@/utils/i18n";
import type { ResolvedCard } from "./types";

export class UnsupportedPublishError extends Error {
  constructor(cards: ResolvedCard[]) {
    const names = cards
      .map(
        (c) =>
          `${displayAttribute(c.card, "name")}`,
      )
      .join(", ");

    super(
      i18n.t("errors.preview_publish", {
        names,
        provider: "deck provider",
      }),
    );
  }
}
