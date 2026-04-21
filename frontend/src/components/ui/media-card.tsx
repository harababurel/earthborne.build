import { cx } from "@/utils/cx";
import css from "./media-card.module.css";

type Props = {
  bannerAlt?: string;
  bannerUrl?: string | null;
  bannerMobileUrl?: string | null;
  children: React.ReactNode;
  headerSlot?: React.ReactNode;
  footerSlot?: React.ReactNode;
  htmlFor?: string;
  classNames?: {
    container?: string;
    header?: string;
    content?: string;
    footer?: string;
  };
  title: React.ReactNode;
};

export function MediaCard(props: Props) {
  const {
    bannerAlt,
    bannerUrl,
    bannerMobileUrl,
    children,
    classNames,
    footerSlot,
    headerSlot,
    htmlFor,
    title,
  } = props;

  const renderBanner = (src: string) => (
    <picture className={css["backdrop"]}>
      {bannerMobileUrl && (
        <source media="(max-width: 768px)" srcSet={bannerMobileUrl} />
      )}
      <img
        alt={bannerAlt}
        className={css["backdrop"]}
        loading="lazy"
        src={src}
        style={htmlFor ? { cursor: "pointer" } : undefined}
      />
    </picture>
  );

  return (
    <article className={cx(css["card"], classNames?.container)}>
      <header className={cx(css["header"], classNames?.header)}>
        {bannerUrl &&
          (htmlFor ? (
            <label htmlFor={htmlFor} style={{ display: "contents" }}>
              {renderBanner(bannerUrl)}
            </label>
          ) : (
            renderBanner(bannerUrl)
          ))}
        <div className={cx("blurred-background", css["title"])}>{title}</div>
        {headerSlot}
      </header>
      <div className={cx(css["content"], classNames?.content)}>{children}</div>
      {footerSlot && (
        <footer className={classNames?.footer}>{footerSlot}</footer>
      )}
    </article>
  );
}
