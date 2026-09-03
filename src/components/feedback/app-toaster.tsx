"use client";

import { Toaster } from "react-hot-toast";

export function AppToaster() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        className: "cmp-toast",
        style: {
          background: "var(--card)",
          color: "var(--foreground)",
          border: "1px solid var(--border)",
          borderRadius: "0.75rem",
          boxShadow: "var(--shadow-md)",
          fontSize: "0.875rem",
        },
        success: {
          iconTheme: {
            primary: "var(--success)",
            secondary: "var(--card)",
          },
        },
        error: {
          iconTheme: {
            primary: "var(--danger)",
            secondary: "var(--card)",
          },
        },
      }}
    />
  );
}
