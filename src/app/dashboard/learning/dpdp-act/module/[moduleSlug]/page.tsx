import { redirect } from "next/navigation";

export default async function DashboardModuleRedirect({ params }: { params: Promise<{ moduleSlug: string }> }) {
  const { moduleSlug } = await params;
  redirect(`/e-learning/module/${moduleSlug}`);
}
