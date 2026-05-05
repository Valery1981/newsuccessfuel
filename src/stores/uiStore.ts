import { create } from "zustand";
import { persist } from "zustand/middleware";

type Locale = "fr" | "en";

interface UiState {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  locale: Locale;
  theme: "light" | "dark" | "system";

  setSidebarOpen: (open: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  setLocale: (locale: Locale) => void;
  setTheme: (theme: "light" | "dark" | "system") => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      sidebarOpen: true,
      sidebarCollapsed: false,
      locale: "fr",
      theme: "system",

      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      toggleSidebar: () =>
        set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setLocale: (locale) => set({ locale }),
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: "successfuel-ui",
    }
  )
);
