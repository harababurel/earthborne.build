import { useEffect, useState } from "react";
import { cx } from "@/utils/cx";
import { useLogoUrl } from "@/utils/use-color-theme";
import css from "./loader.module.css";

type Props = {
  className?: string;
  message?: string;
  show?: boolean;
  delay?: number;
};

export function Loader(props: Props) {
  const { className, delay, message, show } = props;

  const [visible, setVisible] = useState(!delay);
  const logoUrl = useLogoUrl();

  useEffect(() => {
    if (delay) {
      const timer = setTimeout(() => setVisible(true), delay);
      return () => clearTimeout(timer);
    }
  }, [delay]);

  if (!visible) return null;

  return (
    <output className={cx(className, css["loader"], show && css["show"])}>
      <div className={css["loader-inner"]}>
        <div className={css["loader-icon"]}>
          <img alt="" src={logoUrl} />
        </div>
        <div className={css["loader-message"]}>
          {message && <p>{message}</p>}
        </div>
      </div>
    </output>
  );
}
