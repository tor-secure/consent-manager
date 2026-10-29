import Link from "next/link";

import { requireTenantWebsite } from "@/lib/tenant-website";
import { Badge } from "@/components/ui/badge";
import { SecretValue, WebsiteIconControl } from "@/components/websites/website-identity-controls";
import {
  WebsiteSettingsForm,
  type WebsiteSettingsData,
} from "@/components/websites/website-settings-form";
import { DeleteWebsiteButton } from "@/components/websites/delete-website-button";
import { DomainVerifyPanel } from "@/components/websites/domain-verify-panel";
import { siteVerificationToken } from "@/lib/website-domain-verify";

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-[var(--border)] py-4 first:border-t-0 first:pt-0">
      <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">{label}</dt>
      <dd className="mt-1.5 break-all text-sm leading-5 text-[var(--foreground)]">{children}</dd>
    </div>
  );
}

export default async function WebsiteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const website = await requireTenantWebsite(id);

  const statusVariant: Record<string, "success" | "danger" | "neutral"> = {
    active: "success",
    inactive: "neutral",
    suspended: "danger",
  };

  const verificationToken = siteVerificationToken(website.id, website.siteKey);

  const settings: WebsiteSettingsData = {
    id: website.id,
    name: website.name,
    description: website.description,
    domain: website.domain,
    environment: website.environment,
    defaultLanguage: website.defaultLanguage,
    defaultRegion: website.defaultRegion,
    siteKey: website.siteKey,
  };

  return (
    <div className="page-wrap space-y-6 sm:space-y-8">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
        <Link href="/dashboard/websites" className="transition hover:text-[var(--foreground)]">
          Websites
        </Link>
        <span aria-hidden="true" className="text-[var(--border)]">/</span>
        <span className="truncate text-[var(--foreground)]">{website.name}</span>
      </nav>

      <div className="flex min-w-0 flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="page-title truncate">{website.name}</h1>
            <Badge variant={statusVariant[website.status] ?? "neutral"} size="sm" className="capitalize">
              {website.status}
            </Badge>
            {website.verified ? (
              <Badge variant="success" size="sm">Verified</Badge>
            ) : (
              <Badge variant="neutral" size="sm">Not verified</Badge>
            )}
          </div>
          <p className="mt-0.5 truncate text-sm text-[var(--muted-foreground)]">{website.domain}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {website.verified ? null : (
            <Link href="#domain-verify" className="btn btn-primary btn-sm">
              Verify
            </Link>
          )}
          <WebsiteIconControl websiteId={website.id} domain={website.domain} iconUrl={website.iconUrl} />
        </div>
      </div>

      {website.verified ? null : (
        <section id="domain-verify" className="scroll-mt-24 rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6">
          <h2 className="text-base font-semibold text-[var(--foreground)]">Verify this website</h2>
          <div className="mt-4">
            <DomainVerifyPanel
              websiteId={website.id}
              domain={website.domain}
              token={verificationToken}
              verified={false}
              verifiedAt={null}
            />
          </div>
        </section>
      )}

      <div className="grid items-start gap-10 lg:grid-cols-[minmax(16rem,22rem)_minmax(0,1fr)] lg:gap-0">
        <section className="min-w-0 lg:pr-12">
          <h2 className="text-base font-semibold text-[var(--foreground)]">Website details</h2>
          <p className="mt-1 text-sm leading-5 text-[var(--muted-foreground)]">
            Identity for this site. Language, region, and environment are edited on the right.
          </p>
          <dl className="mt-6">
            <Fact label="Domain">
              <span className="font-mono text-xs">{website.domain}</span>
            </Fact>
            <Fact label="Verification">
              {website.verified ? (
                <Badge variant="success" size="sm">Verified</Badge>
              ) : (
                <span className="inline-flex flex-wrap items-center gap-2">
                  <Badge variant="neutral" size="sm">Not verified</Badge>
                  <Link href="#domain-verify" className="text-sm font-semibold text-[var(--primary)]">
                    Verify domain
                  </Link>
                </span>
              )}
            </Fact>
            <Fact label="Site key">
              <SecretValue value={website.siteKey} />
            </Fact>
            <Fact label="Added">
              {website.createdAt.toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </Fact>
          </dl>
        </section>

        <section className="min-w-0 space-y-6 lg:border-l lg:border-[var(--border)] lg:pl-12">
          <div>
            <h2 className="text-base font-semibold text-[var(--foreground)]">Settings</h2>
            <p className="mt-1 text-sm leading-5 text-[var(--muted-foreground)]">
              Update how this website is identified in the CMP.
            </p>
          </div>
          <WebsiteSettingsForm website={settings} layout="plain" />
          <DeleteWebsiteButton
            websiteId={website.id}
            name={website.name}
            domain={website.domain}
            layout="plain"
          />
        </section>
      </div>
    </div>
  );
}
