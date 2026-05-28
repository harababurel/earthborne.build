import { cx } from "@/utils/cx";
import css from "./button.module.css";
import { DefaultTooltip } from "./tooltip";

export type ButtonType = "a" | "button" | "summary" | "label";

export type Props<T extends ButtonType> = React.ComponentProps<T> & {
  as?: T;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  iconOnly?: boolean;
  round?: boolean;
  size?: "xxs" | "xs" | "sm" | "lg" | "xl" | "full" | "none";
  tooltip?: React.ReactNode;
  variant?: "primary" | "secondary" | "bare" | "link";
};

export function Button<T extends "a" | "button" | "summary" | "label">(
  props: Props<T>,
) {
  const {
    as,
    children,
    disabled,
    iconOnly,
    ref,
    round,
    size,
    tooltip,
    variant = "secondary",
    ...rest
  } = props;
  // biome-ignore lint/suspicious/noExplicitAny: safe.
  const Element: any = disabled ? "button" : (as ?? "button");
  const ariaLabel =
    iconOnly && tooltip && typeof tooltip === "string" && !rest["aria-label"]
      ? tooltip
      : rest["aria-label"];

  return (
    <DefaultTooltip tooltip={tooltip}>
      <Element
        {...rest}
        aria-label={ariaLabel}
        className={cx(
          css["button"],
          variant && css[variant],
          size && css[size],
          iconOnly && css["icon-only"],
          round && css["round"],
          rest.className,
        )}
        type={
          Element === "button"
            ? ((rest as React.ComponentProps<"button">).type ?? "button")
            : undefined
        }
        disabled={disabled}
        ref={ref}
      >
        {children}
      </Element>
    </DefaultTooltip>
  );
}
