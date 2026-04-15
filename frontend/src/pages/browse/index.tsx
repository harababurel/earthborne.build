import type { Card } from "@arkham-build/shared";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Route, Switch, useParams } from "wouter";
import { CardListContainer } from "@/components/card-list/card-list-container";
import { CardModalProvider } from "@/components/card-modal/card-modal-provider";
import { Filters } from "@/components/filters/filters";
import PackIcon from "@/components/icons/pack-icon";
import { PageTitle } from "@/components/ui/page-title";
import { useTabUrlState } from "@/components/ui/tabs.hooks";
import { ListLayout } from "@/layouts/list-layout";
import { ListLayoutContextProvider } from "@/layouts/list-layout-context-provider";
import { useStore } from "@/store";
import { selectIsInitialized, selectMetadata } from "@/store/selectors/shared";
import { displayPackName } from "@/utils/formatting";
import type { Filter } from "@/utils/fp";
import { BrowseWithFilter } from "./browse-with-filter";
import { type CardTypeTab, SetTree } from "./set-tree";

export function Browse() {
  const { t } = useTranslation();

  const [cardTypeTab, setCardTypeTab] = useTabUrlState<CardTypeTab>(
    "ranger",
    "type",
  );

  const addList = useStore((state) => state.addList);
  const setActiveList = useStore((state) => state.setActiveList);
  const removeList = useStore((state) => state.removeList);

  const listKey = `browse-${cardTypeTab}`;

  const activeList = useStore((state) => state.lists[listKey]);
  const hasList = useStore((state) => !!state.lists[listKey]);
  const isInitalized = useStore(selectIsInitialized);

  useEffect(() => {
    if (!hasList) {
      addList(
        listKey,
        {
          card_type: "",
          ownership: "all",
          fan_made_content: "all",
        },
        {
          systemFilter: browseTypeSystemFilter(cardTypeTab),
        },
      );
    }

    setActiveList(listKey);
  }, [cardTypeTab, addList, hasList, listKey, setActiveList]);

  useEffect(() => {
    return () => {
      for (const tab of ["ranger", "path", "location", "weather", "mission", "role", "aspect", "challenge"] as CardTypeTab[]) {
        removeList(`browse-${tab}`);
      }
      setActiveList(undefined);
    };
  }, [removeList, setActiveList]);

  if (!activeList || !isInitalized) {
    return null;
  }

  return (
    <CardModalProvider>
      <PageTitle>{t("browse.title")}</PageTitle>
      <ListLayoutContextProvider>
        <ListLayout
          noFade
          filters={<Filters targetDeck={undefined} />}
          sidebar={
            <SetTree
              cardTypeTab={cardTypeTab}
              onCardTypeTabChange={setCardTypeTab}
            />
          }
          sidebarWidthMax="var(--sidebar-width-one-col)"
        >
          {(props) => <CardListContainer {...props} />}
        </ListLayout>
      </ListLayoutContextProvider>
    </CardModalProvider>
  );
}

export function BrowsePack() {
  const { pack_code } = useParams<{ pack_code: string }>();
  const pack = useStore((state) =>
    pack_code ? selectMetadata(state).packs[pack_code] : undefined,
  );

  if (!pack_code || !pack) return null;

  return (
    <BrowseWithFilter
      filterKey="pack"
      filterValue={[pack_code]}
      listKeyPrefix="browse-pack"
      icon={<PackIcon code={pack_code} />}
      title={displayPackName(pack)}
    />
  );
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

export default function BrowseRoutes() {
  return (
    <Switch>
      <Route component={Browse} path="/browse" />
      <Route component={BrowsePack} path="/browse/pack/:pack_code" />
    </Switch>
  );
}
