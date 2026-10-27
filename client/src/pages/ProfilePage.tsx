/**
 * src/pages/ProfilePage.tsx
 *
 * User Profile screen matching SIH 2026 Reference Specification (fi.pdf Page 1, 2, 5).
 * Displays user identity, role permissions, record scope, and preferences cards.
 */

import { Link } from "react-router-dom";
import { Key, Settings } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import AppShell from "../components/layout/AppShell";

export default function ProfilePage() {
  const { user } = useAuth();

  const roleLabels: Record<string, string> = {
    INSTITUTION_USER: "Institution User",
    SCRUTINY_OFFICER: "AICTE Officer",
    APPROVER: "Competent Authority",
    ADMIN: "System Administrator",
    AUDITOR: "Auditor",
    AICTE_OFFICER: "AICTE Officer",
    SYSTEM_ADMIN: "System Administrator",
  };

  const recordScopes: Record<string, string> = {
    INSTITUTION_USER: "You can view FDR records belonging to your institution only.",
    SCRUTINY_OFFICER: "You can view FDR records submitted by all institutions for scrutiny.",
    AICTE_OFFICER: "You can view FDR records submitted by all institutions for scrutiny.",
    APPROVER: "You can view FDR records submitted by all institutions for final approval.",
    ADMIN: "You can view FDR records across all institutions for oversight.",
    SYSTEM_ADMIN: "You can view FDR records across all institutions for oversight.",
    AUDITOR: "You can view audit logs and case histories across all institutions for compliance oversight.",
  };

  const initials = user?.fullName
    ? user.fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "US";

  const roleTitle = (user && roleLabels[user.role]) || user?.role || "User";
  const recordScope =
    (user && recordScopes[user.role]) ||
    "You can view FDR records based on your system permissions.";

  return (
    <AppShell>
      <div className="space-y-6 animate-fade-in" id="profile-page">
        {/* Breadcrumb & Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Link to="/dashboard" className="hover:text-slate-800 transition">
              Dashboard
            </Link>
            <span>&gt;</span>
            <span className="text-slate-700 font-medium">Profile</span>
          </div>

          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block pt-1">
            ACCOUNT
          </span>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Your profile
          </h1>
          <p className="text-xs text-slate-500">
            Details for the account you are signed in with.
          </p>
        </div>

        {/* ── 1. User Hero Identity Card ─────────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex items-center gap-5">
          <div className="w-14 h-14 rounded-full bg-slate-200 text-slate-800 font-bold text-lg flex items-center justify-center border border-slate-300 shrink-0 select-none">
            {initials}
          </div>

          <div className="space-y-1">
            <h2 className="text-base font-bold text-slate-900 leading-tight">
              {user?.fullName || "Authenticated Officer"}
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              {user?.email || "user@saksham.gov.in"}
            </p>
            <div className="pt-1">
              <span className="inline-block px-2.5 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                {roleTitle}
              </span>
            </div>
          </div>
        </div>

        {/* ── 2. Access & Permissions Card ───────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)] space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Access</h3>

          <div className="divide-y divide-slate-100 text-xs">
            <div className="py-3 grid grid-cols-1 sm:grid-cols-4 gap-2">
              <span className="text-slate-500 font-normal">Role</span>
              <span className="sm:col-span-3 text-slate-900 font-medium">
                {roleTitle}
              </span>
            </div>

            <div className="py-3 grid grid-cols-1 sm:grid-cols-4 gap-2">
              <span className="text-slate-500 font-normal">Record scope</span>
              <span className="sm:col-span-3 text-slate-900 font-medium leading-relaxed">
                {recordScope}
              </span>
            </div>

            <div className="py-3 grid grid-cols-1 sm:grid-cols-4 gap-2">
              <span className="text-slate-500 font-normal">Institution</span>
              <span className="sm:col-span-3 text-slate-900 font-medium">
                {user?.institution
                  ? `${user.institution.name} (${user.institution.aicteId})`
                  : user?.institutionId
                  ? `Institution (${user.institutionId})`
                  : "Not linked. This role works across institutions."}
              </span>
            </div>
          </div>
        </div>

        {/* ── 3. Security and Preferences Card ───────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)] space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Security and preferences
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              These features are not yet available.
            </p>
          </div>

          <div className="space-y-3 pt-1">
            <div className="p-3.5 rounded-lg border border-slate-200/80 bg-slate-50/50 flex items-start gap-3">
              <Key className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
              <div className="text-xs">
                <span className="font-semibold text-slate-800 block">
                  Change password
                </span>
                <span className="text-slate-500 text-[11px]">
                  Requires a password change endpoint.
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-lg border border-slate-200/80 bg-slate-50/50 flex items-start gap-3">
              <Settings className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
              <div className="text-xs">
                <span className="font-semibold text-slate-800 block">
                  Notification and display settings
                </span>
                <span className="text-slate-500 text-[11px]">
                  Requires a preferences endpoint.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
