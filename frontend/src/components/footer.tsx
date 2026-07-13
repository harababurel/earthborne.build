import { Trans } from "react-i18next";
import { cx } from "@/utils/cx";
import css from "./footer.module.css";

type Props = {
  className?: string;
};

export function Footer(props: Props) {
  return (
    <div className={cx(css["footer"], props.className)}>
      <p>
        <Trans
          i18nKey="footer.attribution"
          components={{
            eb_url: (
              // biome-ignore lint/a11y/useAnchorContent: content is interpolated by Trans.
              <a
                href="https://earthbornegames.com"
                rel="noreferrer"
                target="_blank"
                tabIndex={-1}
              />
            ),
            ab_url: (
              // biome-ignore lint/a11y/useAnchorContent: content is interpolated by Trans.
              <a
                href="https://arkham.build"
                rel="noreferrer"
                target="_blank"
                tabIndex={-1}
              />
            ),
            felix_url: (
              // biome-ignore lint/a11y/useAnchorContent: content is interpolated by Trans.
              <a
                href="https://spoettel.dev/"
                rel="noreferrer"
                target="_blank"
                tabIndex={-1}
              />
            ),
          }}
        />
      </p>
    </div>
  );
}
