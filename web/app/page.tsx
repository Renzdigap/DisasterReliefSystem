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
} from "lucide-react";
import { apiFetch, saveSession, UserSession } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");

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
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center items-center px-4 py-10 relative overflow-hidden">
      {/* Soft ambient background accents */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-96 w-[600px] rounded-full bg-gradient-to-tr from-blue-500/10 via-orange-400/10 to-rose-500/10 blur-3xl" />

      {/* NDRRMC Official Seal Background Watermark */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 flex items-center justify-center overflow-hidden z-0 select-none"
      >
        <img
          src="/ndrrmc-logo.png"
          alt="NDRRMC Seal Background"
          className="w-[620px] max-w-[92vw] max-h-[85vh] object-contain opacity-[0.12] filter drop-shadow-sm select-none pointer-events-none"
        />
      </div>

      <div className="w-full max-w-[460px] relative z-10 space-y-6">
        {/* Clean Brand Header */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="h-20 w-20 rounded-2xl bg-white p-2 shadow-md border border-slate-200/80 flex items-center justify-center">
            <img
              src="/logo.jpg"
              alt="DRRMS Logo"
              className="h-full w-full object-contain"
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Disaster Relief System
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Relief coordination &amp; resource management
            </p>
          </div>
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
              className={`w-full bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-7 space-y-5 backface-hidden ${
                mode === "register"
                  ? "absolute top-0 left-0 pointer-events-none"
                  : "relative pointer-events-auto"
              }`}
            >
              {/* Mode Switch: Sign In on LEFT, Create Account on RIGHT */}
              <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
                <button
                  type="button"
                  className="rounded-lg py-2 text-xs font-semibold bg-white text-slate-900 shadow-sm transition"
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
                  className="rounded-lg py-2 text-xs font-semibold text-slate-500 hover:text-slate-900 transition"
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
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div
                  role="status"
                  aria-live="polite"
                  className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-700 flex items-center gap-2"
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                  <span>{successMsg}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label
                    htmlFor="login-username"
                    className="block text-xs font-medium text-slate-700 mb-1.5"
                  >
                    Username or Email
                  </label>
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
                    className="auth-input w-full rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white px-3.5 py-2.5 text-base sm:text-sm text-slate-900 focus:border-blue-600 focus:outline-none transition"
                  />
                </div>

                <div>
                  <label
                    htmlFor="login-password"
                    className="block text-xs font-medium text-slate-700 mb-1.5"
                  >
                    Password
                  </label>
                  <div className="relative">
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
                      className="auth-input w-full rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white pl-3.5 pr-11 py-2.5 text-base sm:text-sm text-slate-900 focus:border-blue-600 focus:outline-none transition"
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
                  className="w-full min-h-[44px] rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 py-2.5 text-sm font-semibold text-white shadow-sm transition flex items-center justify-center gap-2"
                >
                  <span>{submitting ? "Signing in..." : "Sign In"}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>

              {/* Compact Demo Switcher */}
              <div className="pt-4 border-t border-slate-100">
                <p className="text-[11px] font-medium text-slate-400 text-center mb-2.5">
                  Quick Demo Access
                </p>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleQuickDemo("admin", "admin123")}
                    className="flex flex-col items-center gap-1 rounded-xl border border-slate-200/80 hover:border-blue-500 hover:bg-blue-50/50 disabled:opacity-50 py-2 px-1 transition"
                  >
                    <ShieldCheck className="h-4 w-4 text-blue-600" />
                    <span className="text-[11px] font-semibold text-slate-700">
                      Admin
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleQuickDemo("donor1", "pass123")}
                    className="flex flex-col items-center gap-1 rounded-xl border border-slate-200/80 hover:border-rose-500 hover:bg-rose-50/50 disabled:opacity-50 py-2 px-1 transition"
                  >
                    <HeartHandshake className="h-4 w-4 text-rose-500" />
                    <span className="text-[11px] font-semibold text-slate-700">
                      Donor
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleQuickDemo("org1", "pass123")}
                    className="flex flex-col items-center gap-1 rounded-xl border border-slate-200/80 hover:border-orange-500 hover:bg-orange-50/50 disabled:opacity-50 py-2 px-1 transition"
                  >
                    <Building2 className="h-4 w-4 text-orange-500" />
                    <span className="text-[11px] font-semibold text-slate-700">
                      Org / LGU
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleQuickDemo("vol1", "pass123")}
                    className="flex flex-col items-center gap-1 rounded-xl border border-slate-200/80 hover:border-emerald-500 hover:bg-emerald-50/50 disabled:opacity-50 py-2 px-1 transition"
                  >
                    <Truck className="h-4 w-4 text-emerald-600" />
                    <span className="text-[11px] font-semibold text-slate-700">
                      Volunteer
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* BACK FACE: Create Account / Verify OTP */}
            <div
              className={`w-full bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-7 space-y-5 backface-hidden flip-card-back ${
                mode === "register"
                  ? "relative pointer-events-auto"
                  : "absolute top-0 left-0 pointer-events-none"
              }`}
            >
              {/* Mode Switch: Sign In on LEFT, Create Account on RIGHT */}
              <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setErrorMsg("");
                    setSuccessMsg("");
                  }}
                  className="rounded-lg py-2 text-xs font-semibold text-slate-500 hover:text-slate-900 transition"
                >
                  Sign In
                </button>
                <button
                  type="button"
                  className="rounded-lg py-2 text-xs font-semibold bg-white text-slate-900 shadow-sm transition"
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
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div
                  role="status"
                  aria-live="polite"
                  className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-700 flex items-center gap-2"
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                  <span>{successMsg}</span>
                </div>
              )}

              {regStep === "verify" ? (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3.5 flex items-start gap-3">
                    <div className="rounded-lg bg-blue-600 text-white p-2 shrink-0">
                      <MailCheck className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div className="text-xs text-slate-700 leading-relaxed">
                      <p className="font-semibold text-slate-900">
                        Step 2 of 2: Verify Your Email
                      </p>
                      <p className="mt-0.5 text-slate-600">
                        Code sent to{" "}
                        <span className="font-semibold text-slate-900 break-all">
                          {pendingEmail}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="otp-input"
                      className="block text-xs font-medium text-slate-700 mb-1"
                    >
                      Verification Code
                    </label>
                    <p
                      id="otp-format-hint"
                      className="text-[11px] text-slate-500 mb-2"
                    >
                      Enter the 6-digit code sent to your email. Valid for 10
                      minutes (check Spam folder if not in Inbox).
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
                      className="auth-input w-full min-h-[48px] rounded-xl border border-slate-300 bg-slate-50/60 focus:bg-white px-4 py-2.5 text-center font-mono text-base font-bold tracking-[0.4em] text-slate-900 focus:border-blue-600 focus:outline-none transition"
                    />
                    <div id="otp-error" className="field-error-msg">
                      Please enter the 6-digit numeric verification code.
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full min-h-[44px] rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 py-2.5 text-sm font-semibold text-white shadow-sm transition flex items-center justify-center gap-2"
                  >
                    <span>
                      {submitting
                        ? "Verifying..."
                        : "Verify Email & Create Account"}
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </button>

                  <div className="flex items-center justify-between gap-2 pt-1 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setRegStep("form");
                        setErrorMsg("");
                        setSuccessMsg("");
                      }}
                      className="inline-flex items-center gap-1 font-medium text-slate-500 hover:text-slate-800 transition"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      <span>Edit Email / Details</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={resending || resendCooldown > 0}
                      className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-700 disabled:text-slate-400 transition"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
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
                      className="block text-xs font-medium text-slate-700 mb-1"
                    >
                      Account Role
                    </label>
                    <select
                      id="reg-role"
                      name="role"
                      value={regRole}
                      onChange={(e) => setRegRole(e.target.value as any)}
                      className="w-full min-h-[40px] rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium bg-white"
                    >
                      <option value="Donor">Donor</option>
                      <option value="Organization">Organization / LGU</option>
                      <option value="Volunteer">Volunteer Driver</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="reg-email"
                      className="block text-xs font-medium text-slate-700 mb-0.5"
                    >
                      Email Address
                    </label>
                    <span
                      id="reg-email-hint"
                      className="block text-[11px] text-slate-500 mb-1"
                    >
                      A 6-digit verification code will be sent here.
                    </span>
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
                      className="auth-input w-full rounded-xl border border-slate-200 px-3 py-2 text-base sm:text-xs"
                    />
                    <div id="reg-email-error" className="field-error-msg">
                      Please enter a valid email address.
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="reg-username"
                        className="block text-xs font-medium text-slate-700 mb-0.5"
                      >
                        Username
                      </label>
                      <span
                        id="reg-username-hint"
                        className="block text-[10px] text-slate-400 mb-1"
                      >
                        3-50 chars, no spaces or &apos;@&apos;.
                      </span>
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
                        className="auth-input w-full rounded-xl border border-slate-200 px-3 py-2 text-base sm:text-xs"
                      />
                      <div id="reg-username-error" className="field-error-msg">
                        3-50 chars without spaces or &apos;@&apos;.
                      </div>
                    </div>
                    <div>
                      <label
                        htmlFor="reg-password"
                        className="block text-xs font-medium text-slate-700 mb-0.5"
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
                          className="auth-input w-full rounded-xl border border-slate-200 pl-3 pr-9 py-2 text-base sm:text-xs"
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
                        className="block text-xs font-medium text-slate-700 mb-1"
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
                        className="auth-input w-full rounded-xl border border-slate-200 px-3 py-2 text-base sm:text-xs"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="reg-contact"
                        className="block text-xs font-medium text-slate-700 mb-1"
                      >
                        Phone Number
                      </label>
                      <input
                        id="reg-contact"
                        name="contactInfo"
                        type="tel"
                        autoComplete="tel"
                        enterKeyHint="next"
                        placeholder="0917-000-0000"
                        value={regContactInfo}
                        onChange={(e) => setRegContactInfo(e.target.value)}
                        className="auth-input w-full rounded-xl border border-slate-200 px-3 py-2 text-base sm:text-xs"
                      />
                    </div>
                  </div>

                  {regRole === "Donor" && (
                    <div>
                      <label
                        htmlFor="reg-donor-type"
                        className="block text-xs font-medium text-slate-700 mb-1"
                      >
                        Donor Type
                      </label>
                      <select
                        id="reg-donor-type"
                        name="donorType"
                        value={regDonorType}
                        onChange={(e) => setRegDonorType(e.target.value)}
                        className="w-full min-h-[40px] rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white"
                      >
                        <option value="Individual">Individual</option>
                        <option value="Corporate">Corporate / Foundation</option>
                      </select>
                    </div>
                  )}

                  {regRole === "Organization" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label
                          htmlFor="reg-org-name"
                          className="block text-xs font-medium text-slate-700 mb-1"
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
                          className="auth-input w-full rounded-xl border border-slate-200 px-3 py-2 text-base sm:text-xs"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="reg-location"
                          className="block text-xs font-medium text-slate-700 mb-1"
                        >
                          Location
                        </label>
                        <input
                          id="reg-location"
                          name="location"
                          type="text"
                          required
                          value={regLocation}
                          onChange={(e) => setRegLocation(e.target.value)}
                          onBlur={handleFieldBlur}
                          className="auth-input w-full rounded-xl border border-slate-200 px-3 py-2 text-base sm:text-xs"
                        />
                      </div>
                    </div>
                  )}

                  {regRole === "Volunteer" && (
                    <div>
                      <label
                        htmlFor="reg-vehicle"
                        className="block text-xs font-medium text-slate-700 mb-1"
                      >
                        Vehicle
                      </label>
                      <select
                        id="reg-vehicle"
                        name="vehicleType"
                        value={regVehicleType}
                        onChange={(e) => setRegVehicleType(e.target.value)}
                        className="w-full min-h-[40px] rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white"
                      >
                        <option value="Truck">Truck</option>
                        <option value="Van">Van</option>
                        <option value="Pickup / 4x4">Pickup / 4x4</option>
                        <option value="Motorcycle">Motorcycle</option>
                        <option value="Boat / Watercraft">Boat</option>
                      </select>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full min-h-[44px] rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 py-2.5 text-sm font-semibold text-white shadow-sm transition flex items-center justify-center gap-2"
                  >
                    <span>
                      {submitting
                        ? "Sending Verification Code..."
                        : "Send Verification Code"}
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMode("login");
                        setErrorMsg("");
                        setSuccessMsg("");
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800 font-semibold transition"
                    >
                      Already have an account? Sign In &rarr;
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
