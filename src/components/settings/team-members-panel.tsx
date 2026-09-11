"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { notify } from "@/components/feedback/notify";

// ---------------------------------------------------------------------------
// Types
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

export type AvailableRole = { id: string; name: string };

export type PendingInvitation = {
  id: string;
  email: string;
  role: string;
  createdAt: number;
};

// ---------------------------------------------------------------------------
// Avatar
// ---------------------------------------------------------------------------

function Avatar({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  if (avatarUrl) {
    // User avatar URLs are supplied by the identity provider and may use arbitrary hosts.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={avatarUrl} alt={name} className="h-8 w-8 shrink-0 rounded-full object-cover" />;
  }
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--info-soft)] text-xs font-semibold text-[var(--primary)]">
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
}: {
  members: TeamMember[];
  availableRoles: AvailableRole[];
  pendingInvitations: PendingInvitation[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [changingRoleId, setChangingRoleId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmRemoveMember, setConfirmRemoveMember] = useState<TeamMember | null>(null);

  function flash(msg: string) {
    notify.success(msg);
  }

  function handleRoleChange(member: TeamMember, newRoleId: string) {
    if (newRoleId === member.roleId) return;
    setError(null); setChangingRoleId(member.membershipId);
    startTransition(async () => {
      try {
        const res = await fetch("/api/settings/team/role", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetMembershipId: member.membershipId, newRoleId }),
        });
        const data = (await res.json()) as { success: boolean; message?: string; newRole?: string };
        if (!data.success) notify.error(data.message ?? "Unable to change role.");
        else { flash(`${member.name}'s role updated to ${data.newRole ?? "new role"}.`); router.refresh(); }
      } catch { notify.error("Unable to connect. Please try again."); }
      finally { setChangingRoleId(null); }
    });
  }

  function handleRemove(member: TeamMember) {
    setError(null); setRemovingId(member.membershipId); setConfirmRemoveMember(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/settings/team/${member.membershipId}`, { method: "DELETE" });
        const data = (await res.json()) as { success: boolean; message?: string };
        if (!data.success) notify.error(data.message ?? "Unable to remove member.");
        else { flash(`${member.name} has been removed from the organisation.`); router.refresh(); }
      } catch { notify.error("Unable to connect. Please try again."); }
      finally { setRemovingId(null); }
    });
  }

  function handleRevokeInvite(inv: PendingInvitation) {
    setError(null); setRevokingId(inv.id);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/settings/team/invite/${inv.id}`, { method: "DELETE" });
        const data = (await res.json()) as { success: boolean; message?: string };
        if (!data.success) notify.error(data.message ?? "Unable to revoke invitation.");
        else { flash(`Invitation to ${inv.email} revoked.`); router.refresh(); }
      } catch { notify.error("Unable to connect. Please try again."); }
      finally { setRevokingId(null); }
    });
  }

  return (
    <div className="space-y-6">
      {/* Feedback */}
      {error && (
        <div className="flex items-start justify-between gap-3 rounded-2xl border border-[color-mix(in_srgb,var(--danger)_28%,transparent)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">
          <span>{error}</span>
          <button onClick={() => setError(null)} aria-label="Dismiss error"
            className="shrink-0 text-[var(--danger)] transition hover:text-[var(--danger)]">✕</button>
        </div>
      )}

      {/* Members table */}
      <Card>
        <div className="card-section-header">
          <h2 className="text-base font-semibold leading-snug text-[var(--foreground)]">
            Members
            <span className="ml-2 rounded-full bg-[var(--muted)] px-2 py-0.5 text-xs font-normal text-[var(--muted-foreground)]">
              {members.filter((m) => m.status === "active").length}
            </span>
          </h2>
        </div>

        <div className="table-scroll scrollbar-thin">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--muted)]/60">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Member</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Role</th>
                <th className="hidden px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] sm:table-cell">Status</th>
                <th className="hidden px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] md:table-cell">Joined</th>
                {canManage && <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {members.map((member) => {
                const isChangingThis = changingRoleId === member.membershipId;
                const isRemovingThis = removingId === member.membershipId;
                const isSelf = member.isCurrentUser;

                return (
                  <tr key={member.membershipId}
                    className={`group transition-colors hover:bg-[var(--muted)]/80 ${isRemovingThis ? "opacity-50" : ""}`}>
                    <td className="px-6 py-4">
                      <div className="icon-text-row">
                        <div data-icon-tile>
                          <Avatar name={member.name} avatarUrl={member.avatarUrl} />
                        </div>
                        <div className="icon-text-body">
                          <p className="truncate font-medium leading-snug text-[var(--foreground)]">
                            {member.name}
                            {isSelf && <span className="ml-2 text-xs text-[var(--muted-foreground)]">(you)</span>}
                          </p>
                          <p className="truncate text-xs text-[var(--muted-foreground)]">{member.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      {canManage && !isSelf ? (
                        <select value={member.roleId}
                          onChange={(e) => handleRoleChange(member, e.target.value)}
                          disabled={isChangingThis || isPending}
                          aria-label={`Change ${member.name}'s role`}
                          className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-2.5 py-1.5 text-xs text-[var(--foreground)] shadow-sm outline-none focus:border-[var(--ring)] focus:ring-2 focus:ring-[var(--ring)]/20 disabled:opacity-50 transition">
                          {availableRoles.map((r) => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                          ))}
                        </select>
                      ) : (
                        <Badge
                          variant={member.roleName === "Owner" ? "purple" : member.roleName === "Admin" ? "primary" : "neutral"}
                          size="sm">
                          {member.roleName}
                        </Badge>
                      )}
                    </td>

                    <td className="hidden px-6 py-4 sm:table-cell">
                      <Badge variant={member.status === "active" ? "success" : "neutral"} size="sm" className="capitalize">
                        {member.status}
                      </Badge>
                    </td>

                    <td className="hidden px-6 py-4 text-[var(--muted-foreground)] md:table-cell">
                      {member.joinedAt
                        ? new Date(member.joinedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                        : "—"}
                    </td>

                    {canManage && (
                      <td className="px-6 py-4 text-right">
                        {!isSelf && (
                          <button onClick={() => setConfirmRemoveMember(member)}
                            disabled={isRemovingThis || isPending}
                            aria-label={`Remove ${member.name}`}
                            className="rounded-xl border border-transparent px-2.5 py-1.5 text-xs font-medium text-[var(--muted-foreground)] transition hover:border-[color-mix(in_srgb,var(--danger)_28%,transparent)] hover:bg-[var(--danger-soft)] hover:text-[var(--danger)] disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--danger)]">
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
      </Card>

      {/* Pending invitations */}
      {pendingInvitations.length > 0 && (
        <Card>
          <div className="card-section-header">
            <h2 className="text-base font-semibold leading-snug text-[var(--foreground)]">
              Pending invitations
              <span className="ml-2 rounded-full bg-[var(--warning-soft)] px-2 py-0.5 text-xs font-normal text-[var(--warning)]">
                {pendingInvitations.length}
              </span>
            </h2>
          </div>
          <ul role="list" className="divide-y divide-[var(--border)]">
            {pendingInvitations.map((inv) => {
              const isRevokingThis = revokingId === inv.id;
              const roleLabel = inv.role === "org:admin" ? "Admin" : inv.role === "org:member" ? "Member" : inv.role;
              return (
                <li key={inv.id}
                  className={`flex flex-wrap items-center justify-between gap-3 px-6 py-3 ${isRevokingThis ? "opacity-50" : ""}`}>
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-[var(--border)] text-[var(--muted-foreground)]">
                      <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 16 16"
                        stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 3v10M3 8h10" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[var(--foreground)]">{inv.email}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        Invited as <span className="font-medium">{roleLabel}</span>
                        {" · "}
                        {new Date(inv.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="warning" size="sm">Pending</Badge>
                    {canManage && (
                      <button onClick={() => handleRevokeInvite(inv)}
                        disabled={isRevokingThis || isPending}
                        aria-label={`Revoke invitation to ${inv.email}`}
                        className="rounded-xl border border-transparent px-2.5 py-1.5 text-xs font-medium text-[var(--muted-foreground)] transition hover:border-[color-mix(in_srgb,var(--danger)_28%,transparent)] hover:bg-[var(--danger-soft)] hover:text-[var(--danger)] disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--danger)]">
                        {isRevokingThis ? "Revoking…" : "Revoke"}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {/* Confirm-remove modal */}
      {confirmRemoveMember && (
        <div role="dialog" aria-modal="true" aria-labelledby="confirm-remove-title"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-xl">
            <h3 id="confirm-remove-title" className="text-base font-semibold text-[var(--foreground)]">
              Remove member?
            </h3>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">
              <strong className="text-[var(--foreground)]">{confirmRemoveMember.name}</strong>{" "}
              ({confirmRemoveMember.email}) will lose access immediately. You can re-invite them later.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
              <button onClick={() => setConfirmRemoveMember(null)} disabled={isPending}
                className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm font-medium text-[var(--foreground)] shadow-sm transition hover:bg-[var(--muted)] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]">
                Cancel
              </button>
              <button onClick={() => handleRemove(confirmRemoveMember)} disabled={isPending}
                className="rounded-2xl bg-[var(--danger)] px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:opacity-90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--danger)]">
                {isPending ? "Removing…" : "Remove member"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
