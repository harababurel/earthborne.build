import { MapIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { CampaignCollection } from "@/components/campaign/campaign-collection";
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
import { selectCampaigns } from "@/store/selectors/campaigns";
import { selectIsInitialized } from "@/store/selectors/shared";
import {
  browseTabListCardType,
  browseTypeSystemFilter,
} from "./browse/browse-type-system-filter";
import type { CardTypeTab } from "./browse/set-tree";

function Index() {
  const { t } = useTranslation();

  const [cardTypeTab, setCardTypeTab] = useTabUrlState<CardTypeTab>(
    "ranger",
    "type",
  );

  const campaigns = useStore(selectCampaigns);

  const activeListId = useStore((state) => state.activeList);
  const isInitalized = useStore(selectIsInitialized);
  const addList = useStore((state) => state.addList);
  const setActiveList = useStore((state) => state.setActiveList);
  const setSystemFilter = useStore((state) => state.setSystemFilter);

  // Create the list once with the homepage's filter set, then only swap the
  // system filter when the card type changes so user filters are preserved.
  const didInitList = useRef(false);

  useEffect(() => {
    if (!didInitList.current) {
      didInitList.current = true;
      addList(
        "index",
        { card_type: browseTabListCardType(cardTypeTab) },
        {
          additionalFilters: ["pack", "illustrator"],
          systemFilter: browseTypeSystemFilter(cardTypeTab),
        },
      );
    } else {
      setSystemFilter("index", browseTypeSystemFilter(cardTypeTab));
    }
    setActiveList("index");
  }, [cardTypeTab, addList, setActiveList, setSystemFilter]);

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
          sidebarSections={[
            {
              id: "decks",
              icon: <i className="icon-deck" />,
              title: t("deck_collection.title"),
              content: <DeckCollection />,
            },
            {
              id: "campaigns",
              icon: <MapIcon />,
              title: t("campaign.title"),
              content: <CampaignCollection />,
              badge: campaigns.length === 0,
            },
          ]}
          sidebarWidthMax="var(--sidebar-width-one-col)"
        >
          {(props) => <CardListContainer {...props} />}
        </ListLayout>
      </ListLayoutContextProvider>
    </CardModalProvider>
  );
}

export default Index;
