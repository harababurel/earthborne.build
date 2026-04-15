import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { useShallow } from "zustand/react/shallow";
import PackIcon from "@/components/icons/pack-icon";
import { Scroller } from "@/components/ui/scroller";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStore } from "@/store";
import { selectMetadata } from "@/store/selectors/shared";
import { cx } from "@/utils/cx";
import { displayPackName } from "@/utils/formatting";
import css from "./set-tree.module.css";

export type CardTypeTab =
  | "ranger"
  | "path"
  | "location"
  | "weather"
  | "mission"
  | "role"
  | "aspect"
  | "challenge";

type SetTreeProps = {
  activePackCode?: string;
  cardTypeTab: CardTypeTab;
  onCardTypeTabChange: (value: CardTypeTab) => void;
};

export function SetTree({
  activePackCode,
  cardTypeTab,
  onCardTypeTabChange,
}: SetTreeProps) {
  const { t } = useTranslation();
  const packs = useStore(
    useShallow((state) => Object.values(selectMetadata(state).packs)),
  );

  return (
    <Scroller className={css["tree"]}>
      <Tabs
        className={css["chapter-tabs"]}
        value={cardTypeTab}
        onValueChange={(value) => onCardTypeTabChange(value as CardTypeTab)}
      >
        <TabsList>
          <TabsTrigger value="ranger">
            {t("browse.tabs.ranger")}
          </TabsTrigger>
          <TabsTrigger value="path">
            {t("browse.tabs.path")}
          </TabsTrigger>
          <TabsTrigger value="location">
            {t("browse.tabs.location")}
          </TabsTrigger>
          <TabsTrigger value="weather">
            {t("browse.tabs.weather")}
          </TabsTrigger>
          <TabsTrigger value="mission">
            {t("browse.tabs.mission")}
          </TabsTrigger>
          <TabsTrigger value="role">
            {t("browse.tabs.role")}
          </TabsTrigger>
          <TabsTrigger value="aspect">
            {t("browse.tabs.aspect")}
          </TabsTrigger>
          <TabsTrigger value="challenge">
            {t("browse.tabs.challenge")}
          </TabsTrigger>
        </TabsList>
      </Tabs>
      <ol className={css["children"]}>
        {packs.map((pack) => {
          const isActive = pack.code === activePackCode;
          return (
            <li key={pack.code}>
              <div
                className={cx(css["node"], isActive && css["active"])}
              >
                <Link
                  className={css["node-link"]}
                  to={`/browse/pack/${pack.code}${window.location.search}`}
                >
                  <PackIcon className={css["node-icon"]} code={pack.code} />
                  {displayPackName(pack)}
                </Link>
              </div>
            </li>
          );
        })}
      </ol>
    </Scroller>
  );
}
