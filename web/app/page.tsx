"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  HeartHandshake,
  Building2,
  Truck,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  MailCheck,
  RotateCcw,
  ArrowLeft,
  PhoneCall,
  PackageCheck,
  User,
  Lock,
  Mail,
  Phone,
  MapPin,
  Search,
} from "lucide-react";
import { apiFetch, saveSession, UserSession } from "@/lib/api";
import { PublicAidTrackerModal } from "@/components/DisasterEnhancements";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [showTracker, setShowTracker] = useState(false);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showLoginPass, setShowLoginPass] = useState(false);

  const [regStep, setRegStep] = useState<"form" | "verify">("form");
  const [regUsername, setRegUsername] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [showRegPass, setShowRegPass] = useState(false);
  const [regFullName, setRegFullName] = useState("");
  const [regContactInfo, setRegContactInfo] = useState("");
  const [regRole, setRegRole] = useState<
    "Donor" | "Organization" | "Volunteer"
  >("Donor");
  const [regDonorType, setRegDonorType] = useState("Individual");
  const [regOrgName, setRegOrgName] = useState("");
  const [regLocation, setRegLocation] = useState("");
  const [regVehicleType, setRegVehicleType] = useState("Van");

  const [pendingEmail, setPendingEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const syncAriaValidity = (el: HTMLInputElement) => {
    try {
      el.setAttribute(
        "aria-invalid",
        el.matches(":user-invalid") ? "true" : "false"
      );
    } catch {
      el.setAttribute("aria-invalid", el.checkValidity() ? "false" : "true");
    }
  };

  const handleFieldBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    syncAriaValidity(e.currentTarget);
  };

  const routeByRole = (session: UserSession) => {
    const role = (session.user.role || "").toLowerCase();
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
      setErrorMsg("Username or email and password are required.");
      return;
    }
    setSubmitting(true);
    try {
      const session = await apiFetch<UserSession>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username: username.trim(), password }),
      });
      saveSession(session);
      routeByRole(session);
    } catch (err: any) {
      setErrorMsg(err.message || "Invalid username or password.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickDemo = async (demoUser: string, demoPass: string) => {
    setUsername(demoUser);
    setPassword(demoPass);
    setErrorMsg("");
    setSuccessMsg("");
    setSubmitting(true);
    try {
      const session = await apiFetch<UserSession>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username: demoUser, password: demoPass }),
      });
      saveSession(session);
      routeByRole(session);
    } catch (err: any) {
      setErrorMsg(err.message || "Quick sign-in failed.");
    } finally {
      setSubmitting(false);
    }
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
          location: regLocation.trim(),
          vehicleType: regVehicleType,
        }),
      });
      setPendingEmail(res.email || trimmedEmail);
      setOtpCode("");
      setRegStep("verify");
      setResendCooldown(45);
      setSuccessMsg(
        res.message ||
          `Verification code sent to ${res.email || trimmedEmail}.`
      );
    } catch (err: any) {
      setErrorMsg(err.message || "Registration failed.");
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
      setSuccessMsg("Email verified! Signing you in...");
      saveSession(session);
      routeByRole(session);
    } catch (err: any) {
      setErrorMsg(err.message || "Verification failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    if (!pendingEmail || resending || resendCooldown > 0) return;
    setErrorMsg("");
    setSuccessMsg("");
    setResending(true);
    try {
      const res = await apiFetch<{ message?: string }>("/api/auth/resend-otp", {
        method: "POST",
        body: JSON.stringify({ email: pendingEmail }),
      });
      setResendCooldown(45);
      setSuccessMsg(
        res.message || `A new 6-digit verification code was sent to ${pendingEmail}.`
      );
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to resend verification code.");
    } finally {
      setResending(false);
    }
  };

  return (
    <main className="min-h-screen w-full flex flex-col lg:flex-row bg-[#06101E]">
      {/* LEFT PANEL: Official NDRRMC Hero & Operations Dashboard */}
      <div className="w-full lg:w-[48%] xl:w-[46%] shrink-0 relative overflow-hidden bg-gradient-to-br from-[#06101E] via-[#0C1A34] to-[#122850] text-white p-8 lg:p-12 xl:p-14 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-800/80 shadow-2xl">
        {/* Crisp Crisis Response Grid Pattern */}
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.05] stroke-white"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="drrm-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#drrm-grid)" />
        </svg>

        {/* Ambient atmospheric glow lights */}
        <div className="pointer-events-none absolute -top-24 -left-24 h-[420px] w-[420px] rounded-full bg-blue-600/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-[380px] w-[380px] rounded-full bg-amber-500/15 blur-3xl" />
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-cyan-400/10 blur-3xl" />

        {/* Faint watermark of NDRRMC Seal in the background */}
        <div className="pointer-events-none absolute right-[-70px] bottom-[-70px] opacity-[0.06] select-none">
          <img
            src="/ndrrmc-logo.png"
            alt=""
            className="w-[500px] h-[500px] object-contain filter invert"
          />
        </div>

        {/* Top Branding */}
        <div className="relative z-10 space-y-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-white p-2 shadow-[0_10px_25px_rgba(37,99,235,0.35)] ring-2 ring-white/30 flex items-center justify-center shrink-0">
              <img
                src="/ndrrmc-logo.png"
                alt="NDRRMC Logo"
                className="h-full w-full object-contain"
              />
            </div>
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-gradient-to-r from-blue-500/20 via-indigo-500/20 to-blue-500/20 border border-blue-400/30 text-[11px] font-semibold text-blue-300 shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
                Republic of the Philippines
              </div>
              <p className="text-base sm:text-lg font-bold tracking-tight text-white leading-tight">
                Disaster Relief &amp; Resource Management
              </p>
              <p className="text-xs text-slate-300">
                National Disaster Risk Reduction &amp; Management Council
              </p>
            </div>
          </div>

          {/* Hero Headline */}
          <div className="pt-3 lg:pt-5">
            <h1 className="text-2xl sm:text-3xl xl:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Centralized Humanitarian Relief Coordination
            </h1>
          </div>

          {/* Value Pillars (Clean icon + title) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="rounded-2xl bg-white/[0.07] hover:bg-white/[0.11] border border-white/10 hover:border-blue-400/40 p-3.5 backdrop-blur-md transition-all duration-300 shadow-lg group flex items-center gap-3 sm:block">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/30 group-hover:scale-105 transition-transform shrink-0 sm:mb-2">
                <PackageCheck className="h-4.5 w-4.5" aria-hidden="true" />
              </div>
              <h2 className="text-xs font-bold text-white">Verified Aid Tracking</h2>
            </div>

            <div className="rounded-2xl bg-white/[0.07] hover:bg-white/[0.11] border border-white/10 hover:border-emerald-400/40 p-3.5 backdrop-blur-md transition-all duration-300 shadow-lg group flex items-center gap-3 sm:block">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/30 group-hover:scale-105 transition-transform shrink-0 sm:mb-2">
                <Truck className="h-4.5 w-4.5" aria-hidden="true" />
              </div>
              <h2 className="text-xs font-bold text-white">Volunteer Dispatch</h2>
            </div>

            <div className="rounded-2xl bg-white/[0.07] hover:bg-white/[0.11] border border-white/10 hover:border-amber-400/40 p-3.5 backdrop-blur-md transition-all duration-300 shadow-lg group flex items-center gap-3 sm:block">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-md shadow-amber-500/30 group-hover:scale-105 transition-transform shrink-0 sm:mb-2">
                <Building2 className="h-4.5 w-4.5" aria-hidden="true" />
              </div>
              <h2 className="text-xs font-bold text-white">LGU Requisitions</h2>
            </div>
          </div>

          {/* Live DRRM Operational Metrics Strip (Matches the Live Dashboard Stats!) */}
          <div className="pt-2">
            <div className="grid grid-cols-4 gap-2 rounded-2xl bg-white/[0.06] border border-white/15 p-3 backdrop-blur-md shadow-inner">
              <div className="text-center">
                <p className="text-base sm:text-lg font-black text-rose-400">5</p>
                <p className="text-[10px] uppercase tracking-wider text-slate-300 font-semibold">Calamities</p>
              </div>
              <div className="text-center border-l border-white/10">
                <p className="text-base sm:text-lg font-black text-blue-400">13</p>
                <p className="text-[10px] uppercase tracking-wider text-slate-300 font-semibold">Pledges</p>
              </div>
              <div className="text-center border-l border-white/10">
                <p className="text-base sm:text-lg font-black text-amber-400">10</p>
                <p className="text-[10px] uppercase tracking-wider text-slate-300 font-semibold">Stock Items</p>
              </div>
              <div className="text-center border-l border-white/10">
                <p className="text-base sm:text-lg font-black text-emerald-400">10</p>
                <p className="text-[10px] uppercase tracking-wider text-slate-300 font-semibold">Fleet Units</p>
              </div>
            </div>

            {/* Public Transparency Aid Tracker Launch Bar */}
            <div className="mt-3 w-full rounded-2xl bg-gradient-to-r from-blue-600/30 via-indigo-600/30 to-emerald-600/25 border border-blue-400/35 px-3.5 py-3 flex items-center justify-between gap-3 backdrop-blur-md shadow-lg">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-xl bg-blue-500/30 border border-blue-300/40 flex items-center justify-center text-blue-200 shrink-0">
                  <Search className="h-4 w-4" aria-hidden="true" />
                </div>
                <span className="text-xs font-extrabold text-white leading-snug">
                  Public Relief Shipment &amp; Donation Tracker
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowTracker(true)}
                className="track-aid-btn shrink-0 min-h-[38px] rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.97] border border-emerald-300/70 px-4 py-2 text-xs font-bold text-slate-950 shadow-md shadow-emerald-500/25 hover:shadow-lg hover:shadow-emerald-400/30 transition-[background-color,box-shadow,transform] duration-150"
              >
                Track Aid
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Hotline Strip */}
        <div className="relative z-10 pt-5 mt-6 border-t border-slate-800/80">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-300 text-[11px]">
              <PhoneCall className="h-3.5 w-3.5 text-rose-400" aria-hidden="true" />
              <span>National Emergency Hotline: <strong className="text-white">911</strong></span>
              <span className="text-slate-600">|</span>
              <span>NDRRMC Operations: <strong className="text-white">(02) 8911-5061</strong></span>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">RA 10121 Mandated</span>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: Authentication Form with 3D Card Flip */}
      <div className="flex-1 bg-gradient-to-br from-[#F8FAFC] via-[#EEF4FF] to-[#F1F5F9] flex flex-col justify-center items-center p-6 sm:p-10 lg:p-12 relative overflow-y-auto">
        {/* Soft background ambient blurs */}
        <div className="pointer-events-none absolute -top-32 -right-32 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-indigo-500/10 blur-3xl" />

        {/* Subtle background watermark on right side */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden opacity-[0.035] select-none"
        >
          <img
            src="/ndrrmc-logo.png"
            alt=""
            className="w-[500px] object-contain select-none"
          />
        </div>

        <div className="w-full max-w-[460px] relative z-10 space-y-5 my-auto">
          {/* Header */}
          <div className="text-center lg:text-left">
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
              {mode === "login" ? "Sign In to Stakeholder Portal" : "Create Stakeholder Account"}
            </h2>
          </div>

          {/* 3D Flip Card Container */}
          <div className="perspective-1200 w-full">
            <div
              className={`w-full flip-card-inner relative ${
                mode === "register" ? "rotate-y-180" : ""
              }`}
            >
              {/* FRONT FACE: Sign In */}
              <div
                className={`w-full bg-white/95 backdrop-blur-xl rounded-3xl border border-slate-200/90 shadow-[0_20px_50px_-10px_rgba(30,58,138,0.12),0_1px_3px_rgba(0,0,0,0.05)] p-7 sm:p-8 space-y-5 backface-hidden ${
                  mode === "register"
                    ? "absolute top-0 left-0 pointer-events-none"
                    : "relative pointer-events-auto"
                }`}
              >
                {/* Mode Switch: Sign In on LEFT, Create Account on RIGHT */}
                <div className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-100/90 p-1.5 border border-slate-200/80 shadow-inner">
                  <button
                    type="button"
                    className="rounded-xl py-2.5 text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 transition-all"
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode("register");
                      setErrorMsg("");
                      setSuccessMsg("");
                    }}
                    className="rounded-xl py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 active:scale-[0.98] transition-all"
                  >
                    Create Account
                  </button>
                </div>

                {errorMsg && (
                  <div
                    role="alert"
                    aria-live="assertive"
                    className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700 flex items-center gap-2"
                  >
                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" aria-hidden="true" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {successMsg && (
                  <div
                    role="status"
                    aria-live="polite"
                    className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-700 flex items-center gap-2"
                  >
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" aria-hidden="true" />
                    <span>{successMsg}</span>
                  </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label
                      htmlFor="login-username"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      Username or Email
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                        <User className="h-4 w-4" aria-hidden="true" />
                      </div>
                      <input
                        id="login-username"
                        name="username"
                        type="text"
                        required
                        autoComplete="username"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck={false}
                        enterKeyHint="next"
                        value={username}
                        onChange={(e) => {
                          setUsername(e.target.value);
                          if (errorMsg) setErrorMsg("");
                        }}
                        placeholder="Enter username or verified email"
                        className="auth-input w-full rounded-xl border border-slate-200/90 bg-slate-50/70 focus:bg-white pl-10 pr-3.5 py-2.5 text-base sm:text-sm text-slate-900 focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 focus:outline-none transition shadow-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="login-password"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      Password
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                        <Lock className="h-4 w-4" aria-hidden="true" />
                      </div>
                      <input
                        id="login-password"
                        name="password"
                        type={showLoginPass ? "text" : "password"}
                        required
                        autoComplete="current-password"
                        enterKeyHint="done"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (errorMsg) setErrorMsg("");
                        }}
                        placeholder="Enter password"
                        className="auth-input w-full rounded-xl border border-slate-200/90 bg-slate-50/70 focus:bg-white pl-10 pr-11 py-2.5 text-base sm:text-sm text-slate-900 focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 focus:outline-none transition shadow-sm"
                      />
                      <button
                        type="button"
                        aria-pressed={showLoginPass}
                        aria-label={showLoginPass ? "Hide password" : "Show password"}
                        onClick={() => setShowLoginPass((v) => !v)}
                        className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-700"
                      >
                        {showLoginPass ? (
                          <EyeOff className="h-4 w-4" aria-hidden="true" />
                        ) : (
                          <Eye className="h-4 w-4" aria-hidden="true" />
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full min-h-[46px] rounded-xl bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.98] disabled:opacity-60 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 transition-all flex items-center justify-center gap-2"
                  >
                    <span>{submitting ? "Signing in..." : "Sign In to Portal"}</span>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </form>

                {/* Role Demo Switcher */}
                <div className="pt-4 border-t border-slate-100">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2.5">
                    1-Click Role Switcher
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => handleQuickDemo("admin", "admin123")}
                      className="group flex flex-col items-center gap-1.5 rounded-xl border border-blue-200/90 bg-gradient-to-b from-blue-50/80 to-blue-100/50 hover:from-blue-100 hover:to-blue-200/70 hover:border-blue-500 active:scale-[0.97] hover:shadow-md hover:shadow-blue-500/10 disabled:opacity-50 py-2.5 px-1 transition-all"
                    >
                      <div className="h-8 w-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                        <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                      </div>
                      <span className="block text-[11px] font-bold text-slate-800">
                        Admin
                      </span>
                    </button>

                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => handleQuickDemo("donor1", "pass123")}
                      className="group flex flex-col items-center gap-1.5 rounded-xl border border-rose-200/90 bg-gradient-to-b from-rose-50/80 to-rose-100/50 hover:from-rose-100 hover:to-rose-200/70 hover:border-rose-500 active:scale-[0.97] hover:shadow-md hover:shadow-rose-500/10 disabled:opacity-50 py-2.5 px-1 transition-all"
                    >
                      <div className="h-8 w-8 rounded-lg bg-rose-600 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                        <HeartHandshake className="h-4 w-4" aria-hidden="true" />
                      </div>
                      <span className="block text-[11px] font-bold text-slate-800">
                        Donor
                      </span>
                    </button>

                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => handleQuickDemo("org1", "pass123")}
                      className="group flex flex-col items-center gap-1.5 rounded-xl border border-amber-200/90 bg-gradient-to-b from-amber-50/80 to-amber-100/50 hover:from-amber-100 hover:to-amber-200/70 hover:border-amber-500 active:scale-[0.97] hover:shadow-md hover:shadow-amber-500/10 disabled:opacity-50 py-2.5 px-1 transition-all"
                    >
                      <div className="h-8 w-8 rounded-lg bg-amber-600 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                        <Building2 className="h-4 w-4" aria-hidden="true" />
                      </div>
                      <span className="block text-[11px] font-bold text-slate-800">
                        Org / LGU
                      </span>
                    </button>

                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => handleQuickDemo("vol1", "pass123")}
                      className="group flex flex-col items-center gap-1.5 rounded-xl border border-emerald-200/90 bg-gradient-to-b from-emerald-50/80 to-emerald-100/50 hover:from-emerald-100 hover:to-emerald-200/70 hover:border-emerald-500 active:scale-[0.97] hover:shadow-md hover:shadow-emerald-500/10 disabled:opacity-50 py-2.5 px-1 transition-all"
                    >
                      <div className="h-8 w-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                        <Truck className="h-4 w-4" aria-hidden="true" />
                      </div>
                      <span className="block text-[11px] font-bold text-slate-800">
                        Volunteer
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* BACK FACE: Create Account / Verify OTP */}
              <div
                className={`w-full bg-white/95 backdrop-blur-xl rounded-3xl border border-slate-200/90 shadow-[0_20px_50px_-10px_rgba(30,58,138,0.12),0_1px_3px_rgba(0,0,0,0.05)] p-7 sm:p-8 space-y-5 backface-hidden flip-card-back ${
                  mode === "register"
                    ? "relative pointer-events-auto"
                    : "absolute top-0 left-0 pointer-events-none"
                }`}
              >
                {/* Mode Switch: Sign In on LEFT, Create Account on RIGHT */}
                <div className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-100/90 p-1.5 border border-slate-200/80 shadow-inner">
                  <button
                    type="button"
                    onClick={() => {
                      setMode("login");
                      setErrorMsg("");
                      setSuccessMsg("");
                    }}
                    className="rounded-xl py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 active:scale-[0.98] transition-all"
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    className="rounded-xl py-2.5 text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 transition-all"
                  >
                    Create Account
                  </button>
                </div>

                {errorMsg && (
                  <div
                    role="alert"
                    aria-live="assertive"
                    className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700 flex items-center gap-2"
                  >
                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" aria-hidden="true" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {successMsg && (
                  <div
                    role="status"
                    aria-live="polite"
                    className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-700 flex items-center gap-2"
                  >
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" aria-hidden="true" />
                    <span>{successMsg}</span>
                  </div>
                )}

                {regStep === "verify" ? (
                  <form onSubmit={handleVerifyOtp} className="space-y-4">
                    <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/80 to-indigo-50/60 p-4 flex items-start gap-3 shadow-sm">
                      <div className="rounded-xl bg-blue-600 text-white p-2.5 shrink-0 shadow-md shadow-blue-500/30">
                        <MailCheck className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <div className="text-xs text-slate-700 leading-relaxed">
                        <p className="font-bold text-slate-900 text-sm">
                          Step 2 of 2: Verify Your Email
                        </p>
                        <p className="mt-0.5 text-slate-600">
                          Code sent to{" "}
                          <span className="font-semibold text-blue-700 break-all">
                            {pendingEmail}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="otp-input"
                        className="block text-xs font-semibold text-slate-700 mb-1"
                      >
                        Verification Code
                      </label>
                      <p
                        id="otp-format-hint"
                        className="text-[11px] text-slate-500 mb-2"
                      >
                        Enter the 6-digit code sent to your email (check Spam folder if not in Inbox).
                      </p>
                      <input
                        id="otp-input"
                        name="otp"
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        pattern="\d{6}"
                        maxLength={6}
                        spellCheck={false}
                        enterKeyHint="done"
                        required
                        autoFocus
                        aria-describedby="otp-format-hint"
                        aria-errormessage="otp-error"
                        value={otpCode}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, "").slice(0, 6);
                          setOtpCode(digits);
                          if (errorMsg) setErrorMsg("");
                          if (e.currentTarget.hasAttribute("aria-invalid")) {
                            syncAriaValidity(e.currentTarget);
                          }
                        }}
                        onBlur={handleFieldBlur}
                        placeholder="000000"
                        className="auth-input w-full min-h-[50px] rounded-xl border border-slate-300 bg-slate-50/80 focus:bg-white px-4 py-2.5 text-center font-mono text-lg font-black tracking-[0.4em] text-slate-900 focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 focus:outline-none transition shadow-sm"
                      />
                      <div id="otp-error" className="field-error-msg">
                        Please enter the 6-digit numeric verification code.
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full min-h-[46px] rounded-xl bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.98] disabled:opacity-60 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2"
                    >
                      <span>
                        {submitting
                          ? "Verifying..."
                          : "Verify Email & Create Account"}
                      </span>
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </button>

                    <div className="flex items-center justify-between gap-2 pt-1 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setRegStep("form");
                          setErrorMsg("");
                          setSuccessMsg("");
                        }}
                        className="inline-flex items-center gap-1 font-semibold text-slate-600 hover:text-slate-900 active:scale-[0.98] transition"
                      >
                        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Edit Email / Details</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={resending || resendCooldown > 0}
                        className="inline-flex items-center gap-1 font-bold text-blue-600 hover:text-blue-700 active:scale-[0.98] disabled:text-slate-400 transition"
                      >
                        <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>
                          {resending
                            ? "Sending..."
                            : resendCooldown > 0
                              ? `Resend Code (${resendCooldown}s)`
                              : "Resend Code"}
                        </span>
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleRegister} className="space-y-3.5">
                    <div>
                      <label
                        htmlFor="reg-role"
                        className="block text-xs font-semibold text-slate-700 mb-1"
                      >
                        Account Role
                      </label>
                      <select
                        id="reg-role"
                        name="role"
                        value={regRole}
                        onChange={(e) => setRegRole(e.target.value as any)}
                        className="w-full min-h-[42px] rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 px-3.5 py-2 text-xs font-semibold text-slate-800 transition shadow-sm"
                      >
                        <option value="Donor">Donor (Citizen / Corporate Contributor)</option>
                        <option value="Organization">Organization / LGU (Relief Operations)</option>
                        <option value="Volunteer">Volunteer Driver (Logistics Fleet)</option>
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="reg-email"
                        className="block text-xs font-semibold text-slate-700 mb-0.5"
                      >
                        Email Address
                      </label>
                      <span
                        id="reg-email-hint"
                        className="block text-[11px] text-slate-500 mb-1"
                      >
                        A 6-digit verification code will be sent here.
                      </span>
                      <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                          <Mail className="h-4 w-4" aria-hidden="true" />
                        </div>
                        <input
                          id="reg-email"
                          name="email"
                          type="email"
                          required
                          autoComplete="email"
                          spellCheck={false}
                          enterKeyHint="next"
                          aria-describedby="reg-email-hint"
                          aria-errormessage="reg-email-error"
                          value={regEmail}
                          onChange={(e) => {
                            setRegEmail(e.target.value);
                            if (e.currentTarget.hasAttribute("aria-invalid")) {
                              syncAriaValidity(e.currentTarget);
                            }
                          }}
                          onBlur={handleFieldBlur}
                          placeholder="you@example.com"
                          className="auth-input w-full rounded-xl border border-slate-200/90 bg-slate-50/70 focus:bg-white pl-10 pr-3.5 py-2 text-base sm:text-xs text-slate-900 focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 focus:outline-none transition shadow-sm"
                        />
                      </div>
                      <div id="reg-email-error" className="field-error-msg">
                        Please enter a valid email address.
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label
                          htmlFor="reg-username"
                          className="block text-xs font-semibold text-slate-700 mb-0.5"
                        >
                          Username
                        </label>
                        <span
                          id="reg-username-hint"
                          className="block text-[10px] text-slate-400 mb-1"
                        >
                          3-50 chars, no spaces.
                        </span>
                        <div className="relative">
                          <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                            <User className="h-3.5 w-3.5" aria-hidden="true" />
                          </div>
                          <input
                            id="reg-username"
                            name="username"
                            type="text"
                            required
                            minLength={3}
                            maxLength={50}
                            pattern="[^\s@]{3,50}"
                            autoComplete="username"
                            autoCorrect="off"
                            autoCapitalize="off"
                            spellCheck={false}
                            enterKeyHint="next"
                            aria-describedby="reg-username-hint"
                            aria-errormessage="reg-username-error"
                            value={regUsername}
                            onChange={(e) => {
                              setRegUsername(e.target.value);
                              if (e.currentTarget.hasAttribute("aria-invalid")) {
                                syncAriaValidity(e.currentTarget);
                              }
                            }}
                            onBlur={handleFieldBlur}
                            className="auth-input w-full rounded-xl border border-slate-200/90 bg-slate-50/70 focus:bg-white pl-9 pr-3 py-2 text-base sm:text-xs text-slate-900 focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 focus:outline-none transition shadow-sm"
                          />
                        </div>
                        <div id="reg-username-error" className="field-error-msg">
                          3-50 chars without spaces.
                        </div>
                      </div>
                      <div>
                        <label
                          htmlFor="reg-password"
                          className="block text-xs font-semibold text-slate-700 mb-0.5"
                        >
                          Password
                        </label>
                        <span
                          id="reg-password-help"
                          className="block text-[10px] text-slate-400 mb-1"
                        >
                          At least 6 characters.
                        </span>
                        <div className="relative">
                          <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                            <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                          </div>
                          <input
                            id="reg-password"
                            name="password"
                            type={showRegPass ? "text" : "password"}
                            required
                            minLength={6}
                            autoComplete="new-password"
                            enterKeyHint="next"
                            aria-describedby="reg-password-help"
                            aria-errormessage="reg-password-error"
                            value={regPassword}
                            onChange={(e) => {
                              setRegPassword(e.target.value);
                              if (e.currentTarget.hasAttribute("aria-invalid")) {
                                syncAriaValidity(e.currentTarget);
                              }
                            }}
                            onBlur={handleFieldBlur}
                            className="auth-input w-full rounded-xl border border-slate-200/90 bg-slate-50/70 focus:bg-white pl-9 pr-9 py-2 text-base sm:text-xs text-slate-900 focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 focus:outline-none transition shadow-sm"
                          />
                          <button
                            type="button"
                            aria-pressed={showRegPass}
                            aria-label={
                              showRegPass ? "Hide password" : "Show password"
                            }
                            onClick={() => setShowRegPass((v) => !v)}
                            className="absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400 hover:text-slate-700"
                          >
                            {showRegPass ? (
                              <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                            ) : (
                              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                            )}
                          </button>
                        </div>
                        <div id="reg-password-error" className="field-error-msg">
                          Minimum 6 characters required.
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label
                          htmlFor="reg-fullname"
                          className="block text-xs font-semibold text-slate-700 mb-1"
                        >
                          Full Name
                        </label>
                        <input
                          id="reg-fullname"
                          name="fullName"
                          type="text"
                          required
                          autoComplete="name"
                          enterKeyHint="next"
                          value={regFullName}
                          onChange={(e) => setRegFullName(e.target.value)}
                          onBlur={handleFieldBlur}
                          className="auth-input w-full rounded-xl border border-slate-200/90 bg-slate-50/70 focus:bg-white px-3.5 py-2 text-base sm:text-xs text-slate-900 focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 focus:outline-none transition shadow-sm"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="reg-contact"
                          className="block text-xs font-semibold text-slate-700 mb-1"
                        >
                          Phone Number
                        </label>
                        <div className="relative">
                          <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                            <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                          </div>
                          <input
                            id="reg-contact"
                            name="contactInfo"
                            type="tel"
                            autoComplete="tel"
                            enterKeyHint="next"
                            placeholder="0917-000-0000"
                            value={regContactInfo}
                            onChange={(e) => setRegContactInfo(e.target.value)}
                            className="auth-input w-full rounded-xl border border-slate-200/90 bg-slate-50/70 focus:bg-white pl-9 pr-3.5 py-2 text-base sm:text-xs text-slate-900 focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 focus:outline-none transition shadow-sm"
                          />
                        </div>
                      </div>
                    </div>

                    {regRole === "Donor" && (
                      <div>
                        <label
                          htmlFor="reg-donor-type"
                          className="block text-xs font-semibold text-slate-700 mb-1"
                        >
                          Donor Type
                        </label>
                        <select
                          id="reg-donor-type"
                          name="donorType"
                          value={regDonorType}
                          onChange={(e) => setRegDonorType(e.target.value)}
                          className="w-full min-h-[40px] rounded-xl border border-slate-200/90 bg-slate-50/70 focus:bg-white focus:border-blue-600 px-3.5 py-2 text-xs font-semibold text-slate-800 shadow-sm"
                        >
                          <option value="Individual">Individual Donor</option>
                          <option value="Corporate">Corporate / Foundation Sponsor</option>
                        </select>
                      </div>
                    )}

                    {regRole === "Organization" && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label
                            htmlFor="reg-org-name"
                            className="block text-xs font-semibold text-slate-700 mb-1"
                          >
                            Organization Name
                          </label>
                          <input
                            id="reg-org-name"
                            name="orgName"
                            type="text"
                            required
                            value={regOrgName}
                            onChange={(e) => setRegOrgName(e.target.value)}
                            onBlur={handleFieldBlur}
                            className="auth-input w-full rounded-xl border border-slate-200/90 bg-slate-50/70 focus:bg-white px-3.5 py-2 text-base sm:text-xs text-slate-900 focus:border-blue-600 focus:outline-none shadow-sm"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="reg-location"
                            className="block text-xs font-semibold text-slate-700 mb-1"
                          >
                            Location
                          </label>
                          <div className="relative">
                            <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                            </div>
                            <input
                              id="reg-location"
                              name="location"
                              type="text"
                              required
                              value={regLocation}
                              onChange={(e) => setRegLocation(e.target.value)}
                              onBlur={handleFieldBlur}
                              className="auth-input w-full rounded-xl border border-slate-200/90 bg-slate-50/70 focus:bg-white pl-9 pr-3.5 py-2 text-base sm:text-xs text-slate-900 focus:border-blue-600 focus:outline-none shadow-sm"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {regRole === "Volunteer" && (
                      <div>
                        <label
                          htmlFor="reg-vehicle"
                          className="block text-xs font-semibold text-slate-700 mb-1"
                        >
                          Vehicle
                        </label>
                        <select
                          id="reg-vehicle"
                          name="vehicleType"
                          value={regVehicleType}
                          onChange={(e) => setRegVehicleType(e.target.value)}
                          className="w-full min-h-[40px] rounded-xl border border-slate-200/90 bg-slate-50/70 focus:bg-white focus:border-blue-600 px-3.5 py-2 text-xs font-semibold text-slate-800 shadow-sm"
                        >
                          <option value="Truck">Relief Truck (Heavy Cargo)</option>
                          <option value="Van">Logistics Van</option>
                          <option value="Pickup / 4x4">Pickup / 4x4 (Rough Terrain)</option>
                          <option value="Motorcycle">Motorcycle (Express Dispatch)</option>
                          <option value="Boat / Watercraft">Boat / Rescue Watercraft</option>
                        </select>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full min-h-[46px] rounded-xl bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.98] disabled:opacity-60 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2"
                    >
                      <span>
                        {submitting
                          ? "Sending Verification Code..."
                          : "Send Verification Code"}
                      </span>
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </button>

                    <div className="text-center pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setMode("login");
                          setErrorMsg("");
                          setSuccessMsg("");
                        }}
                        className="text-xs text-blue-600 hover:text-blue-800 active:scale-[0.98] font-bold transition"
                      >
                        Already have an account? Sign In
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showTracker && (
        <PublicAidTrackerModal onClose={() => setShowTracker(false)} />
      )}
    </main>
  );
}
