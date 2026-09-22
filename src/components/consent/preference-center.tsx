"use client";

import { useRef, useState } from "react";
import type { BannerConfiguration } from "@/lib/banner-config";
import type { SignedPolicyContext } from "@/lib/policy-context";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PCPurpose = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  isRequired: boolean;
};

export type PCVendor = {
  id: string;
  name: string;
  domain: string | null;
  privacyPolicyUrl: string | null;
};

export type PCProps = {
  websiteId: string;
  policyVersionId: string;
  policyContext: SignedPolicyContext;
  bannerConfig: BannerConfiguration;
  purposes: PCPurpose[];
  vendors: PCVendor[];
  // If a consentId is supplied the component is in "update" mode.
  consentId?: string;
  initialStateVersion?: number;
  // Initial per-purpose granted state (for update mode).
  initialPurposeGrants?: Record<string, boolean>;
  initialVendorGrants?: Record<string, boolean>;
  onSaved?: (consentId: string, status: string) => void;
  onWithdrawn?: () => void;
};

// ---------------------------------------------------------------------------
// ConsentToggle — accessible switch
// ---------------------------------------------------------------------------

function ConsentToggle({
  id,
  checked,
  disabled,
  onChange,
}: {
  id: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-disabled={disabled}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={[
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1",
        checked ? "bg-[var(--foreground)]" : "bg-[var(--secondary)]",
        disabled ? "cursor-not-allowed opacity-60" : "",
        "focus:ring-[var(--ring)]",
      ].join(" ")}
    >
      <span
        className={[
          "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-[var(--card)] shadow transition-transform",
          checked ? "translate-x-4" : "translate-x-0",
        ].join(" ")}
      />
    </button>
  );
}

// ---------------------------------------------------------------------------
// PreferenceCenter — full preference center UI
// ---------------------------------------------------------------------------

export function PreferenceCenter({
  websiteId,
  policyContext,
  bannerConfig,
  purposes,
  vendors,
  consentId: initialConsentId,
  initialStateVersion = 0,
  initialPurposeGrants = {},
  initialVendorGrants = {},
  onSaved,
  onWithdrawn,
}: PCProps) {
  const cfg = bannerConfig;

  // Tab state for the preference center
  const [activeTab, setActiveTab] = useState<"purposes" | "vendors">("purposes");

  // Per-purpose grant state — required purposes always true.
  const [purposeGrants, setPurposeGrants] = useState<Record<string, boolean>>(
    () =>
      Object.fromEntries(
        purposes.map((p) => [
          p.id,
          p.isRequired ? true : (initialPurposeGrants[p.id] ?? false),
        ]),
      ),
  );

  // Per-vendor grant state.
  const [vendorGrants, setVendorGrants] = useState<Record<string, boolean>>(
    () =>
      Object.fromEntries(
        vendors.map((v) => [v.id, initialVendorGrants[v.id] ?? false]),
      ),
  );

  const [saving, setSaving] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const retrySubmission = useRef<{ signature: string; id: string } | null>(null);
  const [savedConsentId, setSavedConsentId] = useState<string | undefined>(
    initialConsentId,
  );
  const [savedStateVersion, setSavedStateVersion] = useState(initialStateVersion);

  async function submitConsent(choice: "accept-all" | "reject-all" | "granular") {
    if (saving) return;
    setSaving(true);
    setError("");
    setConfirmation("");

    // Build the local grants to send depending on the choice.
    let updatedPurposeGrants = { ...purposeGrants };
    let updatedVendorGrants = { ...vendorGrants };

    if (choice === "accept-all") {
      updatedPurposeGrants = Object.fromEntries(purposes.map((p) => [p.id, true]));
      updatedVendorGrants = Object.fromEntries(vendors.map((v) => [v.id, true]));
      setPurposeGrants(updatedPurposeGrants);
      setVendorGrants(updatedVendorGrants);
    } else if (choice === "reject-all") {
      updatedPurposeGrants = Object.fromEntries(
        purposes.map((p) => [p.id, p.isRequired]),
      );
      updatedVendorGrants = Object.fromEntries(vendors.map((v) => [v.id, false]));
      setPurposeGrants(updatedPurposeGrants);
      setVendorGrants(updatedVendorGrants);
    }

    const submission = {
      choice,
      purposeDecisions: purposes.map((p) => ({
        purposeId: p.id,
        granted: updatedPurposeGrants[p.id] ?? false,
      })),
      vendorDecisions: vendors.map((v) => ({
        vendorId: v.id,
        granted: updatedVendorGrants[v.id] ?? false,
      })),
    };
    const signature = JSON.stringify(submission);
    const submissionId =
      retrySubmission.current?.signature === signature
        ? retrySubmission.current.id
        : crypto.randomUUID();
    retrySubmission.current = { signature, id: submissionId };
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10_000);

    try {
      const res = await fetch("/api/consent/record", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          websiteId,
          consentId: savedConsentId,
          expectedStateVersion: savedConsentId ? savedStateVersion : 0,
          submissionId,
          policyContext,
          submission,
        }),
      });

      const data = await res.json();
      if (
        !res.ok ||
        data.success !== true ||
        data.confirmed !== true ||
        !Array.isArray(data.decisions) ||
        !Number.isInteger(data.stateVersion) ||
        data.stateVersion < 1 ||
        !data.evidenceSnapshotId ||
        data.confirmation?.policyContextValidated !== true ||
        data.confirmation?.persisted !== true ||
        data.confirmation?.evidenceSnapshotCreated !== true
      ) {
        throw new Error("Consent confirmation failed");
      }

      retrySubmission.current = null;
      setSavedConsentId(data.consentId);
      setSavedStateVersion(data.stateVersion);
      setConfirmation("Your consent preferences were confirmed and saved.");
      onSaved?.(data.consentId, data.status);
    } catch {
      setError("We couldn’t confirm your preferences. Nothing was enabled. Please retry.");
    } finally {
      window.clearTimeout(timeout);
      setSaving(false);
    }
  }

  async function withdrawConsent() {
    if (!savedConsentId) return;
    setWithdrawing(true);
    setError("");
    try {
      const res = await fetch("/api/consent/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consentId: savedConsentId,
          websiteId,
          expectedStateVersion: savedStateVersion,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Failed to withdraw consent");
      onWithdrawn?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setWithdrawing(false);
    }
  }

  return (
    <div
      className="overflow-hidden rounded-xl border shadow-sm"
      style={{
        backgroundColor: cfg.backgroundColor,
        color: cfg.textColor,
        borderRadius: cfg.borderRadius,
        maxWidth: "640px",
        fontFamily: "inherit",
      }}
    >
      {/* Header */}
      <div className="border-b px-6 py-5">
        <h2 className="text-lg font-semibold" style={{ color: cfg.textColor }}>
          {cfg.title || "Privacy Preferences"}
        </h2>
        <p className="mt-1 text-sm opacity-70">
          {cfg.description}
        </p>
        {cfg.privacyPolicyUrl && (
          <a
            href={cfg.privacyPolicyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-block text-xs underline underline-offset-2 opacity-60 hover:opacity-100"
          >
            {cfg.privacyPolicyText || "Privacy Policy"}
          </a>
        )}
      </div>

      {/* Tabs (only if vendor list is enabled and we have vendors) */}
      {cfg.showVendorList && vendors.length > 0 && (
        <div className="flex border-b">
          {(["purposes", "vendors"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={[
                "flex-1 py-2.5 text-sm font-medium transition",
                activeTab === tab
                  ? "border-b-2 border-[var(--foreground)] text-[var(--foreground)]"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
              ].join(" ")}
              style={
                activeTab === tab
                  ? { borderBottomColor: cfg.primaryColor, color: cfg.primaryColor }
                  : {}
              }
            >
              {tab === "purposes" ? "Purposes" : "Vendors"}
            </button>
          ))}
        </div>
      )}

      {/* Purposes tab */}
      {activeTab === "purposes" && (
        <div className="divide-y px-6">
          {purposes.length === 0 && (
            <p className="py-6 text-center text-sm opacity-50">
              No purposes configured.
            </p>
          )}
          {purposes.map((purpose) => (
            <div key={purpose.id} className="flex items-start justify-between gap-4 py-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{purpose.name}</p>
                  {purpose.isRequired && (
                    <span className="rounded-full bg-[var(--muted)] px-2 py-0.5 text-xs text-[var(--muted-foreground)]">
                      Required
                    </span>
                  )}
                </div>
                {cfg.showPurposeDescriptions && purpose.description && (
                  <p className="mt-0.5 text-xs opacity-60">{purpose.description}</p>
                )}
              </div>
              <ConsentToggle
                id={`purpose-${purpose.id}`}
                checked={purposeGrants[purpose.id] ?? false}
                disabled={purpose.isRequired}
                onChange={(v) =>
                  setPurposeGrants((prev) => ({ ...prev, [purpose.id]: v }))
                }
              />
            </div>
          ))}
        </div>
      )}

      {/* Vendors tab */}
      {activeTab === "vendors" && cfg.showVendorList && (
        <div className="divide-y px-6">
          {vendors.length === 0 && (
            <p className="py-6 text-center text-sm opacity-50">
              No vendors configured.
            </p>
          )}
          {vendors.map((vendor) => (
            <div key={vendor.id} className="flex items-start justify-between gap-4 py-4">
              <div className="flex-1">
                <p className="text-sm font-medium">{vendor.name}</p>
                {vendor.domain && (
                  <p className="mt-0.5 text-xs opacity-50">{vendor.domain}</p>
                )}
                {vendor.privacyPolicyUrl && (
                  <a
                    href={vendor.privacyPolicyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-0.5 inline-block text-xs underline opacity-50 hover:opacity-80"
                  >
                    Privacy policy
                  </a>
                )}
              </div>
              <ConsentToggle
                id={`vendor-${vendor.id}`}
                checked={vendorGrants[vendor.id] ?? false}
                onChange={(v) =>
                  setVendorGrants((prev) => ({ ...prev, [vendor.id]: v }))
                }
              />
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mx-6 mb-3 rounded-md border border-[color-mix(in_srgb,var(--danger)_28%,transparent)] bg-[var(--danger-soft)] px-3 py-2 text-xs text-[var(--danger)]">
          {error}
        </div>
      )}
      {confirmation && (
        <div className="mx-6 mb-3 rounded-md border border-[color-mix(in_srgb,var(--success)_28%,transparent)] bg-[var(--success-soft)] px-3 py-2 text-xs text-[var(--success)]">
          {confirmation}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap items-center gap-2 border-t px-6 py-4">
        {cfg.showAcceptAll && (
          <button
            type="button"
            disabled={saving}
            onClick={() => submitConsent("accept-all")}
            style={{
              backgroundColor: cfg.primaryColor,
              borderRadius: cfg.borderRadius,
            }}
            className="px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Saving…" : cfg.acceptAllLabel || "Accept all"}
          </button>
        )}

        {cfg.showCustomize && (
          <button
            type="button"
            disabled={saving}
            onClick={() => submitConsent("granular")}
            style={{ borderRadius: cfg.borderRadius }}
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-[var(--muted)] disabled:opacity-50"
          >
            {cfg.savePreferencesLabel || "Save preferences"}
          </button>
        )}

        {cfg.showRejectAll && (
          <button
            type="button"
            disabled={saving}
            onClick={() => submitConsent("reject-all")}
            style={{ borderRadius: cfg.borderRadius }}
            className="px-4 py-2 text-sm font-medium opacity-60 hover:opacity-100 disabled:opacity-30"
          >
            {cfg.rejectAllLabel || "Reject all"}
          </button>
        )}

        <a
          href="/privacy-center/data-principal-request"
          className="text-sm font-semibold text-[var(--foreground)] hover:underline"
        >
          Data Principal Rights
        </a>
        <a
          href="/privacy-center/grievance"
          className="text-sm font-semibold text-[var(--foreground)] hover:underline"
        >
          File a grievance
        </a>

        {/* Withdraw — only in update mode */}
        {savedConsentId && (
          <button
            type="button"
            disabled={withdrawing}
            onClick={withdrawConsent}
            className="ml-auto text-xs text-[var(--danger)] underline underline-offset-2 hover:text-[var(--danger)] disabled:opacity-40"
          >
            {withdrawing ? "Withdrawing…" : "Withdraw consent"}
          </button>
        )}
      </div>

      {cfg.showPoweredBy && (
        <p className="px-6 pb-3 text-right text-xs opacity-30">
          {cfg.poweredByText || "Powered by Consent Guru"}
        </p>
      )}
    </div>
  );
}
