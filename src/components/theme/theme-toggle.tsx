"use client";

import { useTheme } from "@/components/theme/theme-provider";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, resolved, toggleTheme } = useTheme();
  const isDark = resolved && theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={resolved ? (isDark ? "Switch to light theme" : "Switch to dark theme") : "Toggle color theme"}
      aria-pressed={resolved ? isDark : undefined}
      className={[
        "inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] shadow-[var(--shadow-sm)] transition-[background-color,color,border-color,transform] duration-200 ease-out hover:text-[var(--foreground)] hover:bg-[var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
        className,
      ].join(" ")}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {isDark ? (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
          </>
        ) : (
          <path d="M21 14.5A8.5 8.5 0 1 1 9.5 3 7 7 0 0 0 21 14.5z" />
        )}
      </svg>
    </button>
  );
}
