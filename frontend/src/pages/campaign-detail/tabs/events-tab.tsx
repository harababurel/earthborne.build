import type { Campaign, NotableEvent } from "@earthborne-build/shared";
import { Trash2Icon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useStore } from "@/store";
import css from "./tabs.module.css";

export function EventsTab({ campaign }: { campaign: Campaign }) {
  const { t } = useTranslation();
  const updateCampaign = useStore((state) => state.updateCampaign);
  const [text, setText] = useState("");

  const setEvents = (events: NotableEvent[]) =>
    updateCampaign(campaign.id, { events });

  const onAdd = () => {
    if (!text.trim()) return;
    setEvents([...campaign.events, { event: text.trim(), crossed_out: false }]);
    setText("");
  };

  const toggle = (index: number) =>
    setEvents(
      campaign.events.map((e, i) =>
        i === index ? { ...e, crossed_out: !e.crossed_out } : e,
      ),
    );

  const remove = (index: number) =>
    setEvents(campaign.events.filter((_, i) => i !== index));

  return (
    <div className={css["section"]}>
      <div className={css["row"]}>
        <input
          className={css["input"]}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("campaign.events.placeholder")}
          value={text}
        />
        <Button onClick={onAdd}>{t("campaign.events.add")}</Button>
      </div>

      {campaign.events.length ? (
        <ul className={css["list"]}>
          {campaign.events.map((entry, index) => (
            <li className={css["item"]} key={`${entry.event}-${index}`}>
              <button
                type="button"
                className={css["item-main"]}
                onClick={() => toggle(index)}
              >
                <span
                  className={entry.crossed_out ? css["crossed"] : undefined}
                >
                  {entry.event}
                </span>
              </button>
              <Button
                iconOnly
                onClick={() => remove(index)}
                tooltip={t("campaign.actions.delete")}
                variant="bare"
              >
                <Trash2Icon />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className={css["empty"]}>{t("campaign.events.none")}</p>
      )}
    </div>
  );
}
