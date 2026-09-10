import { EmptyState } from "@/components/ui/empty-state";

export function NeedsWebsiteEmpty({
  description = "Add a website first. These tools read the live purposes, vendors, and trackers for a site.",
}: {
  description?: string;
}) {
  return (
    <EmptyState
      title="Add a website first"
      description={description}
      actionLabel="Create website"
      actionHref="/dashboard/websites/new"
    />
  );
}

export function NeedsPolicyEmpty({
  websiteId,
  description = "Create and publish a policy on this website before using this tool.",
}: {
  websiteId?: string | null;
  description?: string;
}) {
  return (
    <EmptyState
      title="Publish a policy first"
      description={description}
      actionLabel={websiteId ? "Create policy" : "Open policies"}
      actionHref={websiteId ? `/dashboard/policies/new?websiteId=${websiteId}` : "/dashboard/policies"}
    />
  );
}
