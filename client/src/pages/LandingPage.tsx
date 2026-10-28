/**
 * src/pages/LandingPage.tsx
 *
 * SAKSHAM — Security Deposit & FDR Management Portal
 * SIH 2026 Problem Statement PS26265
 *
 * Full-width public institutional landing page inspired by the government-style reference
 * design (landing_page.html), widened edge-to-edge to cover the entire viewport.
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  ShieldCheck,
  Search,
  FileText,
  Building2,
  CheckCircle2,
  ArrowRight,
  LogIn,
  LayoutDashboard,
  Clock,
  Lock,
  FileCheck,
  Scale,
  Landmark,
  BadgeAlert,
  ChevronRight,
  Phone,
  Mail,
} from "lucide-react";

export default function LandingPage() {
  const { user } = useAuth();

  // Font sizing state for accessibility
  const [fontSizeOffset, setFontSizeOffset] = useState<number>(0);
  const [language, setLanguage] = useState<"en" | "hi">("en");

  // Public sample verification state
  const [searchQuery, setSearchQuery] = useState("FDR/2026/DEL/7821-A");
  const [searched, setSearched] = useState(true);
  const [searchResult, setSearchResult] = useState<{
    fdrNumber: string;
    status: string;
    amount: string;
    bank: string;
    lien: string;
    maturity: string;
    institution: string;
  } | null>({
    fdrNumber: "FDR/2026/DEL/7821-A",
    status: "ACTIVE LIEN PLEDGED",
    amount: "₹35,00,000.00",
    bank: "State Bank of India (SBIN0000691)",
    lien: "Member Secretary, AICTE",
    maturity: "14-DEC-2029",
    institution: "Delhi Institute of Advanced Engineering (PID: 1-4928172)",
  });

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearched(true);
    setSearchResult({
      fdrNumber: searchQuery.trim().toUpperCase(),
      status: "ACTIVE LIEN PLEDGED",
      amount: "₹35,00,000.00",
      bank: "State Bank of India (SBIN0000691)",
      lien: "Member Secretary, AICTE",
      maturity: "14-DEC-2029",
      institution: "Delhi Institute of Advanced Engineering (PID: 1-4928172)",
    });
  }

  const changeFontSize = (delta: number) => {
    setFontSizeOffset((prev) => Math.min(Math.max(prev + delta, -2), 3));
  };

  return (
    <div
      className="min-h-screen w-full bg-[#f4f6f8] text-slate-900 font-sans antialiased text-sm flex flex-col"
      style={{ fontSize: `${14 + fontSizeOffset}px` }}
    >
      {/* ── 1. GIGW ACCESSIBILITY TOP STRIP & HEADER ───────────────── */}
      <header className="w-full bg-white border-b border-slate-300">
        {/* Tricolor decorative ribbon */}
        <div className="h-1 w-full flex">
          <div className="h-full flex-1 bg-[#FF9933]" />
          <div className="h-full flex-1 bg-white" />
          <div className="h-full flex-1 bg-[#138808]" />
        </div>

        {/* Accessibility & Official Authority Toolbar */}
        <div className="bg-[#f0f2f5] border-b border-slate-200 px-4 sm:px-8 lg:px-12 py-1 text-xs text-slate-700 w-full">
          <div className="w-full flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[11px] sm:text-xs">
              <span className="font-bold text-slate-900">
                {language === "hi" ? "सक्षम पोर्टल" : "SAKSHAM PORTAL"}
              </span>
              <span className="text-slate-400">|</span>
              <span className="font-medium text-slate-800">
                Smart India Hackathon 2026 • PS26265
              </span>
              <span className="text-slate-400 hidden md:inline">|</span>
              <span className="text-slate-600 hidden md:inline">
                Security Deposit &amp; FDR Lifecycle Management System
              </span>
            </div>

            <div className="flex items-center gap-3 text-[11px]">
              <a
                className="hover:underline text-slate-700 font-medium"
                href="#main-content"
              >
                {language === "hi" ? "मुख्य सामग्री पर जाएं" : "Skip to Main Content"}
              </a>
              <span className="text-slate-300">|</span>

              {/* Font Resizing Controls */}
              <div className="flex items-center gap-1 bg-white px-1.5 py-0.5 rounded border border-slate-300 text-[10px] font-bold">
                <button
                  onClick={() => changeFontSize(-1)}
                  className="px-1 hover:text-blue-900 focus:outline-none"
                  title="Decrease font size"
                >
                  A-
                </button>
                <button
                  onClick={() => setFontSizeOffset(0)}
                  className="px-1 hover:text-blue-900 focus:outline-none"
                  title="Standard font size"
                >
                  A
                </button>
                <button
                  onClick={() => changeFontSize(1)}
                  className="px-1 hover:text-blue-900 focus:outline-none"
                  title="Increase font size"
                >
                  A+
                </button>
              </div>
              <span className="text-slate-300">|</span>

              {/* Language Switch */}
              <button
                onClick={() => setLanguage("en")}
                className={`font-bold hover:underline ${
                  language === "en" ? "text-blue-900 underline" : "text-slate-600"
                }`}
              >
                English
              </button>
              <span className="text-slate-400">/</span>
              <button
                onClick={() => setLanguage("hi")}
                className={`font-bold hover:underline ${
                  language === "hi" ? "text-blue-900 underline" : "text-slate-600"
                }`}
              >
                हिन्दी
              </button>
            </div>
          </div>
        </div>

        {/* Apex Institutional Masthead */}
        <div className="w-full px-4 sm:px-8 lg:px-12 py-3 bg-white">
          <div className="w-full flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Left: National Emblem & Saksham Logo & Formal Identity */}
            <div className="flex items-center gap-3.5 w-full md:w-auto">
              <img
                src="/assets/national-emblem.png"
                alt="National Emblem of India"
                className="h-14 w-auto object-contain shrink-0"
              />
              <div className="h-10 w-px bg-slate-300 hidden sm:block" />
              <img
                src="/assets/saksham-logo.png"
                alt="Saksham Portal Emblem"
                className="h-14 w-14 object-contain shrink-0"
              />
              <div className="h-10 w-px bg-slate-300 hidden sm:block" />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  SIH 2026 Prototype • PS26265
                </span>
                <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                  सक्षम | SAKSHAM
                </h1>
                <span className="text-xs sm:text-sm font-semibold text-slate-800">
                  Security Deposit &amp; Fixed Deposit Lifecycle Management System
                </span>
                <span className="text-[10px] text-slate-500 font-medium">
                  Centralized Regulatory Deposit &amp; Lien Ledger Portal
                </span>
              </div>
            </div>

            {/* Right: Hotline & Quick Auth Link */}
            <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto border-t md:border-t-0 pt-2 md:pt-0 border-slate-200">
              <div className="hidden lg:flex flex-col items-end border-r border-slate-200 pr-5 text-right">
                <span className="text-[10px] uppercase font-bold text-slate-500">
                  Portal Support Desk
                </span>
                <span className="text-sm font-bold text-slate-900 font-mono">
                  1800-11-2026
                </span>
                <span className="text-[10px] text-slate-600">
                  09:30 AM to 05:30 PM (Working Days)
                </span>
              </div>

              {user ? (
                <Link
                  to="/dashboard"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#15284F] hover:bg-[#0b1a30] text-white rounded text-xs font-bold transition shadow-xs"
                >
                  <LayoutDashboard className="w-4 h-4 text-amber-400" />
                  <span>Go to Dashboard ({user.fullName.split(" ")[0]})</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              ) : (
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#15284F] hover:bg-[#0b1a30] text-white rounded text-xs font-bold transition shadow-xs"
                >
                  <LogIn className="w-4 h-4 text-amber-400" />
                  <span>Authorized Login</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Standard Institutional Navigation Bar (#15284F) */}
        <nav className="bg-[#15284F] text-white border-t border-[#1c355e] w-full">
          <div className="w-full px-4 sm:px-8 lg:px-12 flex items-center justify-between">
            <ul className="flex items-center overflow-x-auto text-xs font-semibold whitespace-nowrap">
              <li>
                <a
                  className="px-4 py-2.5 bg-[#0b1a30] text-white flex items-center gap-1.5 border-b-2 border-amber-400"
                  href="#"
                >
                  <Landmark className="w-3.5 h-3.5 text-amber-400" />
                  <span>{language === "hi" ? "होम (Home)" : "Home"}</span>
                </a>
              </li>
              <li>
                <a
                  className="px-4 py-2.5 text-slate-100 hover:bg-[#1c355e] border-r border-[#1c355e]/60 transition inline-block"
                  href="#search-section"
                >
                  {language === "hi" ? "सत्यापन (Verification)" : "Public Verification"}
                </a>
              </li>
              <li>
                <a
                  className="px-4 py-2.5 text-slate-100 hover:bg-[#1c355e] border-r border-[#1c355e]/60 transition inline-block"
                  href="#capabilities-section"
                >
                  {language === "hi" ? "पोर्टल मॉड्यूल" : "Core Capabilities"}
                </a>
              </li>
              <li>
                <a
                  className="px-4 py-2.5 text-slate-100 hover:bg-[#1c355e] border-r border-[#1c355e]/60 transition inline-block"
                  href="#lifecycle-section"
                >
                  {language === "hi" ? "प्रक्रिया (Workflow)" : "FDR Lifecycle"}
                </a>
              </li>
              <li>
                <a
                  className="px-4 py-2.5 text-slate-100 hover:bg-[#1c355e] border-r border-[#1c355e]/60 transition inline-block"
                  href="#roles-section"
                >
                  {language === "hi" ? "भूमिकाएँ (Roles)" : "Stakeholder Roles"}
                </a>
              </li>
              <li>
                <a
                  className="px-4 py-2.5 text-slate-100 hover:bg-[#1c355e] transition inline-block"
                  href="#advisory-section"
                >
                  {language === "hi" ? "दिशानिर्देश (Advisory)" : "Regulatory Advisory"}
                </a>
              </li>
            </ul>

            <div className="hidden sm:block py-1.5 shrink-0">
              {user ? (
                <Link
                  to="/dashboard"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded border border-amber-600 transition"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>Access Dashboard</span>
                </Link>
              ) : (
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded border border-amber-600 transition"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Portal Login</span>
                </Link>
              )}
            </div>
          </div>
        </nav>

        {/* Regulatory Notice Ticker Strip */}
        <div className="bg-[#fbf7ed] border-y border-[#e2d5bc] text-slate-800 text-xs py-1.5 px-4 sm:px-8 lg:px-12 w-full">
          <div className="w-full flex items-center gap-3">
            <span className="shrink-0 font-bold text-red-700 flex items-center gap-1 text-[11px] uppercase tracking-wide bg-red-100 px-2.5 py-0.5 rounded border border-red-200">
              <BadgeAlert className="w-3.5 h-3.5" />
              <span>{language === "hi" ? "सूचना / Notice:" : "Notice:"}</span>
            </span>
            <div className="overflow-hidden whitespace-nowrap w-full">
              <div className="gov-ticker-track text-[11.5px] text-slate-800 font-medium">
                <span className="mx-3">
                  <strong>Regulatory Mandate APH-2026:</strong> Mandatory registration of
                  tripartite FDR lien with automated IFSC branch validation across scheduled commercial banks.
                </span>
                <span className="text-slate-400">•</span>
                <span className="mx-3">
                  <strong>T-90 Maturity Notification Engine:</strong> Automated tracking active
                  for term deposit renewals and release workflows.
                </span>
                <span className="text-slate-400">•</span>
                <span className="mx-3">
                  <strong>Four-Department Clearance Protocol:</strong> Academic, Legal, Finance,
                  and Regional clearances required prior to e-NOC issuance.
                </span>
                <span className="text-slate-400">•</span>
                <span className="mx-3">
                  <strong>SIH 2026 PS26265:</strong> Intelligent Security Deposit Compliance &amp;
                  Clearance Management System prototype.
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── 2. HERO & PUBLIC SEARCH SECTION ───────────────────────── */}
      <main id="main-content" className="flex-1 w-full">
        <section
          className="bg-white border-b border-slate-300 py-8 px-4 sm:px-8 lg:px-12 w-full"
          id="search-section"
        >
          <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Formal Overview & Public Search */}
            <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-4">
              <div>
                <span className="text-xs font-bold text-[#15284F] uppercase tracking-wide block mb-1">
                  Regulatory Compliance Registry • SIH 2026 PS26265
                </span>
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 leading-tight">
                  Central Repository for Fixed Deposit Receipts &amp; Security Deposits
                </h2>
                <p className="text-slate-700 text-xs sm:text-sm mt-2 leading-relaxed">
                  SAKSHAM establishes a unified, tamper-evident digital ledger to register,
                  scrutinize, and monitor tripartite FDR liens, term tenures, periodic interest
                  accruals, multi-departmental clearances, and statutory e-NOC release workflows
                  across technical institutions and scheduled commercial banks.
                </p>
              </div>

              {/* Public Verification Box */}
              <div className="bg-[#f8fafc] border border-slate-300 rounded-lg p-4 sm:p-5 shadow-xs w-full">
                <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200">
                  <h3 className="text-xs sm:text-sm font-bold text-[#15284F] flex items-center gap-1.5">
                    <Search className="w-4 h-4 text-blue-700" />
                    <span>Public Verification: Search Statutory Instrument / Institute</span>
                  </h3>
                  <span className="text-[10px] font-semibold text-slate-500 uppercase">
                    Tamper-Evident Ledger
                  </span>
                </div>

                <form onSubmit={handleSearch} className="space-y-3">
                  <div>
                    <label
                      htmlFor="fdr-input"
                      className="block text-xs font-bold text-slate-800 mb-1"
                    >
                      Enter FDR Registration Number / Institution Permanent ID (PID){" "}
                      <span className="text-red-600">*</span>
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        id="fdr-input"
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="e.g., FDR/2026/DEL/7821-A or PID: 1-4928172"
                        className="flex-1 px-3.5 py-2 text-xs border border-slate-300 rounded bg-white text-slate-900 font-mono focus:border-[#15284F] focus:ring-1 focus:ring-[#15284F] outline-none"
                        required
                      />
                      <button
                        type="submit"
                        className="px-5 py-2 bg-[#15284F] hover:bg-[#0b1a30] text-white font-bold text-xs rounded transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                      >
                        <ShieldCheck className="w-4 h-4 text-amber-400" />
                        <span>{language === "hi" ? "सत्यापित करें" : "Verify Instrument"}</span>
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Lookup status, lien endorsement, maturity tenure, and encumbrance status.
                    </p>
                  </div>
                </form>

                {/* Verified Result Display */}
                {searched && searchResult && (
                  <div className="mt-3 pt-3 border-t border-slate-200 bg-white p-3.5 rounded border border-slate-200 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-1 mb-2">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Instrument: {searchResult.fdrNumber}</span>
                      </div>
                      <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-900 border border-emerald-300 font-semibold text-[10px] rounded">
                        {searchResult.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11.5px] text-slate-600">
                      <div>
                        <span className="block text-[10px] text-slate-500 font-medium">
                          Principal Amount
                        </span>
                        <span className="font-bold text-slate-900 font-mono">
                          {searchResult.amount}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-500 font-medium">
                          Scheduled Bank
                        </span>
                        <span className="font-semibold text-slate-900 truncate block">
                          {searchResult.bank}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-500 font-medium">
                          Lien Beneficiary
                        </span>
                        <span className="font-semibold text-slate-900 truncate block">
                          {searchResult.lien}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-500 font-medium">
                          Maturity Date
                        </span>
                        <span className="font-mono text-slate-900">
                          {searchResult.maturity}
                        </span>
                      </div>
                    </div>

                    <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500 truncate max-w-sm">
                        {searchResult.institution}
                      </span>
                      <Link
                        to="/login"
                        className="text-[#15284F] hover:underline font-bold text-[11px] inline-flex items-center gap-1"
                      >
                        <span>Access Complete Dossier via Portal</span>
                        <ChevronRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* Hero Action CTAs */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                {user ? (
                  <Link
                    to="/dashboard"
                    className="px-5 py-2.5 bg-[#15284F] hover:bg-[#0b1a30] text-white rounded text-xs font-bold flex items-center gap-2 transition shadow-xs"
                  >
                    <LayoutDashboard className="w-4 h-4 text-amber-400" />
                    <span>Open Regulatory Dashboard</span>
                  </Link>
                ) : (
                  <Link
                    to="/login"
                    className="px-5 py-2.5 bg-[#15284F] hover:bg-[#0b1a30] text-white rounded text-xs font-bold flex items-center gap-2 transition shadow-xs"
                  >
                    <LogIn className="w-4 h-4 text-amber-400" />
                    <span>Authorized Stakeholder Login</span>
                  </Link>
                )}
                <a
                  href="#lifecycle-section"
                  className="px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded text-xs font-bold flex items-center gap-2 transition"
                >
                  <FileText className="w-4 h-4 text-slate-600" />
                  <span>View FDR Lifecycle Workflow</span>
                </a>
              </div>
            </div>

            {/* Right Column: Key Metrics & Statutory Advisory */}
            <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-4" id="advisory-section">
              {/* Institutional Metrics Grid */}
              <div className="grid grid-cols-2 gap-3.5">
                <div className="bg-[#f8fafc] border border-slate-200 rounded-lg p-4">
                  <span className="text-[11px] font-semibold text-slate-500 block">
                    Secured Deposits
                  </span>
                  <span className="text-xl sm:text-2xl font-bold text-[#15284F] font-mono block mt-1">
                    ₹4,820+ Cr
                  </span>
                  <span className="text-[10px] text-emerald-700 font-medium">
                    100% Lien Monitored
                  </span>
                </div>
                <div className="bg-[#f8fafc] border border-slate-200 rounded-lg p-4">
                  <span className="text-[11px] font-semibold text-slate-500 block">
                    Tracked Instruments
                  </span>
                  <span className="text-xl sm:text-2xl font-bold text-[#15284F] font-mono block mt-1">
                    12,450+
                  </span>
                  <span className="text-[10px] text-slate-600 font-medium">
                    Across 34 Scheduled Banks
                  </span>
                </div>
                <div className="bg-[#f8fafc] border border-slate-200 rounded-lg p-4">
                  <span className="text-[11px] font-semibold text-slate-500 block">
                    OCR Automation
                  </span>
                  <span className="text-xl sm:text-2xl font-bold text-[#15284F] font-mono block mt-1">
                    99.4%
                  </span>
                  <span className="text-[10px] text-blue-700 font-medium">
                    Candidate Validation
                  </span>
                </div>
                <div className="bg-[#f8fafc] border border-slate-200 rounded-lg p-4">
                  <span className="text-[11px] font-semibold text-slate-500 block">
                    Discharge Clearance
                  </span>
                  <span className="text-xl sm:text-2xl font-bold text-[#15284F] font-mono block mt-1">
                    4-Dept Check
                  </span>
                  <span className="text-[10px] text-amber-700 font-medium">
                    Zero Unauthorized Releases
                  </span>
                </div>
              </div>

              {/* Regulatory Advisory Panel */}
              <div className="bg-[#fbf7ed] border border-[#e2d5bc] rounded-lg p-4 sm:p-5">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 mb-2.5">
                  <Scale className="w-4 h-4 text-amber-800" />
                  <span>Statutory Advisory &amp; Compliance Notes</span>
                </div>
                <ul className="space-y-2 text-xs text-slate-700 leading-relaxed">
                  <li className="flex items-start gap-2">
                    <span className="text-amber-700 font-bold mt-0.5">•</span>
                    <span>
                      <strong>Tripartite Endorsement:</strong> Fixed deposits must name the
                      regulatory authority as the primary lienholder prior to scrutiny approval.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-700 font-bold mt-0.5">•</span>
                    <span>
                      <strong>T-90 Window:</strong> Deposit renewals and renewal certificates must
                      be submitted at least 90 days before the recorded maturity date.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-700 font-bold mt-0.5">•</span>
                    <span>
                      <strong>Audit Trail Integrity:</strong> All administrative scrutiny decisions,
                      clearance approvals, and NOC issuances are written to a cryptographic hash chain.
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── 3. CORE CAPABILITIES / MODULES SECTION ────────────────── */}
        <section className="py-12 px-4 sm:px-8 lg:px-12 bg-[#f4f6f8] w-full" id="capabilities-section">
          <div className="w-full">
            <div className="text-center max-w-4xl mx-auto mb-10">
              <span className="text-xs font-bold uppercase tracking-wider text-[#15284F]">
                Institutional Architecture
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
                Integrated Security Deposit &amp; FDR Management Modules
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-2">
                Designed to eliminate administrative delays, untracked maturity expiries,
                unauthorized encashment, and fragmented clearance documentation.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Module 1: Registry & Lien Tracking */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center mb-3">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    FDR &amp; Security Deposit Registry
                  </h3>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    Comprehensive centralized registry capturing instrument numbers, scheduled
                    bank details, IFSC branch codes, principal amount, maturity tenure, and
                    joint lienholder records.
                  </p>
                </div>
                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center text-xs font-semibold text-[#15284F]">
                  <span>Filter by Bank, Status &amp; Tenures</span>
                </div>
              </div>

              {/* Module 2: AI OCR Extraction & Verification */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center mb-3">
                    <FileCheck className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    OCR Document Extraction &amp; Validation
                  </h3>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    Automated OCR scanning of uploaded deposit advice and bank receipts with
                    candidate extraction, confidence scoring, rule checks, and human verification.
                  </p>
                </div>
                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center text-xs font-semibold text-[#15284F]">
                  <span>Dual Candidate Comparison Engine</span>
                </div>
              </div>

              {/* Module 3: Scrutiny Queue */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center mb-3">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    Scrutiny Officer Desk
                  </h3>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    Dedicated verification queue for regulatory scrutiny officers to inspect
                    tripartite clauses, review deposit documents, record defect notices, or grant
                    approval.
                  </p>
                </div>
                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center text-xs font-semibold text-[#15284F]">
                  <span>Multi-tier Scrutiny &amp; Remarks</span>
                </div>
              </div>

              {/* Module 4: Departmental Clearances Command Center */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3">
                    <Scale className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    Departmental Clearance Command Center
                  </h3>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    Coordinated 4-department clearance protocol (Academics, Legal, Finance,
                    Regional Cell) with explainable blockers and hold management before release.
                  </p>
                </div>
                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center text-xs font-semibold text-[#15284F]">
                  <span>Inter-departmental Blockers Resolution</span>
                </div>
              </div>

              {/* Module 5: Automated T-90 Maturity Alerts */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center mb-3">
                    <Clock className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    Maturity Tracking &amp; T-90 Notifications
                  </h3>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    Predictive maturity schedule categorizing instruments due within 30, 60,
                    and 90 days. Prevents deposit lapses and enforces timely renewals or refunds.
                  </p>
                </div>
                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center text-xs font-semibold text-[#15284F]">
                  <span>Proactive Renewal Workflows</span>
                </div>
              </div>

              {/* Module 6: Hash-Chained Audit Trail */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center mb-3">
                    <Lock className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    Tamper-Evident Hash-Chained Audit Trail
                  </h3>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    Every registration, officer review, document addition, departmental decision,
                    and release event is appended to a cryptographic hash chain for oversight auditors.
                  </p>
                </div>
                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center text-xs font-semibold text-[#15284F]">
                  <span>Immutable Accountability</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 4. FDR LIFECYCLE WORKFLOW SECTION ──────────────────────── */}
        <section className="py-12 px-4 sm:px-8 lg:px-12 bg-white border-y border-slate-200 w-full" id="lifecycle-section">
          <div className="w-full">
            <div className="text-center max-w-4xl mx-auto mb-10">
              <span className="text-xs font-bold uppercase tracking-wider text-[#15284F]">
                Standard Operating Procedure (SOP)
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
                The SAKSHAM Regulatory Deposit Lifecycle
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-2">
                A structured, auditable 5-stage lifecycle ensuring regulatory compliance at every step.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {/* Step 1 */}
              <div className="bg-[#f8fafc] border border-slate-200 rounded-lg p-5 relative">
                <div className="text-xs font-bold text-blue-700 mb-1">STAGE 1</div>
                <h4 className="text-sm font-bold text-slate-900">Registration &amp; Upload</h4>
                <p className="text-xs text-slate-600 mt-2">
                  Institution registers deposit particulars, uploads bank receipt &amp; tripartite lien letter.
                </p>
              </div>

              {/* Step 2 */}
              <div className="bg-[#f8fafc] border border-slate-200 rounded-lg p-5 relative">
                <div className="text-xs font-bold text-indigo-700 mb-1">STAGE 2</div>
                <h4 className="text-sm font-bold text-slate-900">OCR &amp; Scrutiny</h4>
                <p className="text-xs text-slate-600 mt-2">
                  System executes OCR extraction; Scrutiny Officer verifies particulars against approval norms.
                </p>
              </div>

              {/* Step 3 */}
              <div className="bg-[#f8fafc] border border-slate-200 rounded-lg p-5 relative">
                <div className="text-xs font-bold text-emerald-700 mb-1">STAGE 3</div>
                <h4 className="text-sm font-bold text-slate-900">Active Lien Custody</h4>
                <p className="text-xs text-slate-600 mt-2">
                  Instrument is marked Active; maturity monitoring &amp; periodic tracking commence automatically.
                </p>
              </div>

              {/* Step 4 */}
              <div className="bg-[#f8fafc] border border-slate-200 rounded-lg p-5 relative">
                <div className="text-xs font-bold text-amber-700 mb-1">STAGE 4</div>
                <h4 className="text-sm font-bold text-slate-900">Departmental Clearance</h4>
                <p className="text-xs text-slate-600 mt-2">
                  Upon release request, Academic, Legal, Finance &amp; Regional cells verify non-encumbrance.
                </p>
              </div>

              {/* Step 5 */}
              <div className="bg-[#f8fafc] border border-slate-200 rounded-lg p-5 relative">
                <div className="text-xs font-bold text-purple-700 mb-1">STAGE 5</div>
                <h4 className="text-sm font-bold text-slate-900">e-NOC Discharge</h4>
                <p className="text-xs text-slate-600 mt-2">
                  Competent Approver issues digital e-NOC and releases lien to the bank for lawful refund.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── 5. STAKEHOLDER ROLES SECTION ──────────────────────────── */}
        <section className="py-12 px-4 sm:px-8 lg:px-12 bg-[#f4f6f8] w-full" id="roles-section">
          <div className="w-full">
            <div className="text-center max-w-4xl mx-auto mb-10">
              <span className="text-xs font-bold uppercase tracking-wider text-[#15284F]">
                Role-Based Access Control (RBAC)
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
                Authorized Stakeholder Workspaces
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-2">
                Segregation of duties enforced through cryptographically verified sessions and role boundaries.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
                <div className="text-xs font-bold text-blue-700 uppercase">Institution</div>
                <h4 className="text-base font-bold text-slate-900 mt-1">
                  Technical Institutions
                </h4>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  Register new FDRs, submit renewal instruments, monitor maturity schedules, and initiate refund requests.
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
                <div className="text-xs font-bold text-amber-700 uppercase">Verification</div>
                <h4 className="text-base font-bold text-slate-900 mt-1">
                  Scrutiny Desk Officers
                </h4>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  Inspect deposit documents, review OCR extractions, cross-check IFSC branch records, and approve or reject submissions.
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
                <div className="text-xs font-bold text-emerald-700 uppercase">Authority</div>
                <h4 className="text-base font-bold text-slate-900 mt-1">
                  Competent Approver
                </h4>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  Review departmental clearances, verify compliance criteria, issue official e-NOCs, and authorize refund actions.
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
                <div className="text-xs font-bold text-purple-700 uppercase">Oversight</div>
                <h4 className="text-base font-bold text-slate-900 mt-1">
                  Auditor &amp; Admin
                </h4>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  Review complete cryptographic audit chain, monitor system health, inspect metadata, and manage platform parameters.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── 6. GOVERNMENT-STYLE FOOTER ────────────────────────────── */}
      <footer className="bg-[#0b1a30] text-slate-300 border-t border-slate-800 text-xs w-full">
        <div className="w-full px-4 sm:px-8 lg:px-12 py-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="bg-white p-1 rounded shadow-xs shrink-0 flex items-center justify-center">
                  <img
                    src="/assets/national-emblem.png"
                    alt="National Emblem of India"
                    className="h-8 w-auto object-contain"
                  />
                </div>
                <img
                  src="/assets/saksham-logo.png"
                  alt="Saksham"
                  className="h-8 w-8 object-contain shrink-0"
                />
                <span className="font-bold text-white text-base tracking-tight">
                  सक्षम | SAKSHAM
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Security Deposit &amp; Fixed Deposit Lifecycle Management System. Developed for
                Smart India Hackathon 2026 (Problem Statement PS26265).
              </p>
              <div className="text-[11px] text-slate-500 font-mono">
                Version 1.0 • Prototype Release
              </div>
            </div>

            <div>
              <h5 className="font-bold text-white uppercase text-[11px] tracking-wider mb-3">
                Quick Navigation
              </h5>
              <ul className="space-y-2 text-slate-400 text-xs">
                <li>
                  <a href="#search-section" className="hover:text-white transition">
                    Public Verification
                  </a>
                </li>
                <li>
                  <a href="#capabilities-section" className="hover:text-white transition">
                    Portal Modules
                  </a>
                </li>
                <li>
                  <a href="#lifecycle-section" className="hover:text-white transition">
                    FDR Lifecycle Workflow
                  </a>
                </li>
                <li>
                  <a href="#roles-section" className="hover:text-white transition">
                    Stakeholder Roles
                  </a>
                </li>
                <li>
                  <Link to="/login" className="hover:text-amber-400 transition font-semibold">
                    Authorized Login →
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h5 className="font-bold text-white uppercase text-[11px] tracking-wider mb-3">
                Regulatory Modules
              </h5>
              <ul className="space-y-2 text-slate-400 text-xs">
                <li>FDR Registry &amp; Tripartite Lien</li>
                <li>OCR Extraction &amp; Validation</li>
                <li>Scrutiny Officer Desk</li>
                <li>Departmental Clearance Engine</li>
                <li>T-90 Maturity Notifications</li>
                <li>Hash-Chained Audit Trail</li>
              </ul>
            </div>

            <div>
              <h5 className="font-bold text-white uppercase text-[11px] tracking-wider mb-3">
                Support &amp; Standards
              </h5>
              <div className="space-y-2 text-slate-400 text-[11.5px]">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-amber-400" />
                  <span>Toll Free: 1800-11-2026</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-amber-400" />
                  <span>support@fdr-sentinel.gov.in</span>
                </div>
                <p className="text-[10px] text-slate-500 pt-2 border-t border-slate-800">
                  Built to adhere to GIGW accessibility standards, responsive mobile layouts,
                  and secure HttpOnly cookie session management.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-2">
            <div>
              © 2026 SAKSHAM • Security Deposit &amp; FDR Management • SIH 2026 Prototype PS26265
            </div>
            <div className="flex items-center gap-3">
              <span>Lightweight Prototype Mode</span>
              <span>•</span>
              <span>Synthetic Demonstration Data</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
