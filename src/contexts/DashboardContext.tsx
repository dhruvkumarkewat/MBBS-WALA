import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface DashboardContextValue {
  dark: boolean;
  toggleDark: () => void;
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;
  rightPanelOpen: boolean;
  setRightPanelOpen: (v: boolean) => void;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= 1280 : true
  );

  useEffect(() => {
    const stored = localStorage.getItem('mb-dash-dark');
    if (stored === '1') setDark(true);
  }, []);

  useEffect(() => {
    localStorage.setItem('mb-dash-dark', dark ? '1' : '0');
  }, [dark]);

  useEffect(() => {
    const onResize = () => {
      const w = window.innerWidth;
      if (w >= 1280) {
        setRightPanelOpen(true);
        setSidebarOpen(false);
      } else if (w >= 768) {
        setRightPanelOpen(false);
        setSidebarOpen(false);
      } else {
        setRightPanelOpen(false);
        setSidebarCollapsed(false);
      }
    };
    onResize();
    window.addEventListener('resize', onResize, { passive: true });
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <DashboardContext.Provider
      value={{
        dark,
        toggleDark: () => setDark((d) => !d),
        sidebarOpen,
        setSidebarOpen,
        sidebarCollapsed,
        setSidebarCollapsed,
        rightPanelOpen,
        setRightPanelOpen,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error('useDashboard must be used within DashboardProvider');
  return ctx;
}
