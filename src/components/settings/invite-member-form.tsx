"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { dashboardFetch } from "@/components/feedback/use-async-action";

const ROLE_OPTIONS = [
  { value: "org:member", label: "Member" },
  { value: "org:admin", label: "Admin" },
] as const;

const inputCls = "w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm shadow-sm outline-none focus:border-[var(--ring)] focus:ring-2 focus:ring-[var(--ring)]/20 transition disabled:bg-[var(--muted)] disabled:opacity-60";

export function InviteMemberForm({ canInvite }: { canInvite: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"org:admin" | "org:member">("org:member");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function reset() { setEmail(""); setRole("org:member"); setError(null); setSuccess(null); }
  function handleOpen() { reset(); setOpen(true); }
  function handleClose() { setOpen(false); reset(); }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setSuccess(null);
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) { setError("Email address is required."); return; }
    startTransition(async () => {
      try {
        const result = await dashboardFetch(
          "/api/settings/team/invite",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: trimmed, role }),
          },
          {
            successMessage: "Invitation sent successfully",
            errorFallback: "Unable to send invitation. Please try again.",
            onValidation: setError,
          },
        );
        if (!result.ok) return;
        setEmail("");
        router.refresh();
        setOpen(false);
      } catch { setError("Network error. Please try again."); }
    });
  }

  if (!canInvite) return null;

  if (!open) {
    return (
      <button onClick={handleOpen}
        className="btn btn-primary">
        <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 16 16"
          stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 3v10M3 8h10" />
        </svg>
        Invite member
      </button>
    );
  }

  return (
    <div className="rounded-2xl bg-[var(--card)] card-shadow p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-[var(--foreground)]">Invite a new member</h3>
        <button type="button" onClick={handleClose} aria-label="Close invite form"
          className="rounded-xl p-1 text-[var(--muted-foreground)] transition hover:bg-[var(--secondary)] hover:text-[var(--muted-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]">
          <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 20 20"
            stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 5l10 10M15 5L5 15" />
          </svg>
        </button>
      </div>

      {success ? (
        <div className="flex items-center gap-2 rounded-2xl border border-[color-mix(in_srgb,var(--success)_28%,transparent)] bg-[var(--success-soft)] px-4 py-3 text-sm text-[var(--success)]">
          <svg className="h-4 w-4 shrink-0 text-[var(--success)]" fill="none" viewBox="0 0 16 16"
            stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l3.5 3.5L13 4.5" />
          </svg>
          {success}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email + role — stacked on mobile, side-by-side on sm+ */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 min-w-0">
              <label htmlFor="invite-email" className="mb-1.5 block text-sm font-semibold text-[var(--foreground)]">
                Email address
              </label>
              <input id="invite-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                required autoFocus placeholder="colleague@example.com" disabled={isPending}
                className={inputCls} />
            </div>

            <div className="sm:w-36 sm:shrink-0">
              <label htmlFor="invite-role" className="mb-1.5 block text-sm font-semibold text-[var(--foreground)]">
                Role
              </label>
              <select id="invite-role" value={role}
                onChange={(e) => setRole(e.target.value as "org:admin" | "org:member")}
                disabled={isPending} className={inputCls}>
                {ROLE_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-2xl border border-[color-mix(in_srgb,var(--danger)_28%,transparent)] bg-[var(--danger-soft)] px-3 py-2.5 text-sm text-[var(--danger)]">
              <svg className="mt-0.5 h-4 w-4 shrink-0 text-[var(--danger)]" fill="none" viewBox="0 0 16 16"
                stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <circle cx="8" cy="8" r="6" /><path strokeLinecap="round" d="M8 5v3M8 11h.01" />
              </svg>
              {error}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={isPending}
              className="btn btn-primary">
              {isPending ? "Sending…" : "Send invitation"}
            </button>
            <button type="button" onClick={handleClose} disabled={isPending}
              className="btn btn-outline">
              Cancel
            </button>
          </div>

          <p className="text-xs text-[var(--muted-foreground)]">
            The recipient will receive a Clerk organisation invitation email and must accept it to gain access.
          </p>
        </form>
      )}
    </div>
  );
}
