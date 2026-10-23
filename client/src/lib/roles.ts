import type { Role } from "../types/auth";

export const ROLE_LABELS: Record<Role, string> = {
  INSTITUTION_USER: "Institution User",
  AICTE_OFFICER: "AICTE Officer",
  SYSTEM_ADMIN: "System Administrator",
};

export const ROLE_SCOPE: Record<Role, string> = {
  INSTITUTION_USER: "You can view FDR records belonging to your institution only.",
  AICTE_OFFICER: "You can view FDR records submitted by all institutions for scrutiny.",
  SYSTEM_ADMIN: "You can view FDR records across all institutions for oversight.",
};

export function isSystemWide(role: Role | undefined): boolean {
  return role === "AICTE_OFFICER" || role === "SYSTEM_ADMIN";
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}
