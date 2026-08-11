import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * Post-auth dashboard chrome state (theme + layout panels).
 * Replaces ad-hoc React context for scalable UI state.
 * Do not use on marketing Landing or Login pages.
 */
export interface DashboardUiState {
  dark: boolean;
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  rightPanelOpen: boolean;

  toggleDark: () => void;
  setDark: (value: boolean) => void;
  setSidebarOpen: (value: boolean) => void;
  toggleSidebarOpen: () => void;
  setSidebarCollapsed: (value: boolean) => void;
  toggleSidebarCollapsed: () => void;
  setRightPanelOpen: (value: boolean) => void;
  toggleRightPanel: () => void;

  /** Responsive defaults — call from DashboardLayout on mount/resize */
  applyBreakpoint: (width: number) => void;
}

export const useDashboardUiStore = create<DashboardUiState>()(
  persist(
    (set) => ({
      dark: false,
      sidebarOpen: false,
      sidebarCollapsed: false,
      rightPanelOpen: true,

      toggleDark: () => set((s) => ({ dark: !s.dark })),
      setDark: (value) => set({ dark: value }),

      setSidebarOpen: (value) => set({ sidebarOpen: value }),
      toggleSidebarOpen: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

      setSidebarCollapsed: (value) => set({ sidebarCollapsed: value }),
      toggleSidebarCollapsed: () =>
        set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

      setRightPanelOpen: (value) => set({ rightPanelOpen: value }),
      toggleRightPanel: () => set((s) => ({ rightPanelOpen: !s.rightPanelOpen })),

      applyBreakpoint: (width) => {
        if (width >= 1280) {
          set({ rightPanelOpen: true, sidebarOpen: false });
        } else if (width >= 768) {
          set({ rightPanelOpen: false });
        } else {
          set({ rightPanelOpen: false, sidebarCollapsed: false });
        }
      },
    }),
    {
      name: 'mb-dash-ui-v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        dark: state.dark,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
);

/** Optional selector helpers for minimal re-renders */
export const selectDark = (s: DashboardUiState) => s.dark;
export const selectSidebar = (s: DashboardUiState) => ({
  open: s.sidebarOpen,
  collapsed: s.sidebarCollapsed,
  setOpen: s.setSidebarOpen,
  setCollapsed: s.setSidebarCollapsed,
  toggleOpen: s.toggleSidebarOpen,
  toggleCollapsed: s.toggleSidebarCollapsed,
});
