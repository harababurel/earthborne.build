import { Trans, useTranslation } from "react-i18next";
import { cx } from "@/utils/cx";
import { useResolvedColorTheme } from "@/utils/use-color-theme";
import css from "./error-display.module.css";

type Props = {
  children?: React.ReactNode;
  message: string;
  pre?: React.ReactNode;
  status: number;
};

export function ErrorDisplay(props: Props) {
  return (
    <article className={css["error"]}>
      {props.pre}
      <div className={css["error-row"]}>
        <header className={css["error-header"]}>
          <h1 className={css["error-status"]}>{props.status}</h1>
          <h2 className={css["error-message"]}>{props.message}</h2>
        </header>
        {props.children}
      </div>
    </article>
  );
}

export function ErrorImage({ className }: { className?: string }) {
  const { t } = useTranslation();
  const theme = useResolvedColorTheme();

  return (
    <figure className={css["error-image-frame"]}>
      <img
        className={cx(className, css["error-image"])}
        src={theme === "dark" ? "/404-dark.png" : "/404.png"}
        alt="Pokodo"
      />
      <figcaption className={css["error-image-credit"]}>
        <Trans
          i18nKey="errors.illustration_credit"
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
      </figcaption>
    </figure>
  );
}
