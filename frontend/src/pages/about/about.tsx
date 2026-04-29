import { ChevronLeftIcon } from "lucide-react";
import { Trans, useTranslation } from "react-i18next";
import { Socials } from "@/components/socials";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/layouts/app-layout";
import { cx } from "@/utils/cx";
import { useGoBack } from "@/utils/use-go-back";
import css from "./about.module.css";

function About() {
  const goBack = useGoBack();
  const { t } = useTranslation();

  return (
    <AppLayout title={t("about.title")}>
      <div className={cx("longform", css["about"])}>
        <Button onClick={goBack} variant="bare">
          <ChevronLeftIcon /> {t("common.back")}
        </Button>
        <Socials />
        <h1>{t("about.title")}</h1>
        <Trans
          i18nKey="about.description"
          t={t}
          components={{
            arkham_build_url: (
              // biome-ignore lint/a11y/useAnchorContent: not relevant here.
              <a href="https://arkham.build" rel="noreferrer" target="_blank" />
            ),
            eb: (
              // biome-ignore lint/a11y/useAnchorContent: not relevant here.
              <a
                href="https://earthbornegames.com/earthborne-rangers/"
                rel="noreferrer"
                target="_blank"
              />
            ),
            felix_url: (
              // biome-ignore lint/a11y/useAnchorContent: not relevant here.
              <a href="https://spoettel.dev" rel="noreferrer" target="_blank" />
            ),
            github_issues_url: (
              // biome-ignore lint/a11y/useAnchorContent: not relevant here.
              <a
                href="https://github.com/harababurel/earthborne.build/issues"
                rel="noreferrer"
                target="_blank"
              />
            ),
            github_url: (
              // biome-ignore lint/a11y/useAnchorContent: not relevant here.
              <a
                href="https://github.com/harababurel/earthborne.build"
                rel="noreferrer"
                target="_blank"
              />
            ),
          }}
        />
        <h2>{t("about.image_credits.title")}</h2>
        <ul>
          <li>
            <strong>{t("about.image_credits.card_icons")}:</strong>{" "}
            {t("about.image_credits.earthborne_games")}
          </li>
          <li>
            <strong>{t("about.image_credits.logo")}:</strong>{" "}
            {t("about.image_credits.earthborne_games")}
          </li>
          <li>
            <strong>{t("about.image_credits.404")}:</strong>{" "}
            <Trans
              i18nKey="about.image_credits.404_credit"
              t={t}
              components={{
                artist_url: (
                  // biome-ignore lint/a11y/useAnchorContent: not relevant here.
                  <a
                    href="https://linktr.ee/druakim"
                    rel="noreferrer"
                    target="_blank"
                  />
                ),
              }}
            />
          </li>
          <li>
            <strong>{t("about.image_credits.other")}</strong>:{" "}
            {t("about.image_credits.other_credit")}
          </li>
        </ul>
      </div>
    </AppLayout>
  );
}

export default About;
