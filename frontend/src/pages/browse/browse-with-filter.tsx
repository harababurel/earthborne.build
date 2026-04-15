import { useEffect } from "react";
import { useTabUrlState } from "@/components/ui/tabs.hooks";
import { CardListContainer } from "@/components/card-list/card-list-container";
import { CardModalProvider } from "@/components/card-modal/card-modal-provider";
import { Filters } from "@/components/filters/filters";
import { PageTitle } from "@/components/ui/page-title";
import { ListLayout } from "@/layouts/list-layout";
import { ListLayoutContextProvider } from "@/layouts/list-layout-context-provider";
import { useStore } from "@/store";
import { selectIsInitialized } from "@/store/selectors/shared";
import { type CardTypeTab, SetTree } from "./set-tree";

interface Props {
  filterKey: "pack";
  filterValue: string[];
  listKeyPrefix: string;
  icon: React.ReactNode;
  title: string;
}

export function BrowseWithFilter(props: Props) {
  const { filterKey, filterValue, listKeyPrefix, title } = props;

  const activeListId = useStore((state) => state.activeList);
  const isInitalized = useStore(selectIsInitialized);

  const activeList = useStore((state) => state.lists[state.activeList ?? ""]);
  const addList = useStore((state) => state.addList);
  const setActiveList = useStore((state) => state.setActiveList);
  const removeList = useStore((state) => state.removeList);

  const activeCode = filterValue.at(0);

  const [cardTypeTab, setCardTypeTab] = useTabUrlState<CardTypeTab>(
    "ranger",
    "type",
  );

  const listKey = `${listKeyPrefix}-${activeCode}`;

  useEffect(() => {
    addList(
      listKey,
      {
        card_type: "",
        ownership: "all",
        fan_made_content: "all",
        [filterKey]: filterValue,
      },
      {
        additionalFilters: ["illustrator"],
        lockedFilters: new Set([filterKey]),
      },
    );

    setActiveList(listKey);

    return () => {
      removeList(listKey);
      setActiveList(undefined);
    };
  }, [addList, removeList, setActiveList, filterKey, filterValue, listKey]);

  if (!activeList || !isInitalized || !activeListId?.startsWith(listKey)) {
    return null;
  }

  return (
    <CardModalProvider>
      <PageTitle>{title}</PageTitle>
      <ListLayoutContextProvider>
        <ListLayout
          noFade
          filters={<Filters targetDeck={undefined} />}
          sidebar={
            <SetTree
              activePackCode={activeCode}
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
