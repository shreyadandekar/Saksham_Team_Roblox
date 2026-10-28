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
        <div className="pb-3 border-b border-[#CBD5E1] space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-[#64748B]">
            <Link to="/dashboard" className="hover:text-[#1D4ED8] transition font-medium">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-[#0F172A] font-semibold">Profile</span>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight">
            Stakeholder Profile &amp; Role Authorization
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B]">
            Official identity parameters, institutional jurisdiction, and statutory permission scope for your authenticated session.
          </p>
        </div>

        {/* ── 1. User Hero Identity Card ─────────────────────────────── */}
        <div className="bg-white border border-[#CBD5E1] rounded-lg p-6 shadow-[0_1px_2px_rgba(0,0,0,0.05)] flex items-center gap-5">
          <div className="w-14 h-14 rounded-lg bg-[#0B192C] text-amber-400 font-bold text-lg flex items-center justify-center border border-[#15284F] shrink-0 select-none shadow-xs">
            {initials}
          </div>

          <div className="space-y-1">
            <h2 className="text-base font-bold text-[#0F172A] leading-tight">
              {user?.fullName || "Authenticated Officer"}
            </h2>
            <p className="text-xs text-[#64748B] font-mono">
              {user?.email || "user@saksham.gov.in"}
            </p>
            <div className="pt-1">
              <span className="inline-block px-2.5 py-0.5 rounded text-xs font-semibold bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE]">
                {roleTitle}
              </span>
            </div>
          </div>
        </div>

        {/* ── 2. Access & Permissions Card ───────────────────────────── */}
        <div className="bg-white border border-[#CBD5E1] rounded-lg p-6 shadow-[0_1px_2px_rgba(0,0,0,0.05)] space-y-4">
          <h3 className="text-sm font-bold text-[#0F172A] uppercase tracking-wider">
            Jurisdiction &amp; Access Scope
          </h3>

          <div className="divide-y divide-[#E2E8F0] text-xs">
            <div className="py-3 grid grid-cols-1 sm:grid-cols-4 gap-2">
              <span className="text-[#64748B] font-medium">Designated Role</span>
              <span className="sm:col-span-3 text-[#0F172A] font-semibold">
                {roleTitle}
              </span>
            </div>

            <div className="py-3 grid grid-cols-1 sm:grid-cols-4 gap-2">
              <span className="text-[#64748B] font-medium">Record Scope</span>
              <span className="sm:col-span-3 text-[#334155] font-normal leading-relaxed">
                {recordScope}
              </span>
            </div>

            <div className="py-3 grid grid-cols-1 sm:grid-cols-4 gap-2">
              <span className="text-[#64748B] font-medium">Institution &amp; AICTE PID</span>
              <span className="sm:col-span-3 text-[#0F172A] font-semibold">
                {user?.institution
                  ? `${user.institution.name} (PID: ${user.institution.aicteId})`
                  : user?.institutionId
                  ? `Institution (${user.institutionId})`
                  : "Central Regulatory Cell • Cross-Institutional Authority"}
              </span>
            </div>
          </div>
        </div>

        {/* ── 3. Security and Preferences Card ───────────────────────── */}
        <div className="bg-white border border-[#CBD5E1] rounded-lg p-6 shadow-[0_1px_2px_rgba(0,0,0,0.05)] space-y-4">
          <div>
            <h3 className="text-sm font-bold text-[#0F172A] uppercase tracking-wider">
              Security &amp; Cryptographic Attestation
            </h3>
            <p className="text-xs text-[#64748B] mt-0.5">
              Multi-factor session binding and cryptographic hash guarantees.
            </p>
          </div>

          <div className="space-y-3 pt-1">
            <div className="p-3.5 rounded-md border border-[#CBD5E1] bg-[#F8FAFC] flex items-start gap-3">
              <Key className="w-4 h-4 text-[#64748B] mt-0.5 shrink-0" />
              <div className="text-xs">
                <span className="font-semibold text-[#0F172A] block">
                  Session Credential Security
                </span>
                <span className="text-[#64748B] text-[11px]">
                  HttpOnly SameSite authenticated session tokens protected against client-side script inspection.
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-md border border-[#CBD5E1] bg-[#F8FAFC] flex items-start gap-3">
              <Settings className="w-4 h-4 text-[#64748B] mt-0.5 shrink-0" />
              <div className="text-xs">
                <span className="font-semibold text-[#0F172A] block">
                  Digital Signature &amp; DSC Attestation
                </span>
                <span className="text-[#64748B] text-[11px]">
                  Digital Signature Certificate (DSC) e-Sign tokens for approving officers and issuing authorities.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
