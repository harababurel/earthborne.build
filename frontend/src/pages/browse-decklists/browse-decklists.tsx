import type { DecklistSearchResult } from "@arkham-build/shared";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { LoaderCircleIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "wouter";
import { CardModalProvider } from "@/components/card-modal/card-modal-provider";
import { Head } from "@/components/ui/head";
import { Loader } from "@/components/ui/loader";
import { Pagination } from "@/components/ui/pagination";
import { AppLayout } from "@/layouts/app-layout";
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

  const roleCard = result.role_code
    ? metadata.cards[result.role_code]
    : undefined;

  return (
    <div
      className={css["result-item"]}
      style={{
        padding: "1rem",
        border: "1px solid var(--border-color)",
        marginBottom: "1rem",
        borderRadius: "4px",
      }}
    >
      <h3 style={{ margin: "0 0 0.5rem 0" }}>
        <Link href={`/decks/view/${result.id}`}>
          {result.name || t("deck.untitled_deck")}
        </Link>
      </h3>
      <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--text-muted)" }}>
        <strong>{t("common.type.role")}:</strong>{" "}
        {roleCard ? roleCard.name : result.role_code || "-"} &nbsp;|&nbsp;
        <strong>{t("deck.aspect")}:</strong>{" "}
        {result.aspect_code
          ? t(`common.factions.${result.aspect_code.toLowerCase()}`)
          : "-"}{" "}
        &nbsp;|&nbsp;
        <strong>{t("deck.background")}:</strong>{" "}
        {result.background
          ? t(`deck_create.background_type.${result.background}`)
          : "-"}{" "}
        &nbsp;|&nbsp;
        <strong>{t("deck.specialty")}:</strong>{" "}
        {result.specialty
          ? t(`deck_create.specialty_type.${result.specialty}`)
          : "-"}
        <br />
        <strong>{t("common.date")}:</strong>{" "}
        {new Date(result.date_creation).toLocaleDateString()}
      </p>
    </div>
  );
}

export default BrowseDecklists;
