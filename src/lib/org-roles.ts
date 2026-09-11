import { NextResponse } from "next/server";

export const OWNER_ROLE = "Owner";
export const ADMIN_ROLE = "Admin";
export const MEMBER_ROLE = "Member";

export const OPERATOR_ROLES = [OWNER_ROLE, ADMIN_ROLE] as const;

export type LocalOrgRole = typeof OWNER_ROLE | typeof ADMIN_ROLE | typeof MEMBER_ROLE;

export function isOperatorRole(roleName: string | null | undefined): boolean {
  return (OPERATOR_ROLES as readonly string[]).includes(roleName ?? "");
}

export function requireOperatorRole(
  roleName: string | null | undefined,
  message = "Only Owner or Admin can perform this action",
): NextResponse | null {
  if (isOperatorRole(roleName)) return null;
  return NextResponse.json({ success: false, message }, { status: 403 });
}

export function clerkRoleToLocalRole(
  clerkRole: string | null | undefined,
  options: { firstMembership: boolean },
): LocalOrgRole {
  if (options.firstMembership) return OWNER_ROLE;
  const role = String(clerkRole ?? "").trim().toLowerCase();
  if (role === "org:admin" || role === "admin") return ADMIN_ROLE;
  if (role === "org:owner" || role === "owner") return OWNER_ROLE;
  return MEMBER_ROLE;
}
