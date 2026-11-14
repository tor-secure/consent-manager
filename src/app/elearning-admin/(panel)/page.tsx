import { AdminOverviewDashboard } from "@/components/learning/admin/admin-overview-dashboard";
import { getAdminDashboard } from "@/lib/learning/admin-service";

export const metadata = {
  title: "Overview",
};

export default async function ElearningAdminOverviewPage() {
  const data = await getAdminDashboard();
  return <AdminOverviewDashboard data={data} />;
}
