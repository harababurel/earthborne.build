import { ChevronLeftIcon } from "lucide-react";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/layouts/app-layout";
import { cx } from "@/utils/cx";
import { useGoBack } from "@/utils/use-go-back";
import css from "./legal.module.css";

const CONTACT_EMAIL = "sergiu@sergiu.org";

type Props = {
  rootKey: "legal.terms" | "legal.privacy";
  sections: readonly string[];
};

export function LegalPage({ rootKey, sections }: Props) {
  const goBack = useGoBack();
  const { t } = useTranslation();

  const bodyComponents = {
    // biome-ignore lint/a11y/useAnchorContent: content injected by Trans.
    contact_email: <a href={`mailto:${CONTACT_EMAIL}`} />,
    plausible_url: (
      // biome-ignore lint/a11y/useAnchorContent: content injected by Trans.
      <a href="https://plausible.io" rel="noreferrer" target="_blank" />
    ),
    privacy_url: <Link href="~/privacy" />,
    terms_url: <Link href="~/terms" />,
  };

  return (
    <AppLayout title={t(`${rootKey}.title`)}>
      <div className={cx("longform", css["legal"])}>
        <Button onClick={goBack} variant="bare">
          <ChevronLeftIcon /> {t("common.back")}
        </Button>
        <h1>{t(`${rootKey}.title`)}</h1>
        <p className={css["updated"]}>{t(`${rootKey}.updated`)}</p>
        <Trans components={bodyComponents} i18nKey={`${rootKey}.intro`} t={t} />
        {sections.map((section) => (
          <section key={section}>
            <h2>{t(`${rootKey}.sections.${section}.title`)}</h2>
            <Trans
              components={bodyComponents}
              i18nKey={`${rootKey}.sections.${section}.body`}
              t={t}
            />
          </section>
        ))}
        <p className={css["trademark"]}>{t("legal.trademark")}</p>
      </div>
    </AppLayout>
  );
}
