import Link from "next/link";

import type { DashboardNavigationItem } from "@/config/navigation";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

export function SectionHub({
  title,
  description,
  features,
}: {
  title: string;
  description: string;
  features: DashboardNavigationItem[];
}) {
  return (
    <div className="page-wrap space-y-6 sm:space-y-8">
      <PageHeader title={title} description={description} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {features.map((feature) => (
          <Link
            key={feature.href}
            href={feature.href}
            className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
          >
            <Card hover className="h-full">
              <CardHeader>
                <CardTitle>{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
