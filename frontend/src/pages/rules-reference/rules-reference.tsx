/** biome-ignore-all lint/security/noDangerouslySetInnerHtml: trusted content. */
import { Trans, useTranslation } from "react-i18next";
import { Checkbox } from "@/components/ui/checkbox";
import { AppLayout } from "@/layouts/app-layout";
import { useStore } from "@/store";
import { parseCardTextHtml } from "@/utils/card-utils";
import "./rules-reference.css";
import {
  AwardIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  ListIcon,
  LockIcon,
  UnlockIcon,
  XIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Scroller } from "@/components/ui/scroller";
import { SearchInput } from "@/components/ui/search-input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTabUrlState } from "@/components/ui/tabs.hooks";
import type { AchievementCompletion } from "@/store/slices/achievements.types";
import { cx } from "@/utils/cx";
import { fuzzyMatch, prepareNeedle } from "@/utils/fuzzy";
import { useGoBack } from "@/utils/use-go-back";
import { useHotkey } from "@/utils/use-hotkey";
import {
  ACHIEVEMENT_BADGES,
  ACHIEVEMENTS,
  type AchievementId,
} from "./achievements";

const REFERENCE_SECTIONS = [
  { value: "achievements", load: undefined },
  {
    value: "campaign-guides",
    load: () => import("@/assets/campaign-guides.html?raw"),
  },
  { value: "rules-glossary", load: () => import("@/assets/rules.html?raw") },
  {
    value: "one-day-missions",
    load: () => import("@/assets/one-day-missions.html?raw"),
  },
  { value: "updates", load: () => import("@/assets/updates.html?raw") },
  { value: "faq", load: () => import("@/assets/faq.html?raw") },
] as const;

type ReferenceSection = (typeof REFERENCE_SECTIONS)[number]["value"];

type ReferencePage = {
  html: string;
  id: string;
  title: string;
};

type ReferenceContent = {
  defaultPageId: string | null;
  pageList: ReferencePage[];
  pages: Map<string, ReferencePage>;
  toc: string;
  elements: Map<string, string>;
};

function RulesReference() {
  const { t } = useTranslation();

  const [section, setSection] =
    useTabUrlState<ReferenceSection>("rules-glossary");
  const [html, setHtml] = useState("");
  const [selectedPageId, setSelectedPageId] = useState(getCurrentHash);
  const [tocOpen, setTocOpen] = useState(false);
  const [search, setSearch] = useState("");

  const activeSection =
    REFERENCE_SECTIONS.find((item) => item.value === section) ??
    REFERENCE_SECTIONS[1];
  const activeSectionValue = activeSection.value;
  const reference = useMemo(() => parseReferenceContent(html), [html]);

  const pageIdForSelected = reference.pages.has(selectedPageId)
    ? selectedPageId
    : reference.elements.get(selectedPageId);

  const activePage =
    (pageIdForSelected ? reference.pages.get(pageIdForSelected) : undefined) ??
    (reference.defaultPageId
      ? reference.pages.get(reference.defaultPageId)
      : undefined);

  const toc = useMemo(
    () => filterToc(reference.toc, search),
    [reference.toc, search],
  );

  const pageList = reference.pageList;
  const activePageIndex = activePage
    ? pageList.findIndex((p) => p.id === activePage.id)
    : -1;
  const prevPage = activePageIndex > 0 ? pageList[activePageIndex - 1] : null;
  const nextPage =
    activePageIndex >= 0 && activePageIndex < pageList.length - 1
      ? pageList[activePageIndex + 1]
      : null;

  const tocTriggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const tocRef = useRef<HTMLDivElement>(null);

  const onSectionChange = useCallback(
    (value: string) => {
      setSearch("");
      setTocOpen(false);
      setSelectedPageId("");
      setSection(value);
    },
    [setSection],
  );

  useEffect(() => {
    if (!activeSection.load) {
      setHtml("");
      return;
    }

    let active = true;
    setHtml("");

    activeSection.load().then((mod) => {
      if (active) setHtml(mod.default);
    });

    return () => {
      active = false;
    };
  }, [activeSection]);

  useEffect(() => {
    const onHashChange = () => {
      setSelectedPageId(getCurrentHash());
      setSearch("");
      setTocOpen(false);
    };

    window.addEventListener("hashchange", onHashChange);

    return () => {
      window.removeEventListener("hashchange", onHashChange);
    };
  }, []);
  // biome-ignore lint/correctness/useExhaustiveDependencies: trigger scroll after dom update
  useEffect(() => {
    if (selectedPageId) {
      const timer = setTimeout(() => {
        const el = document.getElementById(selectedPageId);
        if (el) {
          el.scrollIntoView({ behavior: "smooth" });
        } else {
          window.scrollTo({ behavior: "auto", top: 0 });
        }
      }, 0);
      return () => clearTimeout(timer);
    }
    window.scrollTo({ behavior: "auto", top: 0 });
  }, [selectedPageId, activePage?.id, html]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: highlight after toc re-render
  useEffect(() => {
    tocRef.current?.querySelectorAll(".toc a.active").forEach((el) => {
      el.classList.remove("active");
    });

    const activeLink = tocRef.current?.querySelector(
      `.toc a[href="#${CSS.escape(activePage?.id ?? "")}"]`,
    );

    if (!activeLink) return;

    activeLink.classList.add("active");

    let parent = activeLink.parentElement;
    while (parent) {
      if (parent instanceof HTMLDetailsElement) parent.open = true;
      parent = parent.parentElement;
    }
  }, [activePage?.id, toc]);

  useHotkey("/", () => {
    searchRef.current?.focus();
  });

  const goBack = useGoBack();

  const onToggleToc = useCallback(() => {
    setTocOpen((prev) => !prev);
  }, []);

  const onCloseToc = useCallback(() => {
    setTocOpen(false);
  }, []);

  useClickOutside(tocRef, tocTriggerRef, onCloseToc, tocOpen);

  return (
    <AppLayout title={t("rules.title")}>
      <div className="container">
        <Button
          className="toc-toggle"
          onClick={onToggleToc}
          ref={tocTriggerRef}
          size="xl"
          variant="primary"
        >
          {tocOpen ? <XIcon /> : <ListIcon />} {t("rules.toc")}
        </Button>
        <div className={cx("toc-container", tocOpen && "open")} ref={tocRef}>
          <h1 className="toc-title">{t("rules.toc")}</h1>

          <div className="toc-inner">
            <SearchInput
              className="rules-search"
              id="rules-search"
              onValueChange={setSearch}
              placeholder={t("rules.search_placeholder")}
              ref={searchRef}
              value={search}
            />
          </div>

          <nav className="toc-nav">
            <Button size="sm" onClick={goBack}>
              <ChevronLeftIcon />
              {t("common.back")}
            </Button>
            <Button size="sm" as="a" href="#">
              <ChevronUpIcon />
              {t("rules.back_to_top")}
            </Button>
          </nav>

          <Scroller className="toc-inner">
            {activeSection.value === "achievements" ? (
              <AchievementsToc search={search} />
            ) : (
              <div
                key={section}
                dangerouslySetInnerHTML={{
                  __html: parseCardTextHtml(toc, { newLines: "skip" }),
                }}
              />
            )}
          </Scroller>
        </div>
        <div className="rules-container">
          <Tabs value={activeSection.value} onValueChange={onSectionChange}>
            <TabsList className="rules-tabs">
              {REFERENCE_SECTIONS.map((item) => (
                <TabsTrigger key={item.value} value={item.value}>
                  {t(`rules.sections.${item.value}`)}
                </TabsTrigger>
              ))}
            </TabsList>

            {REFERENCE_SECTIONS.map((item) => (
              <TabsContent
                className="rules-tab-content"
                forceMount
                key={item.value}
                value={item.value}
              >
                {item.value === "achievements" &&
                item.value === activeSection.value ? (
                  <AchievementsPanel search={search} />
                ) : item.value === activeSection.value && html && activePage ? (
                  <div
                    data-section={activeSection.value}
                    key={`${activeSectionValue}-${activePage.id}`}
                  >
                    <div
                      dangerouslySetInnerHTML={{
                        __html: parseCardTextHtml(activePage.html, {
                          newLines: "skip",
                        }),
                      }}
                    />
                    <nav className="rules-pagination">
                      {prevPage && (
                        <a
                          href={`#${prevPage.id}`}
                          className="pagination-link prev"
                        >
                          <div className="pagination-label">Previous</div>
                          <div className="pagination-title">
                            <ChevronLeftIcon /> {prevPage.title}
                          </div>
                        </a>
                      )}
                      {nextPage && (
                        <a
                          href={`#${nextPage.id}`}
                          className="pagination-link next"
                        >
                          <div className="pagination-label">Next</div>
                          <div className="pagination-title">
                            {nextPage.title} <ChevronRightIcon />
                          </div>
                        </a>
                      )}
                    </nav>
                  </div>
                ) : (
                  <p>{t("rules.loading")}</p>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>
    </AppLayout>
  );
}

function AchievementsToc({ search }: { search: string }) {
  const { t } = useTranslation();
  const completed = useStore((state) => state.achievements.completed);
  const filteredAchievements = useFilteredAchievements(search);
  const completedCount = ACHIEVEMENTS.filter((id) => completed[id]).length;

  return (
    <div className="toc achievements-toc">
      <p>
        {t("rules.achievements.progress", {
          completed: completedCount,
          total: ACHIEVEMENTS.length,
        })}
      </p>
      <ul>
        {filteredAchievements.map((id) => (
          <li key={id}>
            <a href={`#achievement-${id}`}>
              {completed[id] ? <AwardIcon /> : null}
              {t(`rules.achievements.items.${id}.title`)}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AchievementsPanel({ search }: { search: string }) {
  const { t } = useTranslation();
  const completed = useStore((state) => state.achievements.completed);
  const toggleAchievement = useStore((state) => state.toggleAchievement);
  const setAchievementDate = useStore((state) => state.setAchievementDate);
  const [locked, setLocked] = useState(true);
  const filteredAchievements = useFilteredAchievements(search);
  const completedCount = ACHIEVEMENTS.filter((id) => completed[id]).length;

  return (
    <section className="achievements">
      <header className="achievements-header">
        <div>
          <h1>{t("rules.sections.achievements")}</h1>
          <p>
            {t("rules.achievements.progress", {
              completed: completedCount,
              total: ACHIEVEMENTS.length,
            })}
          </p>
        </div>
        <Button
          onClick={() => setLocked((prev) => !prev)}
          size="sm"
          type="button"
        >
          {locked ? <LockIcon /> : <UnlockIcon />}
          {locked
            ? t("rules.achievements.unlock")
            : t("rules.achievements.lock")}
        </Button>
      </header>

      {filteredAchievements.length ? (
        <div className="achievements-list">
          {filteredAchievements.map((id) => (
            <AchievementItem
              completed={!!completed[id]}
              completion={completionValue(completed[id])}
              id={id}
              locked={locked}
              key={id}
              onDateChange={setAchievementDate}
              onToggle={toggleAchievement}
            />
          ))}
        </div>
      ) : (
        <p>{t("rules.achievements.empty")}</p>
      )}
    </section>
  );
}

function AchievementItem({
  completed,
  completion,
  id,
  locked,
  onDateChange,
  onToggle,
}: {
  completed: boolean;
  completion: AchievementCompletion | undefined;
  id: AchievementId;
  locked: boolean;
  onDateChange: (id: AchievementId, date: string) => void;
  onToggle: (id: AchievementId) => void;
}) {
  const { i18n, t } = useTranslation();
  const date = completion?.date ?? "";

  return (
    <article
      className={cx(
        "achievement",
        completed && "completed",
        locked && "locked",
      )}
      id={`achievement-${id}`}
    >
      <img
        alt={t(`rules.achievements.items.${id}.title`)}
        className="achievement-badge"
        loading="lazy"
        src={ACHIEVEMENT_BADGES[id]}
      />
      {!completed && (
        <span
          className={cx(
            "achievement-lock-state",
            locked ? "locked" : "unlocked",
          )}
          title={
            locked
              ? t("rules.achievements.unlock_to_edit")
              : t("rules.achievements.unlocked_to_edit")
          }
        >
          {locked ? <LockIcon /> : <UnlockIcon />}
          <span className="sr-only">
            {locked
              ? t("rules.achievements.unlock_to_edit")
              : t("rules.achievements.unlocked_to_edit")}
          </span>
        </span>
      )}
      {completed && (
        <AchievementDate
          date={date}
          id={id}
          locale={i18n.language}
          locked={locked}
          onDateChange={onDateChange}
        />
      )}
      <Checkbox
        checked={completed}
        className="achievement-check"
        disabled={locked}
        label={
          <span>
            <strong>{t(`rules.achievements.items.${id}.title`)}</strong>
            <span className="achievement-description">
              <Trans
                components={{
                  per_ranger: <span className="core-per_ranger" />,
                }}
                i18nKey={`rules.achievements.items.${id}.description`}
                t={t}
              />
            </span>
          </span>
        }
        onCheckedChange={() => onToggle(id)}
      />
    </article>
  );
}

function AchievementDate({
  date,
  id,
  locale,
  locked,
  onDateChange,
}: {
  date: string;
  id: AchievementId;
  locale: string;
  locked: boolean;
  onDateChange: (id: AchievementId, date: string) => void;
}) {
  const { t } = useTranslation();

  if (!locked) {
    return (
      <label className="achievement-date-field">
        <span className="sr-only">{t("rules.achievements.date_label")}</span>
        <input
          aria-label={t("rules.achievements.date_label")}
          onChange={(evt) => onDateChange(id, evt.target.value)}
          type="date"
          value={date}
        />
      </label>
    );
  }

  return (
    <time className="achievement-date" dateTime={date || undefined}>
      {date
        ? t("rules.achievements.achieved_on", {
            date: formatAchievementDate(date, locale),
          })
        : t("rules.achievements.date_missing")}
    </time>
  );
}

function completionValue(
  completion: AchievementCompletion | boolean | undefined,
) {
  return typeof completion === "object" ? completion : undefined;
}

function formatAchievementDate(date: string, locale: string) {
  const value = new Date(`${date}T00:00:00`);
  if (Number.isNaN(value.getTime())) return date;

  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(value);
}

function useFilteredAchievements(search: string) {
  const { t } = useTranslation();

  return useMemo(() => {
    if (search.length <= 2) return ACHIEVEMENTS;

    const needle = prepareNeedle(search);
    if (!needle) return ACHIEVEMENTS;

    return ACHIEVEMENTS.filter((id) =>
      fuzzyMatch(
        [
          t(`rules.achievements.items.${id}.title`).toLowerCase(),
          t(`rules.achievements.items.${id}.description`).toLowerCase(),
        ],
        needle,
      ),
    );
  }, [search, t]);
}

function parseReferenceContent(html: string): ReferenceContent {
  const [toc = "", rules = ""] = html.split("<!-- BEGIN RULES -->");
  const container = document.createElement("div");
  container.innerHTML = rules;

  const wrappedPages = [...container.querySelectorAll(".rules-page")];
  const pageNodes = wrappedPages.length
    ? wrappedPages
    : splitLegacyPages(container);
  const pages = new Map<string, ReferencePage>();
  const elements = new Map<string, string>();

  for (const page of pageNodes) {
    const heading = page.querySelector("[id]");
    const id = page.getAttribute("data-page-id") ?? heading?.id;

    if (!id) continue;

    normalizeRuleOptions(page);

    pages.set(id, {
      html: page.outerHTML,
      id,
      title: heading?.textContent?.trim() ?? id,
    });

    for (const el of page.querySelectorAll("[id]")) {
      if (el.id) elements.set(el.id, id);
    }
  }

  const pageList = buildPageList(toc, pages);

  return {
    defaultPageId: pages.keys().next().value ?? null,
    pageList,
    pages,
    toc,
    elements,
  };
}

function buildPageList(toc: string, pages: Map<string, ReferencePage>) {
  const container = document.createElement("div");
  container.innerHTML = toc;

  const orderedPages: ReferencePage[] = [];
  const seen = new Set<string>();

  for (const link of container.querySelectorAll("a[href^='#']")) {
    const id = link.getAttribute("href")?.slice(1);
    const page = id ? pages.get(id) : undefined;

    if (!page || seen.has(page.id)) continue;

    orderedPages.push(page);
    seen.add(page.id);
  }

  for (const page of pages.values()) {
    if (seen.has(page.id)) continue;

    orderedPages.push(page);
    seen.add(page.id);
  }

  return orderedPages;
}

function normalizeRuleOptions(page: Element) {
  for (const option of page.querySelectorAll(".rules-option")) {
    if (option.querySelector(".rules-option-label")) continue;

    const firstChild = [...option.childNodes].find(
      (node) => node.nodeType !== Node.TEXT_NODE || node.textContent?.trim(),
    );

    if (firstChild instanceof HTMLElement && firstChild.tagName === "STRONG") {
      firstChild.classList.add("rules-option-label");
      continue;
    }

    if (!(firstChild instanceof Text)) continue;

    const label = getOptionLabel(firstChild.textContent ?? "");
    if (!label) continue;

    const span = document.createElement("span");
    span.className = "rules-option-label";
    span.textContent = label;

    firstChild.textContent = firstChild.textContent?.slice(label.length) ?? "";
    option.insertBefore(span, firstChild);
  }
}

function getOptionLabel(text: string) {
  const match = text.match(/^\s*[A-Z]\)\s.*?[.!?:](?=\s|$)/);
  return match?.[0] ?? (/^\s*[A-Z]\)\s/.test(text) ? text.trimEnd() : null);
}

function splitLegacyPages(container: HTMLElement) {
  const rules = container.querySelector("#rules");
  if (!rules) return [];

  const pages: HTMLElement[] = [];
  let currentPage: HTMLElement | null = null;

  for (const child of [...rules.children]) {
    if (!(child instanceof HTMLElement)) continue;

    if (child.id) {
      currentPage = document.createElement("article");
      currentPage.className = "rules-page";
      currentPage.dataset.pageId = child.id;
      pages.push(currentPage);
    }

    currentPage?.append(child.cloneNode(true));
  }

  return pages;
}

function filterToc(toc: string, search: string) {
  if (search.length <= 2) return toc;

  const needle = prepareNeedle(search);
  if (!needle) return toc;

  const container = document.createElement("div");
  container.innerHTML = toc;

  for (const listItem of [...container.querySelectorAll("li")].reverse()) {
    const childMatches = Boolean(listItem.querySelector("li"));
    const text = listItem.textContent?.toLowerCase() ?? "";
    const selfMatches = fuzzyMatch([text], needle);

    if (!childMatches && !selfMatches) {
      listItem.remove();
      continue;
    }

    if (selfMatches) {
      listItem.querySelector("details")?.setAttribute("open", "");
    }
  }

  return container.innerHTML;
}

function getCurrentHash() {
  return window.location.hash.slice(1);
}

function useClickOutside(
  ref: React.RefObject<HTMLElement | null>,
  tocTriggerRef: React.RefObject<HTMLElement | null>,
  onClickOutside: () => void,
  enabled: boolean,
) {
  useEffect(() => {
    function handleClickOutside(evt: MouseEvent) {
      if (
        enabled &&
        ref.current &&
        !ref.current.contains(evt.target as Node) &&
        evt.target !== tocTriggerRef.current &&
        !tocTriggerRef.current?.contains(evt.target as Node)
      ) {
        evt.preventDefault();
        onClickOutside();
      }
    }

    document.addEventListener("pointerdown", handleClickOutside);
    return () => {
      document.removeEventListener("pointerdown", handleClickOutside);
    };
  }, [ref, onClickOutside, enabled, tocTriggerRef]);
}

export default RulesReference;
