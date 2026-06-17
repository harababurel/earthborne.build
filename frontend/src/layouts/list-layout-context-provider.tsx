import { useMemo, useState } from "react";
import { MQ_FLOATING_FILTERS, MQ_FLOATING_SIDEBAR } from "@/utils/constants";
import { ListLayoutContext } from "./list-layout-context";

export function ListLayoutContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(
    !window.matchMedia(MQ_FLOATING_SIDEBAR).matches,
  );

  const [filtersOpen, setFiltersOpen] = useState(
    !window.matchMedia(MQ_FLOATING_FILTERS).matches,
  );

  const [sidebarSection, setSidebarSection] = useState("");

  const contextValue = useMemo(
    () => ({
      sidebarOpen,
      filtersOpen,
      sidebarSection,
      setSidebarOpen,
      setFiltersOpen,
      setSidebarSection,
    }),
    [sidebarOpen, filtersOpen, sidebarSection],
  );

  return <ListLayoutContext value={contextValue}>{children}</ListLayoutContext>;
}
