import type { Deck, DecklistSearchResult } from "@earthborne-build/shared";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { HeartIcon, LoaderCircleIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "wouter";
import { AspectStats } from "@/components/aspect-stats";
import { CardModalProvider } from "@/components/card-modal/card-modal-provider";
import { DeckSummary } from "@/components/deck-summary/deck-summary";
import { Decklist } from "@/components/decklist/decklist";
import { ResolvedDeckProvider } from "@/components/resolved-deck-context-provider";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { Head } from "@/components/ui/head";
import { Loader } from "@/components/ui/loader";
import { Pagination } from "@/components/ui/pagination";
import { AppLayout } from "@/layouts/app-layout";
import { useStore } from "@/store";
import { resolveDeck } from "@/store/lib/resolve-deck";
import {
  selectLocaleSortingCollator,
  selectLookupTables,
  selectMetadata,
} from "@/store/selectors/shared";
import {
  type DecklistsFiltersState,
  deckSearchQuery,
  parseDeckSearchQuery,
  searchDecklists,
} from "@/store/services/requests/decklists-search";
import { ApiError } from "@/store/services/requests/shared";
import {
  ErrorDisplay,
  ErrorImage,
} from "../../components/error-display/error-display";
import css from "./browser-decklists.module.css";
import { DecklistsFilters } from "./decklists-filters/decklists-filters";

function BrowseDecklists() {
  const { t } = useTranslation();

  const navRef = useRef<HTMLElement>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const initialSearchParams = useRef(searchParams);

  const [state, setState] = useState(parseDeckSearchQuery(searchParams));

  useEffect(() => {
    setState(parseDeckSearchQuery(searchParams));
  }, [searchParams]);

  const { data, isPending, error, isPlaceholderData } = useQuery({
    placeholderData: keepPreviousData,
    queryFn: () => searchDecklists(deckSearchQuery(state, 30)),
    queryKey: ["decklists", deckSearchQuery(state, 30).toString()],
  });

  const onOffsetChange = (offset: number) => {
    const nextState = { ...state, offset };
    setState(nextState);
    setSearchParams(deckSearchQuery(nextState, 30));
    if (window.scrollY > window.innerHeight) {
      navRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  const onFiltersChange = (filters: DecklistsFiltersState["filters"]) => {
    const nextState = { ...state, filters, offset: 0 };
    setState(nextState);
    setSearchParams(deckSearchQuery(nextState, 30));
  };

  const onFiltersReset = () => {
    const initialState = parseDeckSearchQuery(initialSearchParams.current);
    setState(initialState);
    setSearchParams(initialSearchParams.current);
  };

  return (
    <CardModalProvider>
      <AppLayout
        mainClassName={css["layout"]}
        title={t("decklists.browse.title")}
      >
        <h1>{t("decklists.browse.title")}</h1>
        {searchParams.size > 0 && (
          <Head>
            <meta name="robots" content="noindex" />
          </Head>
        )}
        <DecklistsFilters
          filters={state.filters}
          key={JSON.stringify(state.filters)}
          onFiltersChange={onFiltersChange}
          onFiltersReset={onFiltersReset}
        />
        {data && (
          <>
            <nav className={css["content-nav"]} ref={navRef}>
              <span className={css["content-nav-count"]}>
                {isPlaceholderData ? (
                  <>
                    <LoaderCircleIcon className="spin" />
                    {t("decklists.browse.loading")}
                  </>
                ) : (
                  t("decklists.browse.results_count", {
                    count: data.meta.total,
                  })
                )}
              </span>
            </nav>
            <Pagination
              disabled={isPlaceholderData}
              total={data.meta.total}
              offset={data.meta.offset}
              limit={data.meta.limit}
              onOffsetChange={onOffsetChange}
            />
            <ol className={css["results"]}>
              {data.data.map((result) => (
                <li key={result.id}>
                  <DecklistResultItem result={result} />
                </li>
              ))}
            </ol>
            <Pagination
              disabled={isPlaceholderData}
              total={data.meta.total}
              offset={data.meta.offset}
              limit={data.meta.limit}
              onOffsetChange={onOffsetChange}
            />
          </>
        )}
        {error && (
          <ErrorDisplay
            message={error.message}
            pre={<ErrorImage />}
            status={error instanceof ApiError ? error.status : 404}
          />
        )}
        {data?.meta.total === 0 && (
          <ErrorDisplay
            message={t("decklists.browse.no_results")}
            pre={<ErrorImage />}
            status={404}
          />
        )}
        {isPending && (
          <div className={css["loader"]}>
            <Loader show message={t("decklists.browse.loading")} />
          </div>
        )}
      </AppLayout>
    </CardModalProvider>
  );
}

function DecklistResultItem({ result }: { result: DecklistSearchResult }) {
  const { t } = useTranslation();
  const metadata = useStore(selectMetadata);
  const lookupTables = useStore(selectLookupTables);
  const sharing = useStore((state) => state.sharing);
  const collator = useStore(selectLocaleSortingCollator);

  const aspectCard = result.aspect_code
    ? metadata.cards[result.aspect_code]
    : undefined;

  const resolved = useMemo(
    () =>
      resolveDeck({ metadata, lookupTables, sharing }, collator, {
        ...result,
        meta: "",
        date_update: result.date_update ?? "",
        description_md: result.description_md ?? "",
        tags: result.tags ?? "",
      } as Deck),
    [result, metadata, lookupTables, sharing, collator],
  );

  return (
    <DeckSummary
      deck={resolved}
      interactive
      omitProviderTag
      showThumbnail
      type="decklist"
    >
      <div className={css["result-meta"]}>
        <AspectStats aspectCard={aspectCard} size="sm" />
        <dl className={css["result-identity"]}>
          {result.background && (
            <div className={css["result-identity-item"]}>
              <dt className={css["result-identity-label"]}>
                {t("deck.background")}
              </dt>
              <dd className={css["result-identity-value"]}>
                {t(`common.set.${result.background}`)}
              </dd>
            </div>
          )}
          {result.specialty && (
            <div className={css["result-identity-item"]}>
              <dt className={css["result-identity-label"]}>
                {t("deck.specialty")}
              </dt>
              <dd className={css["result-identity-value"]}>
                {t(`common.set.${result.specialty}`)}
              </dd>
            </div>
          )}
          <div className={css["result-identity-item"]}>
            <dt className={css["result-identity-label"]}>{t("common.date")}</dt>
            <dd className={css["result-identity-value"]}>
              {new Date(result.date_creation).toLocaleDateString("en-CA")}
            </dd>
          </div>
          {result.like_count > 0 && (
            <div className={css["result-identity-item"]}>
              <dt className={css["result-identity-label"]}>
                {t("decklists.browse.likes")}
              </dt>
              <dd className={css["result-identity-value"]}>
                <HeartIcon size={12} />
                {result.like_count}
              </dd>
            </div>
          )}
        </dl>
      </div>
      <Collapsible
        className={css["result-decklist"]}
        omitPadding
        omitBorder
        title={
          <span className={css["result-decklist-title"]}>
            <i className="icon-deck" />
            {t("deck.cards")}
          </span>
        }
      >
        <CollapsibleContent className={css["result-decklist-content"]}>
          <ResolvedDeckProvider resolvedDeck={resolved}>
            <Decklist deck={resolved} />
          </ResolvedDeckProvider>
        </CollapsibleContent>
      </Collapsible>
    </DeckSummary>
  );
}

export default BrowseDecklists;
