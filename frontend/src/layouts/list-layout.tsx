/** biome-ignore-all lint/a11y: TODO */
import { FilterIcon } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { CollapseSidebarButton } from "@/components/collapse-sidebar-button";
import { Masthead } from "@/components/masthead";
import { Button } from "@/components/ui/button";
import { HotkeyTooltip } from "@/components/ui/hotkey";
import { MQ_FLOATING_FILTERS, MQ_FLOATING_SIDEBAR } from "@/utils/constants";
import { cx } from "@/utils/cx";
import { useHotkey } from "@/utils/use-hotkey";
import { useMedia } from "@/utils/use-media";
import css from "./list-layout.module.css";
import { useListLayoutContext } from "./list-layout-context";

type SidebarSection = {
  id: string;
  icon: React.ReactNode;
  title: string;
  content: React.ReactNode;
  /** Shows a small dot on the toggle to draw attention to a new section. */
  badge?: boolean;
};

type Props = {
  children: (props: {
    slotRight?: React.ReactNode;
    slotLeft?: React.ReactNode;
  }) => React.ReactNode;
  className?: string;
  filters?: React.ReactNode;
  hideSidebarCollapse?: boolean;
  mastheadContent?: React.ReactNode;
  noFade?: boolean;
  sidebar?: React.ReactNode;
  /**
   * Optional switchable sidebar sections. When provided, the central toggle
   * becomes one icon per section (a segmented switch) and the sidebar renders
   * the active section's content instead of `sidebar`.
   */
  sidebarSections?: SidebarSection[];
  sidebarWidthMax: string;
};

export function ListLayout(props: Props) {
  const {
    children,
    className,
    filters,
    hideSidebarCollapse,
    mastheadContent,
    noFade,
    sidebar,
    sidebarSections,
    sidebarWidthMax,
  } = props;

  const { t } = useTranslation();

  const {
    filtersOpen,
    sidebarOpen,
    sidebarSection,
    setFiltersOpen,
    setSidebarOpen,
    setSidebarSection,
  } = useListLayoutContext();

  // Resolve the active section, falling back to the first one when the stored
  // id is empty or stale (e.g. on first render or when sections change).
  const activeSectionId =
    sidebarSections?.find((s) => s.id === sidebarSection)?.id ??
    sidebarSections?.[0]?.id;

  const sidebarContent = sidebarSections
    ? sidebarSections.find((s) => s.id === activeSectionId)?.content
    : sidebar;

  const floatingSidebar = useMedia(MQ_FLOATING_SIDEBAR);
  const floatingFilters = useMedia(MQ_FLOATING_FILTERS);

  const filtersRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const onContentClick = useCallback(
    (evt: React.MouseEvent) => {
      if (filtersOpen && floatingFilters) {
        setFiltersOpen(false);
        evt.preventDefault();
      }

      if (sidebarOpen && floatingSidebar) {
        setSidebarOpen(false);
        evt.preventDefault();
      }
    },
    [
      filtersOpen,
      sidebarOpen,
      setSidebarOpen,
      setFiltersOpen,
      floatingFilters,
      floatingSidebar,
    ],
  );

  const preventBubble = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  useEffect(() => {
    setSidebarOpen(!floatingSidebar);

    return () => {
      setSidebarOpen(!floatingSidebar);
    };
  }, [floatingSidebar, setSidebarOpen]);

  useEffect(() => {
    setFiltersOpen(!floatingFilters);

    return () => {
      setFiltersOpen(!floatingFilters);
    };
  }, [floatingFilters, setFiltersOpen]);

  const floatingMenuOpen =
    ((floatingSidebar && sidebarOpen) || (floatingFilters && filtersOpen)) &&
    css["floating-menu-open"];

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((open) => !open);
  }, [setSidebarOpen]);

  const toggleFilters = useCallback(() => {
    setFiltersOpen((open) => !open);
  }, [setFiltersOpen]);

  // A section icon toggles the sidebar shut when it's already the open section,
  // otherwise it opens the sidebar onto that section.
  const selectSection = useCallback(
    (id: string) => {
      if (sidebarOpen && activeSectionId === id) {
        setSidebarOpen(false);
      } else {
        setSidebarSection(id);
        setSidebarOpen(true);
      }
    },
    [sidebarOpen, activeSectionId, setSidebarOpen, setSidebarSection],
  );

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, [setSidebarOpen]);

  const closeFilters = useCallback(() => {
    setFiltersOpen(false);
  }, [setFiltersOpen]);

  useHotkey("alt+1", toggleSidebar);
  useHotkey("alt+2", toggleFilters);

  return (
    <div
      className={cx(
        css["layout"],
        !noFade && "fade-in",
        className,
        floatingMenuOpen && css["floating-menu-open"],
        filters && css["has-filters"],
      )}
      onClick={onContentClick}
      style={{ "--sidebar-width-max": sidebarWidthMax } as React.CSSProperties}
    >
      <Masthead className={css["header"]}>{mastheadContent}</Masthead>
      <div
        className={cx(css["sidebar"], floatingSidebar && css["floating"])}
        data-state={sidebarOpen ? "open" : "closed"}
        onClick={sidebarOpen ? preventBubble : undefined}
        ref={sidebarRef}
      >
        {!hideSidebarCollapse && (
          <CollapseSidebarButton
            className={css["collapse"]}
            hotkey="alt+1"
            hotkeyLabel={t("lists.actions.toggle_sidebar")}
            onClick={closeSidebar}
            orientation="left"
          />
        )}
        {sidebarContent}
      </div>
      <main
        className={cx(
          css["content"],
          (floatingSidebar || !sidebarOpen) && css["collapsed-sidebar"],
          (floatingFilters || !filtersOpen) && css["collapsed-filters"],
        )}
        onClick={onContentClick}
      >
        {children({
          slotLeft: sidebarSections ? (
            <div className={css["sidebar-toggle-group"]}>
              {sidebarSections.map((section) => {
                const active = sidebarOpen && activeSectionId === section.id;
                return (
                  <div className={css["toggle-wrapper"]} key={section.id}>
                    <Button
                      className={cx(active && css["toggle-active"])}
                      onClick={() => selectSection(section.id)}
                      iconOnly
                      size="lg"
                      tooltip={section.title}
                      aria-pressed={active}
                    >
                      {section.icon}
                    </Button>
                    {section.badge && (
                      <span
                        className={css["toggle-badge"]}
                        aria-hidden="true"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <HotkeyTooltip
              keybind="alt+1"
              description={t("lists.actions.toggle_sidebar")}
            >
              <Button
                className={css["toggle-sidebar"]}
                onClick={toggleSidebar}
                iconOnly
                size="lg"
              >
                <i className="icon-deck" />
              </Button>
            </HotkeyTooltip>
          ),
          slotRight: !!filters && (
            <HotkeyTooltip
              keybind="alt+2"
              description={t("lists.actions.toggle_filters")}
            >
              <Button
                className={css["toggle-filters"]}
                onClick={toggleFilters}
                iconOnly
                size="lg"
              >
                <FilterIcon />
              </Button>
            </HotkeyTooltip>
          ),
        })}
      </main>
      {filters && (
        <nav
          className={cx(css["filters"], floatingFilters && css["floating"])}
          data-state={filtersOpen ? "open" : "closed"}
          onClick={floatingFilters ? preventBubble : undefined}
          ref={filtersRef}
        >
          <CollapseSidebarButton
            className={css["collapse"]}
            onClick={closeFilters}
            hotkey="alt+2"
            hotkeyLabel={t("lists.actions.toggle_filters")}
            orientation="right"
          />
          {filters}
        </nav>
      )}
    </div>
  );
}
