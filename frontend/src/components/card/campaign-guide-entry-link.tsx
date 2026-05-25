import type { Card } from "@earthborne-build/shared";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { getCampaignGuideEntryChoices } from "./campaign-guide-entry";
import css from "./card.module.css";

type CampaignGuideEntryLinkProps = {
  card: Pick<Card, "campaign_guide_entry" | "pack_code">;
  children: React.ReactNode;
  className: string;
  choiceClassName?: string;
  label?: string;
  title?: string;
};

export function CampaignGuideEntryLink(props: CampaignGuideEntryLinkProps) {
  const { card, children, className, choiceClassName, label, title } = props;
  const choices = getCampaignGuideEntryChoices(card);

  if (choices.length === 0) {
    return <span className={className}>{children}</span>;
  }

  if (choices.length === 1) {
    return (
      <a
        aria-label={label}
        className={className}
        href={choices[0].href}
        title={title}
      >
        {children}
      </a>
    );
  }

  return (
    <Popover hoverDisabled placement="bottom-start" strategy="fixed">
      <PopoverTrigger asChild>
        <button
          aria-label={label}
          className={className}
          title={title}
          type="button"
        >
          {children}
        </button>
      </PopoverTrigger>
      <PopoverContent>
        <div className={css["guide-choices"]}>
          {choices.map((choice) => (
            <a
              aria-label={choice.label}
              className={choiceClassName}
              href={choice.href}
              key={choice.pageId}
              title={choice.label}
            >
              <span className={css["guide-icon"]}>
                <i className="core-guide" />
              </span>
              <span className={css["guide-value"]}>{choice.label}</span>
            </a>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function CampaignGuideEntryIconChildren(props: {
  entry: string | number;
}) {
  return (
    <>
      <span className={css["guide-icon"]}>
        <i className="core-guide" />
      </span>
      <span className={css["guide-value"]}>{props.entry}</span>
    </>
  );
}
