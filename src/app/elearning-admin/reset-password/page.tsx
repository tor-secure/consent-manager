import { AdminResetPasswordForm } from "@/components/learning/admin/admin-reset-password-form";

export const metadata = {
  title: "Reset password",
};

export default async function ElearningAdminResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return <AdminResetPasswordForm token={typeof token === "string" ? token : ""} />;
}
