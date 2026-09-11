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

export function NeedsScanEmpty({
  websiteId,
  description = "Run a scan so this tool can read trackers, findings, and quality inputs. Publish a policy if you have not already.",
}: {
  websiteId?: string | null;
  description?: string;
}) {
  return (
    <EmptyState
      title="Run a scan first"
      description={description}
      actionLabel="Open scanner"
      actionHref={websiteId ? `/dashboard/scanner?website=${websiteId}` : "/dashboard/scanner"}
    />
  );
}

export function NeedsInstallEmpty({
  websiteId,
  description = "Install the SDK and collect a visitor choice before this tool has live consent data.",
}: {
  websiteId?: string | null;
  description?: string;
}) {
  return (
    <EmptyState
      title="Install the SDK first"
      description={description}
      actionLabel="Install SDK"
      actionHref={websiteId ? `/dashboard/websites/${websiteId}/installation` : "/dashboard/developers"}
    />
  );
}
