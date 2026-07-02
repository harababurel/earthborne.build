import type { Campaign, CampaignNote } from "@earthborne-build/shared";
import { CheckIcon, PlusIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import { Button } from "../ui/button";
import css from "./rail.module.css";

export function NotesPanel({ campaign }: { campaign: Campaign }) {
  const { t } = useTranslation();
  const updateCampaign = useStore((state) => state.updateCampaign);
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState("");

  const setNotes = (notes: CampaignNote[]) =>
    updateCampaign(campaign.id, { notes });

  const onConfirm = () => {
    if (text.trim()) {
      setNotes([
        ...campaign.notes,
        { note: text.trim(), day: campaign.day, crossed_out: false },
      ]);
    }
    setText("");
    setAdding(false);
  };

  const toggle = (index: number) =>
    setNotes(
      campaign.notes.map((n, i) =>
        i === index ? { ...n, crossed_out: !n.crossed_out } : n,
      ),
    );

  const remove = (index: number) => {
    if (!confirm(t("campaign.actions.delete_entry_confirm"))) return;
    setNotes(campaign.notes.filter((_, i) => i !== index));
  };

  return (
    <section className={css["panel"]}>
      <h3 className={css["title"]}>{t("campaign.tabs.notes")}</h3>
      {campaign.notes.length > 0 && (
        <ul className={css["list"]}>
          {campaign.notes.map((note, index) => (
            <li className={css["item"]} key={`${note.note}-${index}`}>
              <button
                className={note.crossed_out ? css["crossed"] : css["note-text"]}
                onClick={() => toggle(index)}
                type="button"
              >
                {note.note}
              </button>
              <Button
                iconOnly
                onClick={() => remove(index)}
                tooltip={t("campaign.actions.delete")}
                variant="bare"
              >
                <XIcon />
              </Button>
            </li>
          ))}
        </ul>
      )}
      {adding ? (
        <div className={css["add-row"]}>
          <input
            // biome-ignore lint/a11y/noAutofocus: focus the freshly opened note input.
            autoFocus
            className={css["input"]}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onConfirm()}
            placeholder={t("campaign.notes.placeholder")}
            value={text}
          />
          <Button iconOnly onClick={onConfirm} variant="bare">
            <CheckIcon />
          </Button>
          <Button
            iconOnly
            onClick={() => {
              setAdding(false);
              setText("");
            }}
            variant="bare"
          >
            <XIcon />
          </Button>
        </div>
      ) : (
        <Button onClick={() => setAdding(true)} size="sm" variant="bare">
          <PlusIcon /> {t("campaign.notes.add")}
        </Button>
      )}
    </section>
  );
}
