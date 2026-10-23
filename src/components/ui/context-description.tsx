import type { ReactNode } from "react";

export function ContextDescription({ children }: { children: ReactNode }) {
  if (typeof children !== "string" || children.length < 175) return <p className="page-description">{children}</p>;
  const end = children.search(/\.\s/);
  if (end < 20 || end > 170) return <p className="page-description">{children}</p>;
  return <div className="page-description"><p>{children.slice(0, end + 1)}</p><details className="context-description"><summary>How this works</summary><p>{children.slice(end + 2)}</p></details></div>;
}
