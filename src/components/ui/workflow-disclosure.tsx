import type { ReactNode } from "react";

export function WorkflowDisclosure({ title, description, children, open = false }: { title: string; description?: string; children: ReactNode; open?: boolean }) {
  return <details className="workflow-disclosure" open={open || undefined}><summary><span><strong>{title}</strong>{description && <span>{description}</span>}</span><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg></summary><div className="workflow-disclosure-content">{children}</div></details>;
}
