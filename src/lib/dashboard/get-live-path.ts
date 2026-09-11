import type { HomeDashboardCounts } from "@/lib/dashboard/home-queries";

export type GetLiveStep = {
  id: string;
  label: string;
  href: string;
  done: boolean;
  hint: string;
};

export function buildGetLiveSteps(counts: HomeDashboardCounts): GetLiveStep[] {
  const installHref = counts.firstWebsiteId
    ? `/dashboard/websites/${counts.firstWebsiteId}/installation`
    : "/dashboard/websites";
  const publishHref = counts.firstUnpublishedPolicyId
    ? `/dashboard/policies/${counts.firstUnpublishedPolicyId}#policy-publish`
    : counts.policyCount > 0
      ? "/dashboard/policies"
      : "/dashboard/policies/new";

  return [
    {
      id: "website",
      label: "Website",
      href: counts.websiteCount > 0 ? "/dashboard/websites" : "/dashboard/websites/new",
      done: counts.websiteCount > 0,
      hint: counts.websiteCount > 0
        ? `${counts.websiteCount} site${counts.websiteCount === 1 ? "" : "s"}`
        : "Add the domain you will install on",
    },
    {
      id: "purposes",
      label: "Purposes",
      href: counts.purposeCount > 0 ? "/dashboard/purposes" : "/dashboard/purposes/new",
      done: counts.purposeCount > 0,
      hint: counts.purposeCount > 0
        ? `${counts.purposeCount} purpose${counts.purposeCount === 1 ? "" : "s"}`
        : "Create analytics, ads, and necessary",
    },
    {
      id: "vendors",
      label: "Vendors",
      href: "/dashboard/vendors",
      done: counts.unknownVendorCount === 0,
      hint:
        counts.unknownVendorCount > 0
          ? `${counts.unknownVendorCount} still need a role`
          : counts.vendorCount > 0
            ? `${counts.mappedVendorCount} with a real role`
            : "Optional until you add a vendor",
    },
    {
      id: "policy",
      label: "Policy",
      href: counts.policyCount > 0 ? "/dashboard/policies" : "/dashboard/policies/new",
      done: counts.policyCount > 0,
      hint: counts.policyCount > 0
        ? `${counts.policyCount} polic${counts.policyCount === 1 ? "y" : "ies"}`
        : "Attach purposes and open Studio",
    },
    {
      id: "publish",
      label: "Publish",
      href: publishHref,
      done: counts.publishedCount > 0,
      hint: counts.publishedCount > 0 ? `${counts.publishedCount} published` : "Fix compliance errors, then publish",
    },
    {
      id: "install",
      label: "Install",
      href: installHref,
      done: counts.publishedCount > 0 && counts.totalConsents > 0,
      hint: counts.totalConsents > 0 ? "SDK is collecting records" : "Paste the snippet in <head>",
    },
  ];
}

export function isSetupComplete(counts: HomeDashboardCounts) {
  return counts.websiteCount > 0 && counts.publishedCount > 0 && counts.totalConsents > 0;
}
