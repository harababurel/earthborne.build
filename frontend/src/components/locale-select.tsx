import { LoaderCircleIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LOCALES } from "@/utils/constants";
import { cx } from "@/utils/cx";
import css from "./locale-select.module.css";
import { CustomSelect } from "./ui/custom-select";

type Props = {
  id?: string;
  loading?: boolean;
  onValueChange: (value: string) => void;
  value: string;
  variant?: "compact";
};

export function LocaleSelect(props: Props) {
  const { variant, loading, id, onValueChange, value } = props;
  const { t } = useTranslation();
  const options = Object.values(LOCALES);

  return (
    <CustomSelect
      aria-label={t("settings.locale.title")}
      className={cx(css["select"], variant && css[variant])}
      id={id}
      items={options}
      menuClassName={css["menu"]}
      renderControl={(item) => {
        if (!item) return null;
        return (
          <span className={css["control-row"]}>
            {loading && <LoaderCircleIcon className="spin" />}
            {variant === "compact" ? (
              <LocaleIcon locale={item.displayValue ?? item.value} />
            ) : (
              <>
                <LocaleIcon locale={item.displayValue ?? item.value} />{" "}
                {item.label}
              </>
            )}
          </span>
        );
      }}
      renderItem={(item) => {
        if (!item) return null;
        return (
          <span className={css["control-row"]}>
            <LocaleIcon locale={item.displayValue ?? item.value} />
            {item.label}
          </span>
        );
      }}
      value={value}
      variant={variant}
      onValueChange={onValueChange}
    />
  );
}

function LocaleIcon({ locale }: { locale: string }) {
  return <span className={css["locale"]}>{locale.toUpperCase()}</span>;
}
