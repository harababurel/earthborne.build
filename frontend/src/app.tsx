import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Route, Router, Switch, useLocation, useSearch } from "wouter";
import { useBrowserLocation } from "wouter/use-browser-location";
import { ErrorBoundary } from "./components/error-boundary";
import { Loader } from "./components/ui/loader";
import { ToastProvider } from "./components/ui/toast";
import { ErrorStatus } from "./pages/errors/404";
import { useStore } from "./store";
import { selectIsInitialized } from "./store/selectors/shared";
import { useColorThemeListener } from "./utils/use-color-theme";

const Index = lazy(() => import("./pages/index"));

const BrowseRoutes = lazy(() => import("./pages/browse/index"));

const DeckCreate = lazy(() => import("./pages/deck-create/deck-create"));

const DeckView = lazy(() => import("./pages/deck-view/deck-view"));

const Campaigns = lazy(() => import("./pages/campaigns/campaigns"));

const CampaignDetail = lazy(
  () => import("./pages/campaign-detail/campaign-detail"),
);

const Settings = lazy(() => import("./pages/settings/settings"));

const CardView = lazy(() => import("./pages/card-view/card-view"));

const About = lazy(() => import("./pages/about/about"));

const Share = lazy(() => import("./pages/share/share"));

const Search = lazy(() => import("./pages/search/search"));

const CollectionStats = lazy(
  () => import("./pages/collection-stats/collection-stats"),
);

const BrowseDecklists = lazy(
  () => import("./pages/browse-decklists/browse-decklists"),
);

const Rules = lazy(() => import("./pages/rules-reference/rules-reference"));

const Debug = lazy(() => import("./pages/debug/debug"));

const Login = lazy(() => import("./pages/auth/login"));
const Signup = lazy(() => import("./pages/auth/signup"));
const CompleteSignup = lazy(() => import("./pages/auth/complete-signup"));
const ForgotPassword = lazy(() => import("./pages/auth/forgot-password"));
const ResetPassword = lazy(() => import("./pages/auth/reset-password"));
const VerifyEmail = lazy(() => import("./pages/auth/verify-email"));

function App() {
  return (
    <Providers>
      <AppInner />
    </Providers>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function Providers(props: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <Suspense>
          <ToastProvider>{props.children}</ToastProvider>
        </Suspense>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

function AppInner() {
  const { t } = useTranslation();
  const storeInitialized = useStore(selectIsInitialized);
  const fontSize = useStore((state) => state.settings.fontSize);
  useColorThemeListener();

  useEffect(() => {
    if (storeInitialized) {
      document.documentElement.style.fontSize = `${fontSize}%`;
    }
  }, [storeInitialized, fontSize]);

  return (
    <>
      <Loader message={t("app.init")} show={!storeInitialized} delay={200} />
      <Suspense fallback={<Loader delay={300} show />}>
        {storeInitialized && (
          <Router hook={useBrowserLocation}>
            <Switch>
              <Route component={Index} path="/" />
              <Route component={BrowseRoutes} path="/browse" />
              <Route component={BrowseRoutes} path="/browse/pack/:pack_code" />
              <Route component={Search} path="/search" />
              <Route component={CardView} path="/card/:code" />
              <Route component={DeckCreate} path="/deck/create" />
              <Route component={Campaigns} path="/campaigns" />
              <Route component={CampaignDetail} path="/campaign/edit/:id" />
              <Route component={CampaignDetail} path="/campaign/view/:id" />
              <Route component={DeckView} path="/:type/view/:id" />
              <Route component={DeckView} path="/:type/view/:id/:slug" />
              <Route component={DeckView} path="/deck/edit/:id" />
              <Route component={Settings} path="/settings" />
              <Route component={About} path="/about" />
              <Route component={Share} path="/share/:id" />
              <Route component={CollectionStats} path="/collection-stats" />
              <Route component={BrowseDecklists} path="/decklists" />
              <Route component={Rules} path="/rules" />
              <Route component={Debug} path="/debug" />
              <Route component={Login} path="/auth/login" />
              <Route component={Signup} path="/auth/signup" />
              <Route component={CompleteSignup} path="/auth/complete-signup" />
              <Route component={ForgotPassword} path="/auth/forgot-password" />
              <Route component={ResetPassword} path="/auth/reset-password" />
              <Route component={VerifyEmail} path="/auth/verify-email" />
              <Route path="*">
                <ErrorStatus statusCode={404} />
              </Route>
            </Switch>
            <RouteReset />
            <SessionRedirects />
          </Router>
        )}
      </Suspense>
    </>
  );
}

function RouteReset() {
  const pushHistory = useStore((state) => state.pushHistory);
  const closeCardModal = useStore((state) => state.closeCardModal);

  const [pathname] = useLocation();
  const search = useSearch();

  useEffect(() => {
    pushHistory(pathname + (search ? `?${search}` : ""));
    closeCardModal();
  }, [pathname, search, pushHistory, closeCardModal]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: a change to pathname indicates a change to window.location.
  useEffect(() => {
    try {
      if (window.location.hash) {
        // HACK: this enables hash-based deep links to work when a route is loaded async.
        const el = document.querySelector(window.location.hash);

        if (el) {
          el.scrollIntoView();
          return;
        }
      }

      window.scrollTo(0, 0);
    } catch (_) {}
  }, [pathname]);

  return null;
}

function SessionRedirects() {
  const [location, navigate] = useLocation();
  const sessionInitialized = useStore((state) => state.ui.sessionInitialized);
  const session = useStore((state) => state.auth.session);

  useEffect(() => {
    if (!sessionInitialized) return;

    const authenticated = Boolean(session);
    const profileComplete = Boolean(session?.account.profileComplete);

    if (authenticated) {
      if (
        !profileComplete &&
        !["/auth/complete-signup", "/auth/verify-email"].includes(location)
      ) {
        navigate("/auth/complete-signup");
      } else if (
        profileComplete &&
        ["/auth/login", "/auth/signup", "/auth/complete-signup"].includes(
          location,
        )
      ) {
        navigate("/");
      }
    }
  }, [location, sessionInitialized, session, navigate]);

  return null;
}

export default App;
