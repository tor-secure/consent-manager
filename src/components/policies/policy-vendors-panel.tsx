import Link from "next/link";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PolicyVendor = {
  id: string;
  name: string;
  key: string;
  domain: string | null;
  country: string | null;
  privacyPolicyUrl: string | null;
  source: string;
  status: string;
  // The purpose names this vendor serves within the policy
  purposeNames: string[];
};

// ---------------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------------

function SourceBadge({ source }: { source: string }) {
  const styles: Record<string, string> = {
    custom: "bg-neutral-100 text-neutral-600",
    iab: "bg-purple-50 text-purple-700",
    google: "bg-blue-50 text-blue-700",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[source] ?? styles.custom}`}
    >
      {source.toUpperCase()}
    </span>
  );
}

// ---------------------------------------------------------------------------
// PolicyVendorsPanel — pure display, server-safe (no "use client" needed)
// Vendors are derived from the intersection of this policy version's attached
// purposes and the vendor_purposes links.
// ---------------------------------------------------------------------------

export function PolicyVendorsPanel({
  vendors,
  policyId,
  latestVersionId,
}: {
  vendors: PolicyVendor[];
  policyId: string;
  latestVersionId: string | null;
}) {
  void policyId; // reserved for future per-policy vendor overrides

  return (
    <div className="rounded-lg border bg-white p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-neutral-900">Vendors</h2>
          <p className="mt-0.5 text-sm text-neutral-500">
            Third-party vendors that operate under this policy&apos;s purposes.
          </p>
        </div>

        <Link
          href="/dashboard/vendors"
          className="shrink-0 text-sm font-medium text-neutral-700 underline underline-offset-2 hover:text-neutral-900"
        >
          Manage vendors
        </Link>
      </div>

      {!latestVersionId && (
        <div className="rounded-md border border-dashed px-4 py-6 text-center">
          <p className="text-sm text-neutral-400">
            No policy version found.
          </p>
        </div>
      )}

      {latestVersionId && vendors.length === 0 && (
        <div className="rounded-md border border-dashed px-4 py-6 text-center">
          <p className="text-sm text-neutral-400">
            No vendors are linked to the purposes attached to this policy.
          </p>
          <p className="mt-1 text-xs text-neutral-400">
            Link vendors to purposes from the{" "}
            <Link
              href="/dashboard/vendors"
              className="underline underline-offset-2 hover:text-neutral-700"
            >
              Vendors page
            </Link>
            .
          </p>
        </div>
      )}

      {latestVersionId && vendors.length > 0 && (
        <ul role="list" className="space-y-2">
          {vendors.map((v) => (
            <li
              key={v.id}
              className="rounded-md border px-4 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-neutral-900">{v.name}</span>
                    <SourceBadge source={v.source} />
                    {v.status === "inactive" && (
                      <span className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500">
                        Inactive
                      </span>
                    )}
                  </div>

                  {v.domain && (
                    <p className="mt-0.5 text-xs text-neutral-400">{v.domain}</p>
                  )}

                  {v.purposeNames.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {v.purposeNames.map((p) => (
                        <span
                          key={p}
                          className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500"
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {v.privacyPolicyUrl && (
                  <a
                    href={v.privacyPolicyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-xs text-neutral-500 underline underline-offset-2 hover:text-neutral-900"
                  >
                    Privacy policy
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
