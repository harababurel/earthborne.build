import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { CardListContainer } from "@/components/card-list/card-list-container";
import { CardModalProvider } from "@/components/card-modal/card-modal-provider";
import { DeckCollection } from "@/components/deck-collection/deck-collection";
import { ErCardTypeFilter } from "@/components/filters/er-card-type-filter";
import { Filters } from "@/components/filters/filters";
import { PageTitle } from "@/components/ui/page-title";
import { useTabUrlState } from "@/components/ui/tabs.hooks";
import { ListLayout } from "@/layouts/list-layout";
import { ListLayoutContextProvider } from "@/layouts/list-layout-context-provider";
import { useStore } from "@/store";
import { selectIsInitialized } from "@/store/selectors/shared";
import { browseTypeSystemFilter } from "./browse/index";
import type { CardTypeTab } from "./browse/set-tree";

function Index() {
  const { t } = useTranslation();

  const [cardTypeTab, setCardTypeTab] = useTabUrlState<CardTypeTab>(
    "ranger",
    "type",
  );

  const activeListId = useStore((state) => state.activeList);
  const isInitalized = useStore(selectIsInitialized);
  const addList = useStore((state) => state.addList);
  const setActiveList = useStore((state) => state.setActiveList);

  useEffect(() => {
    addList(
      "index",
      { card_type: "", ownership: "all", fan_made_content: "all" },
      {
        additionalFilters: ["illustrator"],
        systemFilter: browseTypeSystemFilter(cardTypeTab),
      },
    );
    setActiveList("index");
  }, [cardTypeTab, addList, setActiveList]);

  if (!isInitalized || !activeListId?.startsWith("index")) return null;

  return (
    <CardModalProvider>
      <PageTitle>{t("browse.title")}</PageTitle>
      <ListLayoutContextProvider>
        <ListLayout
          filters={
            <Filters targetDeck={undefined}>
              <ErCardTypeFilter
                value={cardTypeTab}
                onValueChange={setCardTypeTab}
              />
            </Filters>
          }
          sidebar={<DeckCollection />}
          sidebarWidthMax="var(--sidebar-width-one-col)"
        >
          {(props) => <CardListContainer {...props} />}
        </ListLayout>
      </ListLayoutContextProvider>
    </CardModalProvider>
  );
}

export default Index;
