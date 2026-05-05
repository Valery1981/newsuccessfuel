import { create } from "zustand";
import { persist } from "zustand/middleware";

type Locale = "fr" | "en";

interface UiState {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  locale: Locale;
  theme: "light" | "dark" | "system";
  /** Station sélectionnée globalement (§5.5-03 StationSelector) — null = toutes */
  selectedStationId: string | null;

  setSidebarOpen: (open: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  setLocale: (locale: Locale) => void;
  setTheme: (theme: "light" | "dark" | "system") => void;
  setSelectedStationId: (id: string | null) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      sidebarCollapsed: false,
      locale: "fr",
      theme: "system",
      selectedStationId: null,

      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      toggleSidebar: () =>
        set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setLocale: (locale) => set({ locale }),
      setTheme: (theme) => set({ theme }),
      setSelectedStationId: (selectedStationId) => set({ selectedStationId }),
    }),
    {
      name: "successfuel-ui",
    },
  ),
);
