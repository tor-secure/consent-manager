import { redirect } from "next/navigation";

export default async function DashboardQuizRedirect({ params }: { params: Promise<{ moduleSlug: string }> }) {
  const { moduleSlug } = await params;
  redirect(`/e-learning/module/${moduleSlug}/quiz`);
}
