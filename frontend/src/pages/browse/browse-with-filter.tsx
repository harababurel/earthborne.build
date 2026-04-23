import { useEffect } from "react";
import { CardListContainer } from "@/components/card-list/card-list-container";
import { CardModalProvider } from "@/components/card-modal/card-modal-provider";
import { DeckCollection } from "@/components/deck-collection/deck-collection";
import { Filters } from "@/components/filters/filters";
import { PageTitle } from "@/components/ui/page-title";
import { ListLayout } from "@/layouts/list-layout";
import { ListLayoutContextProvider } from "@/layouts/list-layout-context-provider";
import { useStore } from "@/store";
import { selectIsInitialized } from "@/store/selectors/shared";

interface Props {
  listKeyPrefix: string;
  packCode: string;
  setCode?: string | null;
  title: string;
}

export function BrowseWithFilter(props: Props) {
  const { listKeyPrefix, packCode, setCode, title } = props;

  const activeListId = useStore((state) => state.activeList);
  const isInitalized = useStore(selectIsInitialized);

  const activeList = useStore((state) => state.lists[state.activeList ?? ""]);
  const addList = useStore((state) => state.addList);
  const setActiveList = useStore((state) => state.setActiveList);
  const removeList = useStore((state) => state.removeList);

  const listKey = `${listKeyPrefix}-${packCode}-${setCode ?? "all"}`;

  useEffect(() => {
    addList(
      listKey,
      {
        card_type: "",
        pack: [packCode],
        set: setCode ? [setCode] : [],
      },
      {
        additionalFilters: ["pack", "set", "illustrator"],
      },
    );

    setActiveList(listKey);

    return () => {
      removeList(listKey);
      setActiveList(undefined);
    };
  }, [addList, removeList, setActiveList, listKey, packCode, setCode]);

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
          sidebar={<DeckCollection />}
          sidebarWidthMax="var(--sidebar-width-one-col)"
        >
          {(props) => <CardListContainer {...props} />}
        </ListLayout>
      </ListLayoutContextProvider>
    </CardModalProvider>
  );
}
