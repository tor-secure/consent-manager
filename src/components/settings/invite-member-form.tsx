"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

// ---------------------------------------------------------------------------
// InviteMemberForm
//
// Sends a Clerk Organization invitation via POST /api/settings/team/invite.
// Role options map to Clerk org-role slugs (org:admin, org:member).
// Collapses to a "Invite member" button when closed.
// ---------------------------------------------------------------------------

const ROLE_OPTIONS = [
  { value: "org:member", label: "Member" },
  { value: "org:admin", label: "Admin" },
] as const;

export function InviteMemberForm({ canInvite }: { canInvite: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"org:admin" | "org:member">("org:member");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function reset() {
    setEmail("");
    setRole("org:member");
    setError(null);
    setSuccess(null);
  }

  function handleOpen() {
    reset();
    setOpen(true);
  }

  function handleClose() {
    setOpen(false);
    reset();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setError("Email address is required.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/settings/team/invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: trimmed, role }),
        });
        const data = (await res.json()) as {
          success: boolean;
          message?: string;
        };

        if (!data.success) {
          setError(data.message ?? "Failed to send invitation.");
        } else {
          setSuccess(`Invitation sent to ${trimmed}.`);
          setEmail("");
          router.refresh();
          // Auto-close after a short delay so the user sees the success message.
          setTimeout(() => setOpen(false), 2500);
        }
      } catch {
        setError("Network error. Please try again.");
      }
    });
  }

  if (!canInvite) return null;

  if (!open) {
    return (
      <button
        onClick={handleOpen}
        className="inline-flex items-center gap-2 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700"
      >
        <svg
          aria-hidden="true"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 16 16"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 3v10M3 8h10"
          />
        </svg>
        Invite member
      </button>
    );
  }

  return (
    <div className="rounded-lg border bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-neutral-900">
          Invite a new member
        </h3>
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close invite form"
          className="text-neutral-400 hover:text-neutral-600"
        >
          <svg
            aria-hidden="true"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 20 20"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 5l10 10M15 5L5 15"
            />
          </svg>
        </button>
      </div>

      {success ? (
        <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-3">
            {/* Email */}
            <div className="flex-1">
              <label
                htmlFor="invite-email"
                className="mb-1.5 block text-sm font-medium text-neutral-700"
              >
                Email address
              </label>
              <input
                id="invite-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                placeholder="colleague@example.com"
                disabled={isPending}
                className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900/10 disabled:opacity-60"
              />
            </div>

            {/* Role */}
            <div className="w-36 shrink-0">
              <label
                htmlFor="invite-role"
                className="mb-1.5 block text-sm font-medium text-neutral-700"
              >
                Role
              </label>
              <select
                id="invite-role"
                value={role}
                onChange={(e) =>
                  setRole(e.target.value as "org:admin" | "org:member")
                }
                disabled={isPending}
                className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900/10 disabled:opacity-60"
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:opacity-50"
            >
              {isPending ? "Sending…" : "Send invitation"}
            </button>
            <button
              type="button"
              onClick={handleClose}
              disabled={isPending}
              className="rounded-md border px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>

          <p className="text-xs text-neutral-400">
            The recipient will receive a Clerk organisation invitation email.
            They must accept it to gain access.
          </p>
        </form>
      )}
    </div>
  );
}
