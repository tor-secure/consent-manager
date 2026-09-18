"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";

export type Theme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  resolved: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "cmp:theme";
const THEME_EVENT = "cmp-theme-change";

function isDashboardPath(pathname: string) {
  return pathname === "/dashboard" || pathname.startsWith("/dashboard/");
}

function applyVisualTheme(theme: Theme, pathname: string) {
  const dark = isDashboardPath(pathname) && theme === "dark";
  const root = document.documentElement;
  root.classList.toggle("dark", dark);
  root.style.colorScheme = dark ? "dark" : "light";
}

function readStoredTheme(): Theme {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "dark" || saved === "light") return saved;
  } catch {
    /* ignore */
  }
  try {
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
  } catch {
    /* ignore */
  }
  return "light";
}

function subscribeToTheme(onStoreChange: () => void) {
  const syncTheme = () => {
    onStoreChange();
  };
  window.addEventListener("storage", syncTheme);
  window.addEventListener(THEME_EVENT, syncTheme);
  return () => {
    window.removeEventListener("storage", syncTheme);
    window.removeEventListener(THEME_EVENT, syncTheme);
  };
}

function subscribeToHydration() {
  return () => {};
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  const theme = useSyncExternalStore<Theme>(
    subscribeToTheme,
    readStoredTheme,
    () => "light",
  );
  const resolved = useSyncExternalStore(subscribeToHydration, () => true, () => false);

  useEffect(() => {
    applyVisualTheme(theme, pathname);
  }, [theme, pathname]);

  const setTheme = useCallback(
    (next: Theme) => {
      applyVisualTheme(next, pathname);
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
      window.dispatchEvent(new Event(THEME_EVENT));
    },
    [pathname],
  );

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [setTheme, theme]);

  const value = useMemo(
    () => ({ theme, resolved, setTheme, toggleTheme }),
    [theme, resolved, setTheme, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
