"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

// ---------------------------------------------------------------------------
// Types (serialisable — passed from server component as props)
// ---------------------------------------------------------------------------

export type TeamMember = {
  membershipId: string;
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  roleName: string;
  roleId: string;
  status: string;
  joinedAt: Date | null;
  isCurrentUser: boolean;
};

export type AvailableRole = {
  id: string;
  name: string;
};

export type PendingInvitation = {
  id: string;
  email: string;
  role: string;
  createdAt: number; // unix ms from Clerk
};

// ---------------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------------

function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    Owner: "bg-purple-50 text-purple-700 ring-1 ring-purple-600/20",
    Admin: "bg-blue-50 text-blue-700 ring-1 ring-blue-600/20",
    Member: "bg-neutral-100 text-neutral-600 ring-1 ring-neutral-500/20",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[role] ?? styles.Member}`}
    >
      {role}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "active") {
    return (
      <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 ring-1 ring-green-600/20">
        Active
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500">
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function Avatar({
  name,
  avatarUrl,
}: {
  name: string;
  avatarUrl: string | null;
}) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className="h-8 w-8 rounded-full object-cover"
      />
    );
  }
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-200 text-xs font-semibold text-neutral-600">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TeamMembersPanel
// ---------------------------------------------------------------------------

export function TeamMembersPanel({
  members,
  availableRoles,
  pendingInvitations,
  canManage,
  currentUserId,
}: {
  members: TeamMember[];
  availableRoles: AvailableRole[];
  pendingInvitations: PendingInvitation[];
  canManage: boolean;
  currentUserId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [changingRoleId, setChangingRoleId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Confirm-remove modal state
  const [confirmRemoveMember, setConfirmRemoveMember] =
    useState<TeamMember | null>(null);

  function flash(msg: string) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  }

  // ── Change role ────────────────────────────────────────────────────────────
  function handleRoleChange(member: TeamMember, newRoleId: string) {
    if (newRoleId === member.roleId) return;
    setError(null);
    setChangingRoleId(member.membershipId);

    startTransition(async () => {
      try {
        const res = await fetch("/api/settings/team/role", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            targetMembershipId: member.membershipId,
            newRoleId,
          }),
        });
        const data = (await res.json()) as {
          success: boolean;
          message?: string;
          newRole?: string;
        };
        if (!data.success) {
          setError(data.message ?? "Failed to change role.");
        } else {
          flash(`${member.name}'s role updated to ${data.newRole ?? "new role"}.`);
          router.refresh();
        }
      } catch {
        setError("Network error. Please try again.");
      } finally {
        setChangingRoleId(null);
      }
    });
  }

  // ── Remove member ──────────────────────────────────────────────────────────
  function handleRemove(member: TeamMember) {
    setError(null);
    setRemovingId(member.membershipId);
    setConfirmRemoveMember(null);

    startTransition(async () => {
      try {
        const res = await fetch(`/api/settings/team/${member.membershipId}`, {
          method: "DELETE",
        });
        const data = (await res.json()) as { success: boolean; message?: string };
        if (!data.success) {
          setError(data.message ?? "Failed to remove member.");
        } else {
          flash(`${member.name} has been removed from the organisation.`);
          router.refresh();
        }
      } catch {
        setError("Network error. Please try again.");
      } finally {
        setRemovingId(null);
      }
    });
  }

  // ── Revoke invitation ─────────────────────────────────────────────────────
  function handleRevokeInvite(inv: PendingInvitation) {
    setError(null);
    setRevokingId(inv.id);

    startTransition(async () => {
      try {
        const res = await fetch(`/api/settings/team/invite/${inv.id}`, {
          method: "DELETE",
        });
        const data = (await res.json()) as { success: boolean; message?: string };
        if (!data.success) {
          setError(data.message ?? "Failed to revoke invitation.");
        } else {
          flash(`Invitation to ${inv.email} revoked.`);
          router.refresh();
        }
      } catch {
        setError("Network error. Please try again.");
      } finally {
        setRevokingId(null);
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Feedback */}
      {error && (
        <div className="flex items-start justify-between rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-3 shrink-0 text-red-400 hover:text-red-600"
            aria-label="Dismiss error"
          >
            ✕
          </button>
        </div>
      )}
      {successMsg && (
        <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {successMsg}
        </div>
      )}

      {/* ── Active members table ─────────────────────────────────────────── */}
      <div className="rounded-lg border bg-white">
        <div className="border-b px-6 py-4">
          <h2 className="text-base font-semibold text-neutral-900">
            Members
            <span className="ml-2 rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-normal text-neutral-500">
              {members.filter((m) => m.status === "active").length}
            </span>
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y text-sm">
            <thead>
              <tr className="bg-neutral-50 text-xs font-medium uppercase tracking-wider text-neutral-500">
                <th className="px-6 py-3 text-left">Member</th>
                <th className="px-6 py-3 text-left">Role</th>
                <th className="px-6 py-3 text-left">Status</th>
                <th className="px-6 py-3 text-left">Joined</th>
                {canManage && (
                  <th className="px-6 py-3 text-right">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y">
              {members.map((member) => {
                const isChangingThis = changingRoleId === member.membershipId;
                const isRemovingThis = removingId === member.membershipId;
                const isSelf = member.isCurrentUser;

                return (
                  <tr
                    key={member.membershipId}
                    className={`transition hover:bg-neutral-50 ${isRemovingThis ? "opacity-50" : ""}`}
                  >
                    {/* Member info */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={member.name} avatarUrl={member.avatarUrl} />
                        <div className="min-w-0">
                          <p className="font-medium text-neutral-900 truncate">
                            {member.name}
                            {isSelf && (
                              <span className="ml-2 text-xs text-neutral-400">(you)</span>
                            )}
                          </p>
                          <p className="truncate text-xs text-neutral-400">
                            {member.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="px-6 py-4">
                      {canManage && !isSelf ? (
                        <select
                          value={member.roleId}
                          onChange={(e) => handleRoleChange(member, e.target.value)}
                          disabled={isChangingThis || isPending}
                          aria-label={`Change ${member.name}'s role`}
                          className="rounded-md border px-2 py-1 text-xs text-neutral-700 outline-none focus:ring-2 focus:ring-neutral-900/10 disabled:opacity-50"
                        >
                          {availableRoles.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <RoleBadge role={member.roleName} />
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      <StatusBadge status={member.status} />
                    </td>

                    {/* Joined */}
                    <td className="px-6 py-4 text-neutral-500">
                      {member.joinedAt
                        ? new Date(member.joinedAt).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </td>

                    {/* Actions */}
                    {canManage && (
                      <td className="px-6 py-4 text-right">
                        {!isSelf && (
                          <button
                            onClick={() => setConfirmRemoveMember(member)}
                            disabled={isRemovingThis || isPending}
                            aria-label={`Remove ${member.name}`}
                            className="rounded px-2.5 py-1 text-xs font-medium text-neutral-500 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                          >
                            {isRemovingThis ? "Removing…" : "Remove"}
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Pending invitations ───────────────────────────────────────────── */}
      {pendingInvitations.length > 0 && (
        <div className="rounded-lg border bg-white">
          <div className="border-b px-6 py-4">
            <h2 className="text-base font-semibold text-neutral-900">
              Pending invitations
              <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-normal text-amber-700">
                {pendingInvitations.length}
              </span>
            </h2>
          </div>
          <ul role="list" className="divide-y">
            {pendingInvitations.map((inv) => {
              const isRevokingThis = revokingId === inv.id;
              // Map Clerk role slug to friendly label
              const roleLabel =
                inv.role === "org:admin"
                  ? "Admin"
                  : inv.role === "org:member"
                    ? "Member"
                    : inv.role;

              return (
                <li
                  key={inv.id}
                  className={`flex items-center justify-between px-6 py-3 ${isRevokingThis ? "opacity-50" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-dashed border-neutral-300 text-neutral-400">
                      <svg
                        aria-hidden="true"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 16 16"
                        stroke="currentColor"
                        strokeWidth={1.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M8 3v10M3 8h10"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-700">
                        {inv.email}
                      </p>
                      <p className="text-xs text-neutral-400">
                        Invited as{" "}
                        <span className="font-medium">{roleLabel}</span>
                        {" · "}
                        {new Date(inv.createdAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-600/20">
                      Pending
                    </span>
                    {canManage && (
                      <button
                        onClick={() => handleRevokeInvite(inv)}
                        disabled={isRevokingThis || isPending}
                        aria-label={`Revoke invitation to ${inv.email}`}
                        className="rounded px-2.5 py-1 text-xs font-medium text-neutral-500 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                      >
                        {isRevokingThis ? "Revoking…" : "Revoke"}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* ── Confirm remove modal ──────────────────────────────────────────── */}
      {confirmRemoveMember && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-remove-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-sm rounded-xl border bg-white p-6 shadow-xl">
            <h3
              id="confirm-remove-title"
              className="text-base font-semibold text-neutral-900"
            >
              Remove member?
            </h3>
            <p className="mt-2 text-sm text-neutral-500">
              <strong className="text-neutral-700">
                {confirmRemoveMember.name}
              </strong>{" "}
              ({confirmRemoveMember.email}) will lose access to this
              organisation immediately. This action can be undone by inviting
              them again.
            </p>
            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                onClick={() => setConfirmRemoveMember(null)}
                disabled={isPending}
                className="rounded-md border px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRemove(confirmRemoveMember)}
                disabled={isPending}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {isPending ? "Removing…" : "Remove member"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
