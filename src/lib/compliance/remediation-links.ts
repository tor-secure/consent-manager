export type RemediationLink = {
  href: string;
  label: string;
};

export function remediationLinkForRule(
  code: string,
  policyId: string,
  websiteId?: string | null,
): RemediationLink {
  if (code.startsWith("PURPOSE_")) {
    return { href: "/dashboard/purposes", label: "Open purposes" };
  }
  if (
    code.startsWith("VENDOR_") ||
    code === "INACTIVE_VENDOR_REFERENCED" ||
    code === "SUBPROCESSOR_RELATIONSHIP_MISSING" ||
    code === "PROCESSING_ACTIVITY_PURPOSE_MISSING" ||
    code === "PROCESSING_ACTIVITY_DATA_CATEGORY_MISSING"
  ) {
    return { href: "/dashboard/vendors", label: "Open vendors" };
  }
  if (code.startsWith("TRACKER_") || code === "CCPA_OPT_OUT_TRACKER_MAPPING_MISSING") {
    return { href: "/dashboard/trackers", label: "Map trackers" };
  }
  if (code.startsWith("NOTICE_") || code.startsWith("GDPR_") || code.startsWith("DPDP_NOTICE") || code.startsWith("CCPA_MISSING") || code === "CCPA_MISSING_DO_NOT_SELL_SHARE") {
    return { href: `/dashboard/policies/${policyId}/studio`, label: "Open Banner Studio" };
  }
  if (code.startsWith("TRANSFER_") || code === "LGPD_TRANSFER_MECHANISM_MISSING") {
    return { href: "/dashboard/transfers", label: "Open transfers" };
  }
  if (code.startsWith("CHILD_") || code.startsWith("AGE_") || code.startsWith("GUARDIAN_") || code === "CCPA_MINOR_CONFIG_MISSING") {
    return {
      href: websiteId ? `/dashboard/websites/${websiteId}/child-protection` : "/dashboard/websites",
      label: "Child protection",
    };
  }
  if (code.startsWith("CCPA_")) {
    return { href: "/dashboard/vendors", label: "Classify vendors" };
  }
  if (code.startsWith("POLICY_WEBSITE")) {
    return { href: "/dashboard/websites", label: "Open websites" };
  }
  return { href: `/dashboard/policies/${policyId}`, label: "Review policy" };
}
