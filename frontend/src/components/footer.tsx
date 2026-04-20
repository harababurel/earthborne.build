import { cx } from "@/utils/cx";
import css from "./footer.module.css";

type Props = {
  className?: string;
};

export function Footer(props: Props) {
  return (
    <div className={cx(css["footer"], props.className)}>
      <p>
        Earthborne Rangers and all related content &copy;{" "}
        <a
          href="https://earthbornegames.com"
          rel="noreferrer"
          target="_blank"
          tabIndex={-1}
        >
          Earthborne Games
        </a>
        . This site is not produced, endorsed by or affiliated with Earthborne
        Games.{" "}
      </p>
      <p>
        Based on{" "}
        <a
          href="https://arkham.build"
          rel="noreferrer"
          target="_blank"
          tabIndex={-1}
        >
          arkham.build
        </a>{" "}
        by{" "}
        <a
          href="https://spoettel.dev/"
          rel="noreferrer"
          target="_blank"
          tabIndex={-1}
        >
          Felix Spöttel
        </a>
        .
      </p>
    </div>
  );
}
