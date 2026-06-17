import { createContext, useContext } from "react";

type Context = {
  sidebarOpen: boolean;
  filtersOpen: boolean;
  sidebarSection: string;
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setFiltersOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setSidebarSection: React.Dispatch<React.SetStateAction<string>>;
};

export const ListLayoutContext = createContext<Context>({
  sidebarOpen: false,
  filtersOpen: false,
  sidebarSection: "",
  setSidebarOpen: () => {},
  setFiltersOpen: () => {},
  setSidebarSection: () => {},
});

export function useListLayoutContext() {
  const context = useContext(ListLayoutContext);
  if (!context) {
    throw new Error(
      "useListLayoutContext must be used within a ListLayoutContextProvider",
    );
  }
  return context;
}
