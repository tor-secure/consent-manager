export type StudioTab =
  | "presets"
  | "layout"
  | "style"
  | "text"
  | "content"
  | "settings";

export type StudioViewport = "desktop" | "mobile";

export const STUDIO_TABS: Array<{
  id: StudioTab;
  label: string;
  icon: "presets" | "layout" | "style" | "text" | "content" | "settings";
}> = [
  { id: "presets", label: "Presets", icon: "presets" },
  { id: "layout", label: "Layout", icon: "layout" },
  { id: "style", label: "Style", icon: "style" },
  { id: "text", label: "Text", icon: "text" },
  { id: "content", label: "Content", icon: "content" },
  { id: "settings", label: "Settings", icon: "settings" },
];

export function StudioTabIcon({
  name,
  className = "h-4 w-4",
}: {
  name: (typeof STUDIO_TABS)[number]["icon"];
  className?: string;
}) {
  const common = {
    className,
    fill: "none" as const,
    viewBox: "0 0 16 16",
    stroke: "currentColor",
    strokeWidth: 1.5,
    "aria-hidden": true as const,
  };

  switch (name) {
    case "presets":
      return (
        <svg {...common}>
          <rect x="2" y="2" width="5" height="5" rx="1" />
          <rect x="9" y="2" width="5" height="5" rx="1" />
          <rect x="2" y="9" width="5" height="5" rx="1" />
          <rect x="9" y="9" width="5" height="5" rx="1" />
        </svg>
      );
    case "layout":
      return (
        <svg {...common}>
          <rect x="2" y="2" width="12" height="12" rx="1.5" />
          <path strokeLinecap="round" d="M2 6h12M6 6v8" />
        </svg>
      );
    case "style":
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="5.5" />
          <circle cx="8" cy="8" r="2" fill="currentColor" stroke="none" />
        </svg>
      );
    case "text":
      return (
        <svg {...common}>
          <path strokeLinecap="round" d="M3 4h10M8 4v9M5 13h6" />
        </svg>
      );
    case "content":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="10" height="10" rx="1.5" />
          <path strokeLinecap="round" d="M5.5 6.5h5M5.5 9.5h3.5" />
        </svg>
      );
    case "settings":
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="2" />
          <path
            strokeLinecap="round"
            d="M8 2.5v1.5M8 12v1.5M2.5 8h1.5M12 8h1.5M4.1 4.1l1.1 1.1M10.8 10.8l1.1 1.1M11.9 4.1l-1.1 1.1M5.2 10.8l-1.1 1.1"
          />
        </svg>
      );
  }
}
