import type { Campaign } from "@earthborne-build/shared";
import { useTranslation } from "react-i18next";
import {
  DefaultModalContent,
  Modal,
  ModalActions,
  ModalBackdrop,
  ModalInner,
} from "../../ui/modal";
import { TerrainGlyph } from "../glyphs";
import css from "./modals.module.css";

export function RecordedJourneyModal({ campaign }: { campaign: Campaign }) {
  const { t } = useTranslation();
  const history = [...campaign.history].reverse();

  return (
    <Modal>
      <ModalBackdrop />
      <ModalInner size="28rem">
        <ModalActions />
        <DefaultModalContent title={t("campaign.journey.history")}>
          {history.length ? (
            <ul className={css["guide-list"]}>
              {history.map((entry, i) => (
                <li className={css["option"]} key={`${entry.day}-${i}`}>
                  <span className={css["sub"]}>
                    {t("campaign.journey.day", { day: entry.day })}
                  </span>
                  <span>
                    {entry.location
                      ? t(`campaign.data.locations.${entry.location}`)
                      : "—"}
                  </span>
                  {entry.path_terrain && (
                    <TerrainGlyph terrain={entry.path_terrain} />
                  )}
                  {entry.camped && (
                    <span className={css["sub"]}>
                      {t("campaign.journey.camped")}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className={css["sub"]}>{t("campaign.journey.history_empty")}</p>
          )}
        </DefaultModalContent>
      </ModalInner>
    </Modal>
  );
}
