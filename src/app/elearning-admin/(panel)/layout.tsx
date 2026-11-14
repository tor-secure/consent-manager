import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AdminShell } from "@/components/learning/admin/admin-shell";
import {
  getElearningAdminSession,
  isElearningAdminConfigured,
} from "@/lib/learning/admin-auth";

export default async function ElearningAdminPanelLayout({ children }: { children: ReactNode }) {
  if (!(await isElearningAdminConfigured())) redirect("/elearning-admin/login");
  const session = await getElearningAdminSession();
  if (!session) redirect("/elearning-admin/login");
  return <AdminShell username={session.sub}>{children}</AdminShell>;
}
