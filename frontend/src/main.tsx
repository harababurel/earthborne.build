import "./styles/main.css";
import "@fontsource-variable/noto-sans/standard.css";
import "@fontsource-variable/noto-sans/standard-italic.css";
import "@fontsource-variable/noto-serif/standard.css";
import "@fontsource-variable/noto-serif/standard-italic.css";
import "./styles/icons-core.css";
import "./styles/icons-icon.css";

import React from "react";
import ReactDOM from "react-dom/client";
import i18n from "@/utils/i18n";
import App from "./app";
import { useStore } from "./store";
import { tabSync } from "./store/persist";
import type { TabSyncEvent } from "./store/persist/tab-sync";
import { createHttpClient } from "./store/services/http-client";
import { HttpClientContext } from "./store/services/http-client.context";
import {
  queryCards,
  queryDataVersion,
  queryMetadata,
} from "./store/services/queries";

const rootNode = document.getElementById("root");

if (!rootNode) {
  throw new Error("fatal: did not find root node in DOM.");
}

const client = createHttpClient({
  apiUrl: import.meta.env.VITE_API_URL || "",
  onUnauthorized() {
    return useStore.getState().handleUnauthorized();
  },
});

ReactDOM.createRoot(rootNode).render(
  <React.StrictMode>
    <HttpClientContext.Provider value={client}>
      <App />
    </HttpClientContext.Provider>
  </React.StrictMode>,
);

init().catch((err) => {
  console.error(err);
  alert(
    i18n.t("app.init_error", {
      error: (err as Error)?.message ?? "Unknown error",
    }),
  );
});

async function init() {
  await useStore
    .getState()
    .init(queryMetadata, queryDataVersion, queryCards, { refresh: false });

  await useStore.getState().initSession(client);

  const tabSyncListener = (evt: TabSyncEvent) => {
    useStore.setState(evt.state);
  };

  tabSync.addListener(tabSyncListener);

  window.addEventListener("beforeunload", () => {
    tabSync.removeListener(tabSyncListener);
  });
}
