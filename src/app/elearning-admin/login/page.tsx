import { redirect } from "next/navigation";

import { AdminLoginForm } from "@/components/learning/admin/admin-login-form";
import {
  getElearningAdminSession,
  isElearningAdminConfigured,
} from "@/lib/learning/admin-auth";

export const metadata = {
  title: "Sign in",
};

export default async function ElearningAdminLoginPage() {
  if (!(await isElearningAdminConfigured())) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f3f7f6] px-4">
        <div className="max-w-md rounded-2xl border border-[#e4eeec] bg-white p-6 text-[#0B2C4A] shadow-sm">
          <h1 className="text-xl font-bold">Admin not configured</h1>
          <p className="mt-2 text-sm leading-6 text-[#4d6570]">
            No admin account is in the learning database yet. Run{" "}
            <code className="rounded bg-[#f3f7f6] px-1">node scripts/seed-elearning-admin.mjs</code>{" "}
            then reload.
          </p>
        </div>
      </div>
    );
  }

  const session = await getElearningAdminSession();
  if (session) redirect("/elearning-admin");

  return <AdminLoginForm />;
}
