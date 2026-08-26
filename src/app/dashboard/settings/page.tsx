import { redirect } from "next/navigation";

// /dashboard/settings → /dashboard/settings/organization
export default function SettingsIndexPage() {
  redirect("/dashboard/settings/organization");
}
