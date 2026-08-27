"use client";

import { useState } from "react";
import type { BannerConfiguration } from "@/lib/banner-config";

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
  bannerConfig: BannerConfiguration;
  purposes: PCPurpose[];
  vendors: PCVendor[];
  // If a consentId is supplied the component is in "update" mode.
  consentId?: string;
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
      type="button"
      role="switch"
      aria-checked={checked}
      aria-disabled={disabled}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={[
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1",
        checked ? "bg-neutral-900" : "bg-neutral-200",
        disabled ? "cursor-not-allowed opacity-60" : "",
        "focus:ring-neutral-900",
      ].join(" ")}
    >
      <span
        className={[
          "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
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
  policyVersionId,
  bannerConfig,
  purposes,
  vendors,
  consentId: initialConsentId,
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
  const [savedConsentId, setSavedConsentId] = useState<string | undefined>(
    initialConsentId,
  );

  async function submitConsent(choice: "accept-all" | "reject-all" | "granular") {
    setSaving(true);
    setError("");

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

    try {
      const res = await fetch("/api/consent/record", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          websiteId,
          consentId: savedConsentId,
          submission: {
            choice,
            purposeDecisions: purposes.map((p) => ({
              purposeId: p.id,
              granted: updatedPurposeGrants[p.id] ?? false,
            })),
            vendorDecisions: vendors.map((v) => ({
              vendorId: v.id,
              granted: updatedVendorGrants[v.id] ?? false,
            })),
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Failed to save consent");

      setSavedConsentId(data.consentId);
      onSaved?.(data.consentId, data.status);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
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
        body: JSON.stringify({ consentId: savedConsentId, websiteId }),
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
                  ? "border-b-2 border-neutral-900 text-neutral-900"
                  : "text-neutral-500 hover:text-neutral-700",
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
                    <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500">
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
        <div className="mx-6 mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
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
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-neutral-50 disabled:opacity-50"
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

        {/* Withdraw — only in update mode */}
        {savedConsentId && (
          <button
            type="button"
            disabled={withdrawing}
            onClick={withdrawConsent}
            className="ml-auto text-xs text-red-500 underline underline-offset-2 hover:text-red-700 disabled:opacity-40"
          >
            {withdrawing ? "Withdrawing…" : "Withdraw consent"}
          </button>
        )}
      </div>

      {cfg.showPoweredBy && (
        <p className="px-6 pb-3 text-right text-xs opacity-30">
          {cfg.poweredByText || "Powered by CMP"}
        </p>
      )}
    </div>
  );
}
