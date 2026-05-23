import { useTranslation } from "react-i18next";
import {
  locationSymbolUrls,
  pathTerrainSymbolUrls,
} from "@/assets/symbols/index";
import { AppLayout } from "@/layouts/app-layout";
import css from "./debug.module.css";

const symbolGroups = [
  {
    id: "locations",
    symbols: locationSymbolUrls,
    titleKey: "debug.symbols.locations",
  },
  {
    id: "path-terrain",
    symbols: pathTerrainSymbolUrls,
    titleKey: "debug.symbols.path_terrain",
  },
] as const;

function Debug() {
  const { t } = useTranslation();

  return (
    <AppLayout title={t("debug.title")}>
      <div className={css["debug"]}>
        <h1>{t("debug.title")}</h1>
        {symbolGroups.map((group) => (
          <section className={css["section"]} key={group.id}>
            <h2>{t(group.titleKey)}</h2>
            <div className={css["grid"]}>
              {Object.entries(group.symbols).map(([name, url]) => (
                <div className={css["symbol-row"]} key={`${group.id}-${name}`}>
                  <img alt="" className={css["symbol"]} src={url} />
                  <span>{name}</span>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </AppLayout>
  );
}

export default Debug;
