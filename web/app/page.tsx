"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Building2,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  User,
  Lock,
  Search,
  PhoneCall,
  Clock,
  Warehouse,
  Info,
} from "lucide-react";
import { apiFetch, saveSession, UserSession } from "@/lib/api";
import { PublicAidTrackerModal } from "@/components/DisasterEnhancements";
import { useSiblingStagger } from "@/components/InteractiveMotion";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [showTracker, setShowTracker] = useState(false);
  const infoCardsRef = useRef<HTMLDivElement>(null);
  const quickRolesRef = useRef<HTMLDivElement>(null);

  useSiblingStagger(infoCardsRef);
  useSiblingStagger(quickRolesRef, mode);

  // Real-time Philippine Standard Time display
  const [pstTime, setPstTime] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        timeZone: "Asia/Manila",
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      };
      setPstTime(new Intl.DateTimeFormat("en-PH", options).format(now));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Login Form States
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showLoginPass, setShowLoginPass] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Registration States
  const [regStep, setRegStep] = useState<"form" | "otp">("form");
  const [regUsername, setRegUsername] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [showRegPass, setShowRegPass] = useState(false);
  const [regFullName, setRegFullName] = useState("");
  const [regContactInfo, setRegContactInfo] = useState("");
  const [regRole, setRegRole] = useState<"Donor" | "Organization" | "Volunteer">("Donor");
  const [regDonorType, setRegDonorType] = useState<"Individual" | "Corporate">("Individual");
  const [regOrgName, setRegOrgName] = useState("");
  const [regLocation, setRegLocation] = useState("City of Batac, Ilocos Norte");
  const [regVehicleType, setRegVehicleType] = useState("Cargo Van");

  // OTP Verification States
  const [pendingEmail, setPendingEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);

  // Feedback & Network States
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  const routeByRole = (session: UserSession) => {
    const role = (session?.user?.role || "").toLowerCase();
    if (role === "admin" || role === "manager") router.push("/admin");
    else if (role === "donor") router.push("/donor");
    else if (role === "organization") router.push("/organization");
    else if (role === "volunteer") router.push("/volunteer");
    else router.push("/admin");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    if (!username.trim() || !password) {
      setErrorMsg("Please enter both your username/email and password.");
      return;
    }
    setSubmitting(true);
    try {
      const session = await apiFetch<UserSession>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username: username.trim(), password }),
      });
      setSuccessMsg("Authentication verified. Entering portal...");
      saveSession(session);
      routeByRole(session);
    } catch (err: any) {
      setErrorMsg(err.message || "Invalid credentials. Please verify your login details.");
    } finally {
      setSubmitting(false);
    }
  };

  const fillQuickAccount = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setErrorMsg("");
    setSuccessMsg("");
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    const trimmedUser = regUsername.trim();
    const trimmedEmail = regEmail.trim().toLowerCase();

    if (trimmedUser.length < 3 || /[\s@]/.test(trimmedUser)) {
      setErrorMsg("Username must be 3-50 characters with no spaces or '@'.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmedEmail)) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }
    if (regPassword.length < 6) {
      setErrorMsg("Password must be at least 6 characters long.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch<{
        pendingVerification?: boolean;
        email: string;
        message?: string;
      }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          username: trimmedUser,
          email: trimmedEmail,
          password: regPassword,
          fullName: regFullName.trim(),
          contactInfo: regContactInfo.trim(),
          role: regRole,
          donorType: regDonorType,
          orgName: (regOrgName || regFullName).trim(),
          location: regLocation.trim() || "City of Batac, Ilocos Norte",
          vehicleType: regVehicleType,
        }),
      });

      if (res?.pendingVerification) {
        setPendingEmail(res.email || trimmedEmail);
        setRegStep("otp");
        setResendCooldown(60);
        setSuccessMsg(res.message || "A 6-digit verification code has been dispatched to your email.");
      } else {
        setSuccessMsg("Registration successful! You may now sign in.");
        setMode("login");
        setUsername(trimmedUser);
        setPassword("");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Registration failed. Please check your information.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    const cleanOtp = otpCode.replace(/\D/g, "");
    if (!/^\d{6}$/.test(cleanOtp)) {
      setErrorMsg("Please enter the exact 6-digit verification code.");
      return;
    }

    setSubmitting(true);
    try {
      const session = await apiFetch<UserSession>("/api/auth/verify-email", {
        method: "POST",
        body: JSON.stringify({
          email: pendingEmail,
          code: cleanOtp,
        }),
      });
      setSuccessMsg("Email verified! Entering your stakeholder dashboard...");
      saveSession(session);
      routeByRole(session);
    } catch (err: any) {
      setErrorMsg(err.message || "Verification code is invalid or has expired.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || resending) return;
    setErrorMsg("");
    setSuccessMsg("");
    setResending(true);
    try {
      await apiFetch("/api/auth/resend-otp", {
        method: "POST",
        body: JSON.stringify({ email: pendingEmail }),
      });
      setSuccessMsg("A fresh 6-digit verification code has been transmitted.");
      setResendCooldown(60);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to resend code. Please wait a moment.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col font-sans selection:bg-[#0038A8] selection:text-white">
      {/* =========================================================================
          1. REPUBLIC OF THE PHILIPPINES OFFICIAL GOVERNMENT TOP BAR (GWHS)
          ========================================================================= */}
      <header className="bg-[#0F172A] border-b-2 border-[#D97706] text-white text-[11px] sm:text-xs py-1.5 px-4 sm:px-8 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 font-medium tracking-wide">
            <img src="/logo_bp.png" alt="Bagong Pilipinas" className="h-4 sm:h-5 object-contain" />
            <span className="text-slate-300">REPUBLIKA NG PILIPINAS</span>
            <span className="text-slate-600">•</span>
            <span className="text-amber-400 font-semibold">LUNGSOD NG BATAC, ILOCOS NORTE</span>
          </div>
          <div className="flex items-center gap-4 text-slate-300 font-mono text-[11px]">
            <span className="hidden md:inline-flex items-center gap-1.5">
              <Clock className="h-3 w-3 text-amber-400" />
              <span>PST: {pstTime || "Philippine Standard Time"}</span>
            </span>
            <span className="hidden lg:inline text-slate-600">|</span>
            <span className="inline-flex items-center gap-1.5 text-slate-200">
              <PhoneCall className="h-3 w-3 text-rose-400" />
              <span>CDRRMO Emergency Desk: <strong>(077) 792-3049</strong></span>
            </span>
          </div>
        </div>
      </header>

      {/* =========================================================================
          2. INSTITUTIONAL BRANDING HEADER (MMSU + BATAC CDRRMO)
          ========================================================================= */}
      <div className="bg-white border-b border-slate-200 py-3.5 px-4 sm:px-8 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Clustered Academic and Government Logos */}
            <div className="flex items-center gap-2.5 shrink-0">
              <img
                src="/logo_mmsu.png"
                alt="Mariano Marcos State University Logo"
                className="h-12 sm:h-14 w-auto object-contain"
              />
              <img
                src="/logo_ccis.png"
                alt="CCIS Logo"
                className="h-12 sm:h-14 w-auto object-contain"
              />
              <img
                src="/ndrrmc-logo.png"
                alt="Batac CDRRMO Emblem"
                className="h-11 sm:h-13 w-auto object-contain hidden sm:block"
              />
            </div>
            <div className="border-l border-slate-300 pl-4 space-y-0.5">
              <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[#0038A8]">
                Mariano Marcos State University • College of Computing and Information Sciences
              </p>
              <h1 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight leading-snug">
                Disaster Relief &amp; Resource Management System
              </h1>
              <p className="text-xs text-slate-600 font-medium">
                City Disaster Risk Reduction and Management Office (CDRRMO) — City of Batac, Ilocos Norte
              </p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowTracker(true)}
              className="interactive-lift inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-300 transition-colors shadow-sm"
            >
              <Search className="h-3.5 w-3.5 text-[#0038A8]" aria-hidden="true" />
              <span>Public Aid Delivery Tracker</span>
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          3. MAIN CONTENT: 2-COLUMN INSTITUTIONAL LAYOUT
          ========================================================================= */}
      <main className="max-w-7xl mx-auto w-full flex-1 px-4 sm:px-8 py-8 sm:py-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: Institutional Notices & Public Advisory (Cols 1-7) */}
        <div ref={infoCardsRef} className="stagger-grid lg:col-span-7 space-y-5">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-3.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-[#0038A8] text-xs font-bold">
              <ShieldCheck className="h-4 w-4 text-[#0038A8]" aria-hidden="true" />
              Republic Act No. 10121 • Information Management Framework
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug">
              Centralized Disaster Relief Logistics &amp; Resource Allocation Portal
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Welcome to the official operational portal of the <strong>City of Batac Disaster Relief Coordination Unit</strong>. 
              This system provides an authoritative, Third Normal Form (3NF) single source of truth connecting the City Government, 
              the <strong>43 official Barangays of Batac</strong>, accredited humanitarian non-governmental organizations, 
              citizen and corporate donors, and field dispatch volunteers.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1 transition-colors hover:border-blue-200">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
                  <Warehouse className="h-4 w-4 text-[#0038A8]" aria-hidden="true" />
                  <span>Central Logistics Depot</span>
                </div>
                <p className="text-xs text-slate-600">
                  Batac City Evacuation Center (Quiling Sur) and Government Center Auxiliary Logistics Depot.
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1 transition-colors hover:border-emerald-200">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
                  <Building2 className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                  <span>43 Accredited Barangays</span>
                </div>
                <p className="text-xs text-slate-600">
                  Real-time emergency requisitions for flood-prone and rural communities across Batac City.
                </p>
              </div>
            </div>
          </div>

          {/* Operational Advisory & Hotline Notice */}
          <div className="bg-amber-50 rounded-xl border border-amber-200/80 p-4.5 text-xs text-amber-950 space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-900 text-sm">
              <AlertCircle className="h-4 w-4 text-amber-700 shrink-0" aria-hidden="true" />
              <span>Official Emergency Coordination Advisory</span>
            </div>
            <p className="leading-relaxed text-amber-900/90 text-xs">
              During declared calamities (e.g. Quiaoit River swelling or localized typhoon emergencies), barangay officials are requested 
              to submit relief requisitions directly via their assigned <strong>Brgy. Council accounts</strong>. In-kind donors can review real-time 
              warehouse replenishment thresholds prior to dispatching relief goods.
            </p>
            <div className="pt-0.5 flex flex-wrap items-center gap-4 text-amber-900 font-medium text-[11px]">
              <span>📞 CDRRMO Operations Desk: <strong>(077) 792-3049</strong></span>
              <span>📱 Hotlines: <strong>0917-000-0001 / 0918-100-0001</strong></span>
            </div>
          </div>

          {/* Public Aid Tracker Quick Banner for Mobile / Non-Auth Users */}
          <div className="bg-[#0B192C] text-white rounded-xl p-4.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 font-bold text-sm text-amber-400">
                <Search className="h-4 w-4" aria-hidden="true" />
                <span>Public Relief Shipment Tracker</span>
              </div>
              <p className="text-xs text-slate-300 max-w-md">
                Track the transit and delivery status of ongoing humanitarian relief convoys without logging in.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowTracker(true)}
              className="track-aid-btn interactive-lift px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition shadow shrink-0"
            >
              Verify Shipment
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: Official Government Login / Registration Card (Cols 8-12) */}
        <div className="lg:col-span-5 w-full">
          <div className="bg-white rounded-xl border border-slate-300 shadow-sm p-6 sm:p-7 space-y-5">
            {/* Header / Mode Switch Tabs */}
            <div className="space-y-3.5">
              <div className="border-b border-slate-200 pb-3">
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  {mode === "login" ? "Authorized Portal Access" : "Register Stakeholder Account"}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {mode === "login" 
                    ? "Please enter your official credentials to proceed." 
                    : "Create an accredited account for disaster response coordination."}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1 border border-slate-200">
                <button
                  type="button"
                  aria-pressed={mode === "login"}
                  onClick={() => {
                    setMode("login");
                    setErrorMsg("");
                    setSuccessMsg("");
                  }}
                  className={`py-2 text-xs font-bold rounded-md transition-all ${
                    mode === "login"
                      ? "bg-[#0038A8] text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  aria-pressed={mode === "register"}
                  onClick={() => {
                    setMode("register");
                    setErrorMsg("");
                    setSuccessMsg("");
                  }}
                  className={`py-2 text-xs font-bold rounded-md transition-all ${
                    mode === "register"
                      ? "bg-[#0038A8] text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  New Registration
                </button>
              </div>
            </div>

            {/* Error & Success Alerts */}
            {errorMsg && (
              <div role="alert" className="toast-enter p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
                <span className="leading-relaxed">{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div role="status" className="toast-enter p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
                <span className="leading-relaxed">{successMsg}</span>
              </div>
            )}

            {/* =============================================================
                MODE 1: SECURE LOGIN FORM
                ============================================================= */}
            {mode === "login" && (
              <form key="login-form" onSubmit={handleLogin} className="tab-panel-enter space-y-4">
                <div>
                  <label htmlFor="login-username" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Username or Verified Email
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                      <User className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <input
                      id="login-username"
                      type="text"
                      required
                      autoComplete="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g. admin or org1"
                      className="auth-input w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 focus:border-[#0038A8] focus:ring-1 focus:ring-[#0038A8] transition bg-white text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="login-password" className="block text-xs font-semibold text-slate-700">
                      Password
                    </label>
                  </div>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                      <Lock className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <input
                      id="login-password"
                      type={showLoginPass ? "text" : "password"}
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      className="auth-input w-full pl-9 pr-10 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 focus:border-[#0038A8] focus:ring-1 focus:ring-[#0038A8] transition bg-white text-slate-900"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPass(!showLoginPass)}
                      aria-label={showLoginPass ? "Hide password" : "Show password"}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 transition-colors"
                    >
                      {showLoginPass ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-600">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-slate-300 text-[#0038A8] focus:ring-[#0038A8]"
                    />
                    <span>Remember session on this computer</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="interactive-lift w-full py-2.5 px-4 rounded-lg bg-[#0038A8] hover:bg-[#002776] text-white text-xs sm:text-sm font-bold shadow-sm transition-colors disabled:opacity-50"
                >
                  {submitting ? "Authenticating..." : "Sign In to DRRMS Portal"}
                </button>

                {/* Academic Evaluation Accordion (Clean & Human-designed for Defense) */}
                <details className="mt-4 pt-3 border-t border-slate-200 text-xs text-slate-600 group">
                  <summary className="cursor-pointer font-semibold text-slate-700 hover:text-[#0038A8] select-none flex items-center justify-between list-none">
                    <span className="inline-flex items-center gap-1.5">
                      <Info className="h-3.5 w-3.5 text-[#0038A8]" aria-hidden="true" />
                      <span>Academic Evaluation &amp; Seed Accounts</span>
                    </span>
                    <span className="text-[10px] text-slate-400 group-open:rotate-180 transition-transform" aria-hidden="true">▼</span>
                  </summary>
                  <div className="mt-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2 text-[11px]">
                    <p className="text-slate-500">Click any role to populate credentials:</p>
                    <div ref={quickRolesRef} className="stagger-grid grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => fillQuickAccount("admin", "admin123")}
                        className="interactive-lift text-left p-2 rounded bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 transition text-slate-800 font-medium"
                      >
                        <strong className="text-[#0038A8] block">System Admin</strong>
                        <code>admin</code> / <code>admin123</code>
                      </button>

                      <button
                        type="button"
                        onClick={() => fillQuickAccount("org19", "pass123")}
                        className="interactive-lift text-left p-2 rounded bg-white hover:bg-amber-50 border border-slate-200 hover:border-amber-300 transition text-slate-800 font-medium"
                      >
                        <strong className="text-amber-800 block">Brgy. Quiling Sur (MMSU)</strong>
                        <code>org19</code> / <code>pass123</code>
                      </button>

                      <button
                        type="button"
                        onClick={() => fillQuickAccount("donor1", "pass123")}
                        className="interactive-lift text-left p-2 rounded bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-300 transition text-slate-800 font-medium"
                      >
                        <strong className="text-rose-700 block">Citizen Donor</strong>
                        <code>donor1</code> / <code>pass123</code>
                      </button>

                      <button
                        type="button"
                        onClick={() => fillQuickAccount("vol1", "pass123")}
                        className="interactive-lift text-left p-2 rounded bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 transition text-slate-800 font-medium"
                      >
                        <strong className="text-emerald-800 block">Field Volunteer</strong>
                        <code>vol1</code> / <code>pass123</code>
                      </button>
                    </div>
                  </div>
                </details>
              </form>
            )}

            {/* =============================================================
                MODE 2: STAKEHOLDER REGISTRATION
                ============================================================= */}
            {mode === "register" && regStep === "form" && (
              <form key="register-form" onSubmit={handleRegister} className="tab-panel-enter space-y-3.5">
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label htmlFor="reg-username" className="block text-[11px] font-semibold text-slate-700 mb-1">Username</label>
                    <input
                      id="reg-username"
                      type="text"
                      required
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value)}
                      placeholder="e.g. jdelacruz"
                      className="auth-input w-full px-3 py-1.5 text-xs rounded border border-slate-300 focus:border-[#0038A8]"
                    />
                  </div>
                  <div>
                    <label htmlFor="reg-email" className="block text-[11px] font-semibold text-slate-700 mb-1">Email Address</label>
                    <input
                      id="reg-email"
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="name@domain.com"
                      className="auth-input w-full px-3 py-1.5 text-xs rounded border border-slate-300 focus:border-[#0038A8]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label htmlFor="reg-fullname" className="block text-[11px] font-semibold text-slate-700 mb-1">Full Name / Contact Person</label>
                    <input
                      id="reg-fullname"
                      type="text"
                      required
                      value={regFullName}
                      onChange={(e) => setRegFullName(e.target.value)}
                      placeholder="Full Name"
                      className="auth-input w-full px-3 py-1.5 text-xs rounded border border-slate-300 focus:border-[#0038A8]"
                    />
                  </div>
                  <div>
                    <label htmlFor="reg-contact" className="block text-[11px] font-semibold text-slate-700 mb-1">Contact Number</label>
                    <input
                      id="reg-contact"
                      type="text"
                      required
                      value={regContactInfo}
                      onChange={(e) => setRegContactInfo(e.target.value)}
                      placeholder="0917-xxx-xxxx"
                      className="auth-input w-full px-3 py-1.5 text-xs rounded border border-slate-300 focus:border-[#0038A8]"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="reg-password" className="block text-[11px] font-semibold text-slate-700 mb-1">Password (min 6 chars)</label>
                  <div className="relative">
                    <input
                      id="reg-password"
                      type={showRegPass ? "text" : "password"}
                      required
                      minLength={6}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="auth-input w-full pl-3 pr-8 py-1.5 text-xs rounded border border-slate-300 focus:border-[#0038A8]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPass(!showRegPass)}
                      aria-label={showRegPass ? "Hide password" : "Show password"}
                      className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-700 transition-colors"
                    >
                      {showRegPass ? <EyeOff className="h-3.5 w-3.5" aria-hidden="true" /> : <Eye className="h-3.5 w-3.5" aria-hidden="true" />}
                    </button>
                  </div>
                </div>

                {/* Role Selection */}
                <div>
                  <label htmlFor="reg-role" className="block text-[11px] font-semibold text-slate-700 mb-1">Stakeholder Classification</label>
                  <select
                    id="reg-role"
                    value={regRole}
                    onChange={(e: any) => setRegRole(e.target.value)}
                    className="auth-input w-full px-3 py-1.5 text-xs rounded border border-slate-300 bg-white focus:border-[#0038A8]"
                  >
                    <option value="Donor">Citizen / Corporate Donor</option>
                    <option value="Organization">Barangay Council / Partner NGO</option>
                    <option value="Volunteer">Registered Logistics Volunteer</option>
                  </select>
                </div>

                {/* Conditional Fields based on Role */}
                {regRole === "Donor" && (
                  <div className="toast-enter">
                    <label htmlFor="reg-donor-type" className="block text-[11px] font-semibold text-slate-700 mb-1">Donor Entity Type</label>
                    <select
                      id="reg-donor-type"
                      value={regDonorType}
                      onChange={(e: any) => setRegDonorType(e.target.value)}
                      className="auth-input w-full px-3 py-1.5 text-xs rounded border border-slate-300 bg-white focus:border-[#0038A8]"
                    >
                      <option value="Individual">Individual Citizen</option>
                      <option value="Corporate">Corporate / Business Donor</option>
                    </select>
                  </div>
                )}

                {regRole === "Organization" && (
                  <div className="toast-enter grid grid-cols-2 gap-2.5">
                    <div>
                      <label htmlFor="reg-org-name" className="block text-[11px] font-semibold text-slate-700 mb-1">Organization / Council Name</label>
                      <input
                        id="reg-org-name"
                        type="text"
                        value={regOrgName}
                        onChange={(e) => setRegOrgName(e.target.value)}
                        placeholder="e.g. Brgy. Council"
                        className="auth-input w-full px-3 py-1.5 text-xs rounded border border-slate-300 focus:border-[#0038A8]"
                      />
                    </div>
                    <div>
                      <label htmlFor="reg-location" className="block text-[11px] font-semibold text-slate-700 mb-1">Location / Barangay</label>
                      <input
                        id="reg-location"
                        type="text"
                        value={regLocation}
                        onChange={(e) => setRegLocation(e.target.value)}
                        placeholder="City of Batac, Ilocos Norte"
                        className="auth-input w-full px-3 py-1.5 text-xs rounded border border-slate-300 focus:border-[#0038A8]"
                      />
                    </div>
                  </div>
                )}

                {regRole === "Volunteer" && (
                  <div className="toast-enter">
                    <label htmlFor="reg-vehicle-type" className="block text-[11px] font-semibold text-slate-700 mb-1">Logistics Vehicle Mode</label>
                    <select
                      id="reg-vehicle-type"
                      value={regVehicleType}
                      onChange={(e) => setRegVehicleType(e.target.value)}
                      className="auth-input w-full px-3 py-1.5 text-xs rounded border border-slate-300 bg-white focus:border-[#0038A8]"
                    >
                      <option value="Pickup Truck">Pickup Truck</option>
                      <option value="Cargo Van">Cargo Van</option>
                      <option value="Multicab">Multicab</option>
                      <option value="Light Truck">Light Truck</option>
                      <option value="Motorcycle">Motorcycle (Rapid Courier)</option>
                    </select>
                  </div>
                )}

                <div className="text-[11px] text-slate-500 pt-1">
                  By registering, you agree to provide accurate information under Republic Act No. 10173 (Data Privacy Act of 2012).
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="interactive-lift w-full py-2.5 px-4 rounded-lg bg-[#0038A8] hover:bg-[#002776] text-white text-xs sm:text-sm font-bold shadow-sm transition-colors disabled:opacity-50"
                >
                  {submitting ? "Submitting Application..." : "Register Accredited Account"}
                </button>
              </form>
            )}

            {/* =============================================================
                MODE 2 STEP 2: EMAIL OTP VERIFICATION
                ============================================================= */}
            {mode === "register" && regStep === "otp" && (
              <form key="register-otp" onSubmit={handleVerifyOtp} className="tab-panel-enter space-y-4">
                <div className="p-3.5 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-900 space-y-1">
                  <p className="font-bold">Two-Factor Identity Verification</p>
                  <p className="text-slate-600">
                    A 6-digit confirmation code has been dispatched to <strong>{pendingEmail}</strong>. Please input the code below.
                  </p>
                </div>

                <div>
                  <label htmlFor="otp-code" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    6-Digit Verification Code
                  </label>
                  <input
                    id="otp-code"
                    type="text"
                    maxLength={6}
                    required
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="123456"
                    className="auth-input w-full py-2.5 text-center text-xl font-mono tracking-widest rounded-lg border border-slate-300 focus:border-[#0038A8] focus:ring-1 focus:ring-[#0038A8] bg-white text-slate-900"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="interactive-lift w-full py-2.5 px-4 rounded-lg bg-[#0038A8] hover:bg-[#002776] text-white text-xs sm:text-sm font-bold shadow-sm transition-colors disabled:opacity-50"
                >
                  {submitting ? "Verifying..." : "Confirm & Enter Portal"}
                </button>

                <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
                  <button
                    type="button"
                    disabled={resendCooldown > 0 || resending}
                    onClick={handleResendOtp}
                    className="text-[#0038A8] hover:underline disabled:text-slate-400 font-semibold"
                  >
                    {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend code"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRegStep("form")}
                    className="text-slate-600 hover:underline"
                  >
                    Edit Registration Details
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>

      {/* =========================================================================
          4. OFFICIAL PHILIPPINE GOVERNMENT FOOTER (GOVPH STANDARD)
          ========================================================================= */}
      <footer className="bg-white border-t border-slate-200 mt-auto py-5 px-4 sm:px-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <div className="space-y-0.5">
            <p className="font-bold text-slate-700">
              Disaster Relief &amp; Resource Management System (DRRMS) — Phase 1 Information Management
            </p>
            <p className="text-slate-500 text-[11px]">
              Mariano Marcos State University • College of Computing and Information Sciences • City of Batac, Ilocos Norte 2906
            </p>
          </div>
          <div className="text-[11px] text-slate-500 leading-snug md:text-right max-w-md">
            Compliant with <strong>Republic Act No. 10173</strong> (Data Privacy Act of 2012) and <strong>Republic Act No. 10121</strong> (Philippine Disaster Risk Reduction and Management Act).
          </div>
        </div>
      </footer>

      {/* Public Aid Tracker Modal */}
      {showTracker && <PublicAidTrackerModal onClose={() => setShowTracker(false)} />}
    </div>
  );
}
