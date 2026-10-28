/**
 * src/pages/LandingPage.tsx
 *
 * SAKSHAM - Security Deposit & FDR Management Portal
 * All India Council for Technical Education (AICTE), Ministry of Education, Govt. of India
 *
 * Implementation of design.md specification.
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  Phone,
  Lock,
  Search,
  CheckCircle2,
  ShieldCheck,
  Building2,
  Landmark,
  Scale,
  ArrowRight,
  Download,
  Headphones,
  FileText,
  BadgeAlert,
  Loader2,
  Award,
} from "lucide-react";

export default function LandingPage() {
  const { user } = useAuth();

  // Accessibility state
  const [fontSizeOffset, setFontSizeOffset] = useState<number>(0);
  const [language, setLanguage] = useState<"en" | "hi">("en");

  // Public verification console state
  const [fdrInput, setFdrInput] = useState<string>("FDR/2026/DEL/7821-A");
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isHighlighted, setIsHighlighted] = useState<boolean>(false);
  const [verifiedDossier, setVerifiedDossier] = useState<{
    fdrNumber: string;
    institutionName: string;
    pid: string;
    bankName: string;
    ifsc: string;
    branch: string;
    amount: string;
    tenure: string;
    lienHolder: string;
    maturityDate: string;
    refNo: string;
  }>({
    fdrNumber: "FDR/2026/DEL/7821-A",
    institutionName: "Delhi Inst. of Advanced Engg.",
    pid: "1-4928172",
    bankName: "State Bank of India",
    ifsc: "SBIN0000691",
    branch: "Parliament St",
    amount: "₹35,00,000.00",
    tenure: "10-Year Term Deposit",
    lienHolder: "Member Secretary, AICTE",
    maturityDate: "14-Dec-2029",
    refNo: "AICTE/VER/2026/0942",
  });

  // APH Table 1.4 Calculator state
  const [progMultiplier, setProgMultiplier] = useState<number>(1.0);
  const [progName, setProgName] = useState<string>("Engineering & Tech");
  const [academicTier, setAcademicTier] = useState<number>(35); // in Lakhs
  const [isLeased, setIsLeased] = useState<boolean>(false);

  // Compute calculated amounts
  const premisesFactor = isLeased ? 2.0 : 1.0;
  const baseNormLakhs = academicTier * progMultiplier;
  const totalLakhs = baseNormLakhs * premisesFactor;
  const amountINR = totalLakhs * 100000;

  const getWordsDisplay = (lakhs: number) => {
    if (lakhs === 12) return "Rupees Twelve Lakhs Only";
    if (lakhs === 15) return "Rupees Fifteen Lakhs Only";
    if (lakhs === 24) return "Rupees Twenty-Four Lakhs Only";
    if (lakhs === 28) return "Rupees Twenty-Eight Lakhs Only";
    if (lakhs === 30) return "Rupees Thirty Lakhs Only";
    if (lakhs === 35) return "Rupees Thirty-Five Lakhs Only";
    if (lakhs === 56) return "Rupees Fifty-Six Lakhs Only";
    if (lakhs === 70) return "Rupees Seventy Lakhs Only";
    return `Rupees ${lakhs.toFixed(2)} Lakhs Only`;
  };

  const handleVerify = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!fdrInput.trim()) return;

    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      const query = fdrInput.trim().toUpperCase();
      setVerifiedDossier({
        fdrNumber: query,
        institutionName: query.includes("DEL")
          ? "Delhi Inst. of Advanced Engg."
          : query.includes("MUM")
          ? "Mumbai National Institute of Tech."
          : "National Institute of Technical Studies",
        pid: query.includes("DEL") ? "1-4928172" : "1-5918234",
        bankName: "State Bank of India",
        ifsc: "SBIN0000691",
        branch: "Parliament St",
        amount: "₹35,00,000.00",
        tenure: "10-Year Term Deposit",
        lienHolder: "Member Secretary, AICTE",
        maturityDate: "14-Dec-2029",
        refNo: `AICTE/VER/2026/${Math.floor(1000 + Math.random() * 9000)}`,
      });
      setIsHighlighted(true);
      setTimeout(() => setIsHighlighted(false), 1200);
    }, 450);
  };

  const programmes = [
    { name: "Engineering & Tech", mult: 1.0 },
    { name: "Management / MBA", mult: 1.0 },
    { name: "MCA / Computing", mult: 1.0 },
    { name: "Pharmacy / Others", mult: 0.8 },
  ];

  return (
    <div
      className="min-h-screen bg-[#F8FAFC] font-sans text-[#1E293B] antialiased selection:bg-[#a63b00] selection:text-white"
      style={{ fontSize: `${14 + fontSizeOffset}px` }}
    >
      {/* ── TOP SOVEREIGN HEADER & ACCESSIBILITY BAR ───────────────────── */}
      <header className="sticky top-0 z-50 bg-white shadow-sm border-b border-slate-200">
        {/* Tricolor Flag & Gov Notice Strip */}
        <div className="w-full bg-[#0F172A] text-slate-300 text-xs py-1.5 px-4 sm:px-8 border-b border-slate-800">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <img
                src="/assets/india-flag.png"
                alt="National Flag of India"
                className="h-3.5 w-auto object-contain rounded-[1px] shadow-xs"
              />
              <span className="font-medium tracking-wide text-slate-200">
                भारत सरकार | Government of India
              </span>
              <span className="hidden md:inline text-slate-600">|</span>
              <span className="hidden md:inline text-slate-400">Ministry of Education</span>
            </div>
            <div className="flex items-center gap-4 text-slate-300">
              <a
                className="hover:text-white underline underline-offset-2 hidden sm:inline"
                href="#main-content"
              >
                Skip to Main Content
              </a>
              <div className="hidden sm:flex items-center gap-1 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700 text-[11px]">
                <button
                  type="button"
                  onClick={() => setFontSizeOffset((prev) => Math.max(prev - 1, -2))}
                  className="px-1 hover:text-white transition"
                  title="Decrease font size"
                >
                  A-
                </button>
                <span className="text-slate-600">|</span>
                <button
                  type="button"
                  onClick={() => setFontSizeOffset(0)}
                  className="px-1 text-white font-semibold transition"
                  title="Normal font size"
                >
                  A
                </button>
                <span className="text-slate-600">|</span>
                <button
                  type="button"
                  onClick={() => setFontSizeOffset((prev) => Math.min(prev + 1, 3))}
                  className="px-1 hover:text-white transition"
                  title="Increase font size"
                >
                  A+
                </button>
              </div>
              <div className="flex items-center gap-1 font-semibold text-xs pl-2 border-l border-slate-700">
                <button
                  type="button"
                  onClick={() => setLanguage("en")}
                  className={language === "en" ? "text-white font-bold" : "text-slate-400 hover:text-white"}
                >
                  EN
                </button>
                <span className="text-slate-500">/</span>
                <button
                  type="button"
                  onClick={() => setLanguage("hi")}
                  className={language === "hi" ? "text-white font-bold" : "text-slate-400 hover:text-white"}
                >
                  हिन्दी
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Official Portal Logo & Title Banner */}
        <div className="w-full bg-white py-3 px-4 sm:px-8">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3 sm:gap-4 py-1">
              <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
                {/* 1st: Saksham Portal Logo */}
                <img
                  src="/assets/saksham-logo.png"
                  alt="Saksham Logo"
                  className="h-10 sm:h-11 w-auto object-contain shrink-0"
                  onError={(e) => {
                    e.currentTarget.src = "https://lh3.googleusercontent.com/aida-public/AB6AXuDYJrU5P8587cy0sA0HKVZoqfIs9gxdYDuTNXTc4DZYp_ZpYyoT1rlVS420iZst8xauQiYx6fTKC-v_c-jc54hR4B9JuXGMvRrJQ4v8VXoiWMivXSpV4R1NxSp4hbkJdTEV6ykK82Rg_LMXpur9KR1scCINOVYrQSkd94efUUwZ7FIraNsRZ3uClZ4_G2a8uBSUBIOt1hgNOr_3cPqaNCE53ov5HdltroBBbBz-y8QM14D-o7rbKHU";
                  }}
                />
                <div className="h-8 w-[1px] bg-slate-200" />

                {/* 2nd: AICTE Logo */}
                <img
                  src="/assets/aicte-logo.png"
                  alt="AICTE Logo"
                  className="h-10 sm:h-11 w-auto object-contain shrink-0"
                  onError={(e) => {
                    e.currentTarget.src = "https://lh3.googleusercontent.com/aida-public/AB6AXuDI6rcLpxOVTL6JgZo2lfExwokIMFF5cHOjFRC5l8N4xiWWQboVYCeEa-f6g1rRwmMdpKyRxGXh68ASRu_m7ncsZ0jCYcXljVuWXpbCKnY7BB3l8NJS1bLUeAEsHGLvF9H_ZjulxUnTDQp2aVQ47THRBuI2WwqC3F4PIQxPn1Ltl4N41f7rOO_3hsTvG_XtLEUVVfVcqct3ay6BJkBEiu_mkqK0dS6ZL829gxa93QghDjwAJP8BXmY";
                  }}
                />
                <div className="h-8 w-[1px] bg-slate-200" />

                {/* 3rd: National Emblem Logo */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <img
                    src="/assets/national-emblem.png"
                    alt="Government of India Emblem"
                    className="h-10 sm:h-11 w-auto object-contain shrink-0"
                    onError={(e) => {
                      e.currentTarget.src = "https://lh3.googleusercontent.com/aida-public/AB6AXuA_HpcTBJisTKFWPpHtSamQhIRFLZjlUzDqgnIv3BRoZcr-tAP2g9pCqFM7j4gATLz_N6_SJx1iI_T3R45KTaTo_8xaYqt3ZDUmRDVPjoD7PUR6AjMFME34XMZeg9jgUyHz45PH71Fs1dILA0LDDPaVFPQnSND1K5HUe47lx9wgwbJ6aDr-8Vh96NiOta2IWUv9L2XrSjRaH0xJd7IwV4eJVxCrTy280P5CvtmGgvveOVv3vRXehb4";
                    }}
                  />
                  <div className="hidden xl:flex flex-col text-[9.5px] font-semibold text-slate-700 leading-tight">
                    <span>शिक्षा मंत्रालय</span>
                    <span className="uppercase text-[8.5px] text-slate-500 font-bold">Ministry of Education</span>
                  </div>
                </div>
              </div>
              <div className="h-10 w-[1px] bg-slate-200 hidden sm:block" />
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    SAKSHAM
                  </span>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-blue-50 text-[#0B2545] border border-blue-200/80">
                    AICTE Statutory Portal
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 font-medium tracking-tight mt-0.5">
                  Security Deposit &amp; FDR Lifecycle Management Portal | All India Council for Technical Education
                </p>
              </div>
            </div>

            <div className="hidden lg:flex items-center gap-6">
              <div className="flex items-center gap-2.5 text-right">
                <Phone className="w-6 h-6 text-[#A63B00]" />
                <div className="text-left leading-tight">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Statutory Helpline
                  </p>
                  <p className="text-sm font-bold text-slate-800">1800-11-2244 / 011-29581000</p>
                </div>
              </div>
              {user ? (
                <Link
                  to="/dashboard"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#0B2545] hover:bg-[#001026] text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
                >
                  <ShieldCheck className="w-[18px] h-[18px] text-amber-400" />
                  <span>Go to Dashboard</span>
                </Link>
              ) : (
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#0B2545] hover:bg-[#001026] text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
                >
                  <Lock className="w-[18px] h-[18px]" />
                  <span>Authorized Sign In</span>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Main Navigation Bar */}
        <nav className="w-full bg-[#0B2545] text-white shadow-inner border-t border-slate-700/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-8 flex items-center justify-between">
            <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto py-1">
              <a
                className="px-4 py-2 text-sm font-bold text-white bg-[#A63B00] rounded-md transition-colors whitespace-nowrap"
                href="#"
              >
                Home
              </a>
              <a
                className="px-3.5 py-2 text-sm font-medium text-slate-200 hover:text-white hover:bg-slate-800/60 rounded-md transition-colors whitespace-nowrap"
                href="#public-verification"
              >
                Public Verification
              </a>
              <a
                className="px-3.5 py-2 text-sm font-medium text-slate-200 hover:text-white hover:bg-slate-800/60 rounded-md transition-colors whitespace-nowrap"
                href="#calculator"
              >
                Deposit Calculator
              </a>
              <a
                className="px-3.5 py-2 text-sm font-medium text-slate-200 hover:text-white hover:bg-slate-800/60 rounded-md transition-colors whitespace-nowrap"
                href="#capabilities"
              >
                Key Capabilities
              </a>
              <a
                className="px-3.5 py-2 text-sm font-medium text-slate-200 hover:text-white hover:bg-slate-800/60 rounded-md transition-colors whitespace-nowrap"
                href="#guidelines"
              >
                Guidelines &amp; FAQ
              </a>
            </div>
            <div className="lg:hidden py-1">
              {user ? (
                <Link
                  to="/dashboard"
                  className="px-3 py-1.5 bg-[#A63B00] text-xs font-semibold rounded text-white flex items-center gap-1"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Dashboard
                </Link>
              ) : (
                <Link
                  to="/login"
                  className="px-3 py-1.5 bg-[#A63B00] text-xs font-semibold rounded text-white flex items-center gap-1"
                >
                  <Lock className="w-3.5 h-3.5" />
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </nav>
      </header>

      {/* ── MAIN CONTENT ─────────────────────────────────────────────── */}
      <main className="w-full" id="main-content">
        {/* HERO SECTION WITH MONUMENTAL CIVIC BACKGROUND IMAGE */}
        <section className="relative w-full text-white overflow-hidden min-h-[520px] flex items-center">
          {/* Monumental Civic Rashtrapati Bhavan / India Gate Background Image */}
          <img
            alt="Government of India monumental civic architecture"
            className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAn0RGyyYYLJtXys3LTVSSEgNy45CbVkLGbNlva3-Wq63nikyF5z1kv7o0u_o46Raw74_Fv8U3z0YbG9hyF0Dx5Xk09P-TjYQnu8gRxvzZzmLIpSPZvmMRAS1s4A2CahZZeLHupcDmvyDYGCsFmtWHNCiVhcIm8ss18q4e0uLmOTz1ClOi3mh1RnHjlZwYDxWZ_rlbzwgS44Uc4jF5zCyr6MiKHv4fCSKhCEsgzAg"
          />
          {/* Deep Sovereign Navy/Slate Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-900/90 to-slate-950/85 backdrop-blur-[1px]" />

          {/* Hero Content */}
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-8 py-16 sm:py-20 w-full">
            <div className="max-w-3xl">
              {/* Authority Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/60 backdrop-blur-md border border-amber-400/30 text-xs sm:text-sm font-semibold tracking-wide text-amber-300 mb-6">
                <CheckCircle2 className="w-4 h-4 text-amber-400" />
                <span>Government of India | AICTE Statutory Portal</span>
              </div>

              {/* Main Authoritative Headline */}
              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight sm:leading-[1.15] mb-5">
                Institutional Security Deposit &amp; FDR Management Portal
              </h1>

              {/* Crisp Concise Subtitle */}
              <p className="text-base sm:text-lg text-slate-200 leading-relaxed font-normal mb-8 max-w-2xl">
                A centralised digital repository for technical institutions across India to register,
                monitor, and process statutory Fixed Deposit Receipts and tripartite regulatory clearances.
              </p>

              {/* Primary CTAs */}
              <div className="flex flex-wrap items-center gap-4 mb-10">
                <a
                  className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-lg bg-[#A63B00] hover:bg-[#FC6C29] text-white font-semibold text-base shadow-lg shadow-orange-950/40 transition-all"
                  href="#public-verification"
                >
                  <Search className="w-5 h-5" />
                  <span>Public FDR Verification</span>
                </a>
                {user ? (
                  <Link
                    to="/dashboard"
                    className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-white font-semibold text-base border border-slate-600/60 backdrop-blur-sm transition-all"
                  >
                    <ShieldCheck className="w-5 h-5 text-amber-400" />
                    <span>Access Dashboard ({user.fullName.split(" ")[0]})</span>
                  </Link>
                ) : (
                  <Link
                    to="/login"
                    className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-white font-semibold text-base border border-slate-600/60 backdrop-blur-sm transition-all"
                  >
                    <Lock className="w-5 h-5 text-slate-300" />
                    <span>Institution / Officer Login</span>
                  </Link>
                )}
              </div>

              {/* 3-Stat Badge Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-6 border-t border-white/15 max-w-2xl">
                <div className="flex items-center gap-3">
                  <Landmark className="w-7 h-7 text-amber-400" />
                  <div>
                    <p className="text-lg font-bold text-white tracking-tight">₹4,800+ Cr</p>
                    <p className="text-xs text-slate-300">Monitored Deposits</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <FileText className="w-7 h-7 text-amber-400" />
                  <div>
                    <p className="text-lg font-bold text-white tracking-tight">12,400+</p>
                    <p className="text-xs text-slate-300">Active FDR Instruments</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Building2 className="w-7 h-7 text-amber-400" />
                  <div>
                    <p className="text-lg font-bold text-white tracking-tight">34 Banks</p>
                    <p className="text-xs text-slate-300">Scheduled Commercial</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION: PUBLIC VERIFICATION CONSOLE (ELEVATED & CLEAN) */}
        <section
          className="relative z-20 max-w-5xl mx-auto px-4 sm:px-8 -mt-10 sm:-mt-12 mb-16"
          id="public-verification"
        >
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2 mb-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-[#0B2545] flex items-center gap-2">
                  <ShieldCheck className="w-6 h-6 text-[#A63B00]" />
                  <span>Public FDR Verification</span>
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  Instant online validation of statutory security deposit lien certificates
                </p>
              </div>
            </div>

            {/* Search Bar */}
            <form onSubmit={handleVerify} className="flex flex-col sm:flex-row items-stretch gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  value={fdrInput}
                  onChange={(e) => setFdrInput(e.target.value)}
                  placeholder="Enter FDR Number or Institution Permanent ID (PID)"
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-300 text-slate-800 placeholder-slate-400 text-sm sm:text-base rounded-xl focus:bg-white focus:border-[#0B2545] focus:ring-2 focus:ring-[#0B2545]/20 outline-none transition font-mono"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isVerifying}
                className="px-6 py-3.5 bg-[#0B2545] hover:bg-[#001026] text-white text-sm sm:text-base font-semibold rounded-xl shadow-md flex items-center justify-center gap-2 transition shrink-0 cursor-pointer disabled:opacity-75"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="w-4.5 h-4.5 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <Scale className="w-4.5 h-4.5" />
                    <span>Verify Instrument</span>
                  </>
                )}
              </button>
            </form>

            {/* Clean Sample Verified Dossier Card */}
            <div
              className={`bg-[#F8FAFC] border rounded-xl p-5 sm:p-6 transition-all duration-300 ${
                isHighlighted
                  ? "border-[#A63B00] ring-2 ring-[#A63B00]/40"
                  : "border-slate-200"
              }`}
              id="verified-result-card"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
                <div>
                  <span className="text-xs uppercase tracking-wider font-semibold text-slate-500">
                    Verified Certificate
                  </span>
                  <p className="text-lg font-bold text-[#0B2545] tracking-tight font-mono">
                    FDR No: {verifiedDossier.fdrNumber}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-100/80 text-emerald-800 text-xs font-bold rounded-md border border-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  Active Tripartite Lien
                </span>
              </div>

              {/* Metadata 4-Column Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 py-4 text-sm">
                <div>
                  <p className="text-xs text-slate-500 font-medium">Institution Name</p>
                  <p className="font-semibold text-slate-800 mt-0.5">{verifiedDossier.institutionName}</p>
                  <p className="text-xs text-slate-500">PID: {verifiedDossier.pid}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Bank &amp; Branch (IFSC)</p>
                  <p className="font-semibold text-slate-800 mt-0.5">{verifiedDossier.bankName}</p>
                  <p className="text-xs text-slate-500 font-mono">
                    {verifiedDossier.ifsc} ({verifiedDossier.branch})
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Principal Amount</p>
                  <p className="text-base font-extrabold text-[#A63B00] mt-0.5 font-mono">
                    {verifiedDossier.amount}
                  </p>
                  <p className="text-xs text-slate-500">{verifiedDossier.tenure}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Lien Holder</p>
                  <p className="font-semibold text-[#0B2545] mt-0.5">{verifiedDossier.lienHolder}</p>
                  <p className="text-xs text-emerald-700 font-medium">
                    Maturity: {verifiedDossier.maturityDate}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200/70 flex items-center justify-between text-xs text-slate-500">
                <span>Statutory Verification Ref: {verifiedDossier.refNo}</span>
                <span className="text-slate-400">Authentic Government Record</span>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION: APH TABLE 1.4 STATUTORY COMPLIANCE CALCULATOR (CLEAN & INTUITIVE) */}
        <section className="max-w-5xl mx-auto px-4 sm:px-8 mb-20" id="calculator">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs uppercase font-bold tracking-widest text-[#A63B00]">
              Approval Process Handbook Norms
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0B2545] tracking-tight mt-1">
              AICTE Table 1.4 Security Deposit Calculator
            </h2>
            <p className="text-slate-600 text-sm sm:text-base mt-2">
              Calculate the mandated statutory joint FDR quantum based on technical discipline and land ownership status.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Inputs (7 cols) */}
              <div className="lg:col-span-7 space-y-6">
                {/* 1. Programme Discipline Pills */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2.5">
                    Technical Programme / Discipline
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {programmes.map((p) => {
                      const isSelected = progName === p.name;
                      return (
                        <button
                          key={p.name}
                          type="button"
                          onClick={() => {
                            setProgName(p.name);
                            setProgMultiplier(p.mult);
                          }}
                          className={`px-3 py-2 text-xs sm:text-sm font-semibold rounded-lg transition text-center cursor-pointer ${
                            isSelected
                              ? "bg-[#0B2545] text-white shadow-xs"
                              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                          }`}
                        >
                          {p.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Academic Award Tier Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2.5">
                    Academic Tier / Award Level
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {/* Diploma */}
                    <label
                      onClick={() => setAcademicTier(15)}
                      className={`flex items-center gap-2.5 p-3 rounded-lg cursor-pointer transition ${
                        academicTier === 15
                          ? "border-2 border-[#0B2545] bg-blue-50/40"
                          : "border border-slate-200 bg-slate-50/50 hover:bg-slate-100/70"
                      }`}
                    >
                      <input
                        type="radio"
                        name="academic-tier"
                        value={15}
                        checked={academicTier === 15}
                        onChange={() => setAcademicTier(15)}
                        className="h-4 w-4 text-[#A63B00] focus:ring-[#A63B00]"
                      />
                      <div className="text-left">
                        <p className={`text-xs sm:text-sm font-bold ${academicTier === 15 ? "text-[#0B2545]" : "text-slate-800"}`}>
                          Diploma
                        </p>
                        <p className="text-[11px] text-slate-500">₹15 Lakhs</p>
                      </div>
                    </label>

                    {/* UG */}
                    <label
                      onClick={() => setAcademicTier(35)}
                      className={`flex items-center gap-2.5 p-3 rounded-lg cursor-pointer transition ${
                        academicTier === 35
                          ? "border-2 border-[#0B2545] bg-blue-50/40"
                          : "border border-slate-200 bg-slate-50/50 hover:bg-slate-100/70"
                      }`}
                    >
                      <input
                        type="radio"
                        name="academic-tier"
                        value={35}
                        checked={academicTier === 35}
                        onChange={() => setAcademicTier(35)}
                        className="h-4 w-4 text-[#A63B00] focus:ring-[#A63B00]"
                      />
                      <div className="text-left">
                        <p className={`text-xs sm:text-sm font-bold ${academicTier === 35 ? "text-[#0B2545]" : "text-slate-800"}`}>
                          Undergraduate (UG)
                        </p>
                        <p className="text-[11px] text-slate-600">₹35 Lakhs</p>
                      </div>
                    </label>

                    {/* PG */}
                    <label
                      onClick={() => setAcademicTier(15)}
                      className={`flex items-center gap-2.5 p-3 rounded-lg cursor-pointer transition ${
                        academicTier === 15
                          ? "border-2 border-[#0B2545] bg-blue-50/40"
                          : "border border-slate-200 bg-slate-50/50 hover:bg-slate-100/70"
                      }`}
                    >
                      <input
                        type="radio"
                        name="academic-tier"
                        value={15}
                        checked={academicTier === 15}
                        onChange={() => setAcademicTier(15)}
                        className="h-4 w-4 text-[#A63B00] focus:ring-[#A63B00]"
                      />
                      <div className="text-left">
                        <p className={`text-xs sm:text-sm font-bold ${academicTier === 15 ? "text-[#0B2545]" : "text-slate-800"}`}>
                          Postgraduate (PG)
                        </p>
                        <p className="text-[11px] text-slate-500">₹15 Lakhs</p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* 3. Lease Toggle */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      Private Leased Premises (2.0x Multiplier)
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Applies when campus property is held on registered long-term lease rather than trust ownership.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={isLeased}
                      onChange={(e) => setIsLeased(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#A63B00]" />
                  </label>
                </div>
              </div>

              {/* Result Display (5 cols) */}
              <div className="lg:col-span-5">
                <div className="bg-[#0B2545] rounded-xl text-white p-6 sm:p-7 shadow-lg flex flex-col justify-between h-full border border-slate-800">
                  <div>
                    <span className="text-xs uppercase font-bold text-amber-300 tracking-wider">
                      Statutory Calculation
                    </span>
                    <p className="text-xs text-slate-300 mt-1">
                      APH Table 1.4 Prescribed Joint FDR Quantum
                    </p>

                    <div className="my-6">
                      <p className="text-xs text-slate-400 uppercase font-semibold">
                        Statutory Deposit Required:
                      </p>
                      <p className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mt-1 font-mono">
                        ₹{amountINR.toLocaleString("en-IN")}
                      </p>
                      <p className="text-xs text-slate-300 mt-1">
                        {getWordsDisplay(totalLakhs)}
                      </p>
                    </div>

                    <div className="space-y-2 py-3 border-t border-slate-700/60 text-xs text-slate-300">
                      <div className="flex justify-between">
                        <span>Base Programme Norm:</span>
                        <span className="text-white font-semibold">
                          ₹{baseNormLakhs.toFixed(2)} Lakhs
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Premises Factor:</span>
                        <span
                          className={`font-semibold ${
                            isLeased ? "text-amber-400" : "text-emerald-400"
                          }`}
                        >
                          {isLeased ? "2.0x (Private Leased)" : "1.0x (Trust Owned)"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Lien Beneficiary:</span>
                        <span className="text-white font-semibold">
                          Member Secretary, AICTE
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 mt-2 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-400">
                    <span>Ref: APH 2024–27 Sec 1.12</span>
                    <a
                      className="text-amber-400 hover:underline font-semibold flex items-center gap-1"
                      href="#guidelines"
                    >
                      View Norms <ArrowRight className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION: CORE CAPABILITIES (CLEAN 4-CARD GRID) */}
        <section className="max-w-7xl mx-auto px-4 sm:px-8 mb-20" id="capabilities">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs uppercase font-bold tracking-widest text-[#A63B00]">
              Digital Infrastructure
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0B2545] tracking-tight mt-1">
              Core Statutory Capabilities
            </h2>
            <p className="text-slate-600 text-sm sm:text-base mt-2">
              Purpose-built modules ensuring complete regulatory compliance, accountability, and seamless lifecycle administration.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1 */}
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs hover:shadow-md transition">
              <div className="w-12 h-12 rounded-lg bg-blue-50 text-[#0B2545] flex items-center justify-center mb-4">
                <Landmark className="w-6 h-6 text-[#0B2545]" />
              </div>
              <h3 className="text-base font-bold text-[#0B2545] mb-2">Centralised FDR Registry</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Consolidated tracking of tripartite deposits across scheduled commercial banks with branch IFSC synchronization.
              </p>
            </div>

            {/* Card 2 */}
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs hover:shadow-md transition">
              <div className="w-12 h-12 rounded-lg bg-orange-50 text-[#A63B00] flex items-center justify-center mb-4">
                <FileText className="w-6 h-6 text-[#A63B00]" />
              </div>
              <h3 className="text-base font-bold text-[#0B2545] mb-2">Digital Document Verification</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Streamlined verification of deposit receipts, tripartite clauses, and statutory undertakings submitted by institutions.
              </p>
            </div>

            {/* Card 3 */}
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs hover:shadow-md transition">
              <div className="w-12 h-12 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center mb-4">
                <BadgeAlert className="w-6 h-6 text-amber-700" />
              </div>
              <h3 className="text-base font-bold text-[#0B2545] mb-2">T-90 Maturity Alerts</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Automated advance renewal reminders at 90, 60, and 30 days before maturity date to prevent deposit lapses.
              </p>
            </div>

            {/* Card 4 */}
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs hover:shadow-md transition">
              <div className="w-12 h-12 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4">
                <Award className="w-6 h-6 text-emerald-700" />
              </div>
              <h3 className="text-base font-bold text-[#0B2545] mb-2">Multi-Department Clearance</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Coordinated inter-departmental approvals across Scrutiny, Legal, and Vigilance cells for statutory refund &amp; NOC release.
              </p>
            </div>
          </div>
        </section>

        {/* GUIDELINES & SUPPORT STRIP */}
        <section className="max-w-7xl mx-auto px-4 sm:px-8 mb-20" id="guidelines">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-[#0B2545] shrink-0 mt-1">
                <Headphones className="w-7 h-7 text-[#0B2545]" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#0B2545]">
                  Statutory Guidelines &amp; Nodal Helpdesk
                </h3>
                <p className="text-sm text-slate-600 max-w-xl mt-1">
                  Have questions regarding tripartite deposit registration, bank advice uploads, or lien discharges under APH Chapter 1? Consult the official procedural manual.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <a
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-semibold rounded-lg transition flex items-center gap-2"
                href="#guidelines"
              >
                <Download className="w-[18px] h-[18px]" />
                <span>Download Handbook</span>
              </a>
              <a
                className="px-4 py-2.5 bg-[#0B2545] hover:bg-[#001026] text-white text-sm font-semibold rounded-lg transition flex items-center gap-2"
                href="mailto:saksham-support@aicte-india.org"
              >
                <Headphones className="w-[18px] h-[18px]" />
                <span>Contact Helpdesk</span>
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* ── ACCESSIBLE & OFFICIAL GIGW-COMPLIANT FOOTER ─────────────────── */}
      <footer className="w-full bg-[#0F172A] text-slate-300 border-t border-slate-800 pt-12 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-slate-800">
            {/* Col 1: Portal Details */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-white">
                <Landmark className="w-6 h-6 text-amber-400" />
                <span className="font-bold text-lg">SAKSHAM PORTAL</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                All India Council for Technical Education (AICTE), Ministry of Education, Government of India. Official regulatory platform for technical institutions.
              </p>
              <div className="pt-1 flex items-center gap-2 text-xs text-emerald-400 font-medium">
                <CheckCircle2 className="w-4 h-4" />
                <span>STQC &amp; GIGW 3.0 Compliant</span>
              </div>
            </div>

            {/* Col 2: Quick Links */}
            <div className="space-y-2 text-xs">
              <p className="text-sm font-bold text-white uppercase tracking-wider mb-2">Navigation</p>
              <p>
                <a className="text-slate-400 hover:text-white transition" href="#public-verification">
                  Public Verification
                </a>
              </p>
              <p>
                <a className="text-slate-400 hover:text-white transition" href="#calculator">
                  Table 1.4 Calculator
                </a>
              </p>
              <p>
                <a className="text-slate-400 hover:text-white transition" href="#capabilities">
                  Key Capabilities
                </a>
              </p>
              <p>
                <a className="text-slate-400 hover:text-white transition" href="#guidelines">
                  Approval Process Handbook
                </a>
              </p>
            </div>

            {/* Col 3: Government Portals */}
            <div className="space-y-2 text-xs">
              <p className="text-sm font-bold text-white uppercase tracking-wider mb-2">
                National Gateways
              </p>
              <p>
                <a
                  className="text-slate-400 hover:text-white transition"
                  href="https://www.education.gov.in"
                  rel="noreferrer"
                  target="_blank"
                >
                  Ministry of Education
                </a>
              </p>
              <p>
                <a
                  className="text-slate-400 hover:text-white transition"
                  href="https://www.aicte-india.org"
                  rel="noreferrer"
                  target="_blank"
                >
                  AICTE Official Portal
                </a>
              </p>
              <p>
                <a
                  className="text-slate-400 hover:text-white transition"
                  href="https://www.india.gov.in"
                  rel="noreferrer"
                  target="_blank"
                >
                  National Portal of India
                </a>
              </p>
              <p>
                <a
                  className="text-slate-400 hover:text-white transition"
                  href="https://www.digitalindia.gov.in"
                  rel="noreferrer"
                  target="_blank"
                >
                  Digital India
                </a>
              </p>
            </div>

            {/* Col 4: Support & Contact */}
            <div className="space-y-2 text-xs">
              <p className="text-sm font-bold text-white uppercase tracking-wider mb-2">
                Helpdesk &amp; Support
              </p>
              <p className="text-slate-300 font-medium">Toll-Free: 1800-11-2244</p>
              <p className="text-slate-300">Office: 011-29581000</p>
              <p className="text-slate-400">Nelson Mandela Marg, Vasant Kunj, New Delhi - 110070</p>
              <p className="text-slate-400">Email: saksham-support@aicte-india.org</p>
            </div>
          </div>

          {/* Legal Policy Bar & Copyright */}
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <div className="flex flex-wrap items-center gap-4">
              <a className="hover:text-slate-300 transition" href="#guidelines">
                Website Policies
              </a>
              <span>•</span>
              <a className="hover:text-slate-300 transition" href="#guidelines">
                Terms of Use
              </a>
              <span>•</span>
              <a className="hover:text-slate-300 transition" href="#guidelines">
                Copyright Policy
              </a>
              <span>•</span>
              <a className="hover:text-slate-300 transition" href="#guidelines">
                Hyperlinking Policy
              </a>
            </div>
            <div className="text-center sm:text-right">
              © 2026 AICTE. All Rights Reserved. Hosted with National Informatics Centre (NIC).
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
