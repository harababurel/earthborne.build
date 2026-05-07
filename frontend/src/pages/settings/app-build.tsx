import { useTranslation } from "react-i18next";
import { Field } from "@/components/ui/field";
import { formatDataVersionTimestamp } from "@/utils/formatting";
import buildCss from "./app-build.module.css";

const appBuild = import.meta.env.VITE_APP_BUILD;
const appBuildTime = import.meta.env.VITE_APP_BUILD_TIME;
const appBuildUrl = import.meta.env.VITE_APP_BUILD_URL;

export function AppBuild() {
  const { t } = useTranslation();
  const formattedBuild = formatAppBuild(appBuild);

  return (
    <Field bordered>
      <div className={buildCss["build"]}>
        <p>
          {t("settings.app.version")}{" "}
          {appBuildUrl ? (
            <a
              className={buildCss["commit"]}
              href={appBuildUrl}
              rel="noreferrer"
              target="_blank"
              title={appBuild}
            >
              {formattedBuild}
            </a>
          ) : (
            <span className={buildCss["commit"]} title={appBuild}>
              {formattedBuild}
            </span>
          )}
        </p>
        <p className={buildCss["muted"]}>
          {t("settings.app.built")} {formatDataVersionTimestamp(appBuildTime)}
        </p>
      </div>
    </Field>
  );
}

function formatAppBuild(build: string): string {
  return /^[0-9a-f]{40}$/i.test(build) ? build.slice(0, 12) : build;
}
