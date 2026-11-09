"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Database,
  Lock,
  UserPlus,
  LogIn,
  AlertTriangle,
  Truck,
  HeartHandshake,
  Building2,
  Sparkles,
  Activity,
  MapPin,
  ArrowRight,
  CheckCircle2,
  Layers,
} from "lucide-react";
import {
  apiFetch,
  getCachedData,
  setCachedData,
  saveSession,
  UserSession,
} from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");

  // Login fields
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Register fields
  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regFullName, setRegFullName] = useState("");
  const [regContactInfo, setRegContactInfo] = useState("");
  const [regRole, setRegRole] = useState<"Donor" | "Organization" | "Volunteer">(
    "Donor"
  );
  const [regDonorType, setRegDonorType] = useState("Individual");
  const [regOrgName, setRegOrgName] = useState("");
  const [regLocation, setRegLocation] = useState("");
  const [regVehicleType, setRegVehicleType] = useState("Van");
  const [privacyConsent, setPrivacyConsent] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Public overview metrics with persistent localStorage cache
  const [publicOverview, setPublicOverview] = useState<any>(() =>
    getCachedData("public_overview")
  );
  const [loadingOverview, setLoadingOverview] = useState<boolean>(
    () => !getCachedData("public_overview")
  );

  useEffect(() => {
    let mounted = true;
    apiFetch("/api/admin/overview")
      .then((data) => {
        if (!mounted) return;
        setPublicOverview(data);
        setCachedData("public_overview", data);
        setLoadingOverview(false);
      })
      .catch(() => {
        if (mounted) setLoadingOverview(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const routeByRole = (session: UserSession) => {
    const role = (session.user.role || "").toLowerCase();
    if (role === "admin" || role === "manager") {
      router.push("/admin");
    } else if (role === "donor") {
      router.push("/donor");
    } else if (role === "organization") {
      router.push("/organization");
    } else if (role === "volunteer") {
      router.push("/volunteer");
    } else {
      router.push("/admin");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setSubmitting(true);
    try {
      const session = await apiFetch<UserSession>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      saveSession(session);
      routeByRole(session);
    } catch (err: any) {
      setErrorMsg(err.message || "Authentication failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickDemo = async (demoUser: string, demoPass: string) => {
    setUsername(demoUser);
    setPassword(demoPass);
    setErrorMsg("");
    setSubmitting(true);
    try {
      const session = await apiFetch<UserSession>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username: demoUser, password: demoPass }),
      });
      saveSession(session);
      routeByRole(session);
    } catch (err: any) {
      setErrorMsg(err.message || "Quick login failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    if (!privacyConsent) {
      setErrorMsg(
        "Please accept the RA 10173 Data Privacy Notice & Consent before registering."
      );
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          username: regUsername,
          password: regPassword,
          fullName: regFullName,
          contactInfo: regContactInfo,
          role: regRole,
          donorType: regDonorType,
          orgName: regOrgName || regFullName,
          location: regLocation,
          vehicleType: regVehicleType,
        }),
      });
      setSuccessMsg(
        "Registration verified in Master Registry! Signing you in..."
      );
      const session = await apiFetch<UserSession>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username: regUsername, password: regPassword }),
      });
      saveSession(session);
      routeByRole(session);
    } catch (err: any) {
      setErrorMsg(err.message || "Registration failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const metrics = publicOverview?.metrics;
  const activeEvents = (publicOverview?.events || []).filter(
    (e: any) => e.status === "Active"
  );

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-slate-50 text-slate-900">
      {/* LEFT 50% (6 Cols): Full-Height Dark Slate Command Panel */}
      <section className="lg:col-span-6 xl:col-span-7 bg-slate-900 text-white p-6 sm:p-10 xl:p-12 flex flex-col justify-between relative overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-800">
        {/* Subtle decorative background radial glow */}
        <div className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 right-0 h-96 w-96 rounded-full bg-rose-500/10 blur-3xl" />

        {/* Top Institutional Brand & Database Pill */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="h-12 w-12 rounded-2xl bg-white p-1 border border-slate-700 flex items-center justify-center shadow-md overflow-hidden shrink-0">
              <img
                src="/logo.jpg"
                alt="DRRMS Logo"
                className="h-full w-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-white">
                  DRRMS COMMAND
                </span>
                <span className="rounded-md bg-slate-800 border border-slate-700 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                  RA 10121 &amp; 10173
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Disaster Relief &amp; Resource Management System
              </p>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full bg-slate-800/90 border border-slate-700/80 px-3.5 py-1.5 text-xs font-medium text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <Database className="h-3.5 w-3.5 text-emerald-400" />
            <span>Supabase PostgreSQL 15 (13 Tables • 3NF)</span>
          </div>
        </div>

        {/* Center Hero Copy + Live 2x2 Bento Metrics + Active Calamity Feed */}
        <div className="relative z-10 my-8 space-y-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/25 px-3 py-1 text-xs font-semibold text-emerald-300">
              <Activity className="h-3.5 w-3.5" />
              <span>Real-Time Humanitarian Transparency &amp; Audit</span>
            </div>
            <h1 className="text-2xl sm:text-3xl xl:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Centralized Master Data &amp;{" "}
              <span className="text-emerald-400">
                Relief Resource Coordination
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Unifying Citizen Donors, Partner LGUs/NGOs, Field Logistics
              Volunteers, and Data Stewards through atomic Java JDBC
              split-transactions over a normalized Third Normal Form (3NF)
              PostgreSQL database.
            </p>
          </div>

          {/* 2x2 Bento Grid of Live Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="rounded-2xl bg-slate-800/70 border border-slate-700/70 p-4 backdrop-blur">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Active Zones
                </span>
                <div className="h-7 w-7 rounded-lg bg-rose-500/15 flex items-center justify-center">
                  <AlertTriangle className="h-4 w-4 text-rose-400" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-white">
                {loadingOverview ? "—" : metrics?.activeDisasters ?? 0}
              </div>
              <div className="text-[11px] text-rose-400 font-medium mt-1">
                Urgent Calamities
              </div>
            </div>

            <div className="rounded-2xl bg-slate-800/70 border border-slate-700/70 p-4 backdrop-blur">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Verified Aid
                </span>
                <div className="h-7 w-7 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                  <HeartHandshake className="h-4 w-4 text-emerald-400" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-white">
                {loadingOverview ? "—" : metrics?.totalDonations ?? 0}
              </div>
              <div className="text-[11px] text-emerald-400 font-medium mt-1">
                3NF Donor Pledges
              </div>
            </div>

            <div className="rounded-2xl bg-slate-800/70 border border-slate-700/70 p-4 backdrop-blur">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  LGU Queue
                </span>
                <div className="h-7 w-7 rounded-lg bg-amber-500/15 flex items-center justify-center">
                  <Building2 className="h-4 w-4 text-amber-400" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-white">
                {loadingOverview ? "—" : metrics?.pendingRequests ?? 0}
              </div>
              <div className="text-[11px] text-amber-300 font-medium mt-1">
                Pending Requisitions
              </div>
            </div>

            <div className="rounded-2xl bg-slate-800/70 border border-slate-700/70 p-4 backdrop-blur">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Fleet Units
                </span>
                <div className="h-7 w-7 rounded-lg bg-sky-500/15 flex items-center justify-center">
                  <Truck className="h-4 w-4 text-sky-400" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-white">
                {loadingOverview ? "—" : metrics?.registeredVolunteers ?? 0}
              </div>
              <div className="text-[11px] text-sky-300 font-medium mt-1">
                {metrics?.completedDeliveries ?? 0} Dispatches Done
              </div>
            </div>
          </div>

          {/* Live Active Calamities Registry Card */}
          <div className="rounded-2xl bg-slate-800/50 border border-slate-700/70 overflow-hidden backdrop-blur">
            <div className="px-5 py-3.5 border-b border-slate-700/70 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Active Disaster Events Registry (Master Data)
                </h2>
              </div>
              <span className="rounded-full bg-rose-500/20 border border-rose-500/30 px-2.5 py-0.5 text-[11px] font-bold text-rose-300">
                {activeEvents.length} Monitored
              </span>
            </div>

            <div className="divide-y divide-slate-800/80 max-h-56 overflow-y-auto">
              {activeEvents.length === 0 ? (
                <div className="p-5 text-center text-xs text-slate-400">
                  Synchronizing active disaster incidents from Supabase...
                </div>
              ) : (
                activeEvents.slice(0, 5).map((ev: any) => (
                  <div
                    key={ev.eventId}
                    className="px-5 py-3 flex items-center justify-between gap-4 hover:bg-slate-800/60 transition text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-white truncate">
                        {ev.eventName}
                      </div>
                      <div className="text-slate-400 flex items-center gap-1.5 mt-0.5 truncate">
                        <MapPin className="h-3 w-3 text-rose-400 shrink-0" />
                        <span className="truncate">{ev.location}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="text-[11px] text-slate-400 hidden sm:inline">
                        {ev.startDate}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 border border-rose-500/30 px-2.5 py-0.5 text-[11px] font-semibold text-rose-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                        {ev.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Bottom Architecture Footer */}
        <div className="relative z-10 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <Layers className="h-3.5 w-3.5 text-emerald-400" />
            <span>
              4-Tier Architecture: Next.js TypeScript + Java JDBC Server +
              Supabase PostgreSQL
            </span>
          </div>
          <span>Golden Record &amp; 3NF Split-Transaction Enforced</span>
        </div>
      </section>

      {/* RIGHT 50% (6 Cols): Clean Centered Authentication & Role Switcher */}
      <section className="lg:col-span-6 xl:col-span-5 flex flex-col justify-center p-6 sm:p-10 xl:p-12 bg-slate-50">
        <div className="max-w-md w-full mx-auto space-y-6">
          {/* Card Header with Official Logo */}
          <div className="flex items-center gap-3.5">
            <div className="h-14 w-14 rounded-2xl bg-white p-1.5 border border-slate-200 shadow-sm flex items-center justify-center shrink-0 overflow-hidden">
              <img
                src="/logo.jpg"
                alt="DRRMS Official Logo"
                className="h-full w-full object-contain"
              />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
                {mode === "login"
                  ? "Sign in to Stakeholder Portal"
                  : "Register New Stakeholder"}
              </h2>
              <p className="text-xs text-slate-500">
                {mode === "login"
                  ? "Authenticate with your DRRMS credentials or launch a demo role below."
                  : "Create an RA 10173 verified Donor, LGU/Organization, or Volunteer account."}
              </p>
            </div>
          </div>

          {/* Main White Auth Card */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-sm space-y-5">
            {/* Segmented Mode Switcher */}
            <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setErrorMsg("");
                }}
                className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-bold transition-all ${
                  mode === "login"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <LogIn className="h-3.5 w-3.5" />
                <span>Sign In to Portal</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  setErrorMsg("");
                }}
                className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-bold transition-all ${
                  mode === "register"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>Register Stakeholder</span>
              </button>
            </div>

            {errorMsg && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-semibold text-rose-700 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-700 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {mode === "login" ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Username
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. admin, donor1, org1, vol1"
                    className="w-full rounded-xl border border-slate-300 bg-slate-50/50 focus:bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full rounded-xl border border-slate-300 bg-slate-50/50 focus:bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none transition"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 py-3 text-xs sm:text-sm font-bold text-white shadow-sm transition flex items-center justify-center gap-2"
                >
                  <Lock className="h-4 w-4" />
                  <span>
                    {submitting
                      ? "Authenticating via JDBC..."
                      : "Authenticate & Open Portal"}
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Username *
                    </label>
                    <input
                      type="text"
                      required
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Password *
                    </label>
                    <input
                      type="password"
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Stakeholder Portal Role *
                  </label>
                  <select
                    value={regRole}
                    onChange={(e) => setRegRole(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs bg-white font-semibold"
                  >
                    <option value="Donor">Donor / Citizen Contributor</option>
                    <option value="Organization">
                      Partner Organization / Barangay LGU
                    </option>
                    <option value="Volunteer">Field Logistics Volunteer</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Full Name / Focal Person *
                    </label>
                    <input
                      type="text"
                      required
                      value={regFullName}
                      onChange={(e) => setRegFullName(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Contact Number / Email *
                    </label>
                    <input
                      type="text"
                      required
                      value={regContactInfo}
                      onChange={(e) => setRegContactInfo(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                    />
                  </div>
                </div>

                {regRole === "Donor" && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Donor Classification
                    </label>
                    <select
                      value={regDonorType}
                      onChange={(e) => setRegDonorType(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs bg-white"
                    >
                      <option value="Individual">Individual Citizen</option>
                      <option value="Corporate">Corporate / Foundation</option>
                    </select>
                  </div>
                )}

                {regRole === "Organization" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Organization / LGU Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={regOrgName}
                        onChange={(e) => setRegOrgName(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        City / Municipality *
                      </label>
                      <input
                        type="text"
                        required
                        value={regLocation}
                        onChange={(e) => setRegLocation(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                      />
                    </div>
                  </div>
                )}

                {regRole === "Volunteer" && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Transport Vehicle Mode
                    </label>
                    <select
                      value={regVehicleType}
                      onChange={(e) => setRegVehicleType(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs bg-white"
                    >
                      <option value="Truck">Heavy Relief Truck</option>
                      <option value="Van">Utility Van</option>
                      <option value="Pickup / 4x4">
                        Pickup / 4x4 Off-Road
                      </option>
                      <option value="Motorcycle">Motorcycle</option>
                      <option value="Boat / Watercraft">
                        Boat / Watercraft
                      </option>
                    </select>
                  </div>
                )}

                <label className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={privacyConsent}
                    onChange={(e) => setPrivacyConsent(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-emerald-600"
                  />
                  <span>
                    <b>RA 10173 Data Privacy Notice:</b> I consent to the
                    processing of my name and contact details solely for
                    humanitarian relief coordination and audit verification.
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 py-3 text-xs font-bold text-white shadow-sm transition"
                >
                  {submitting
                    ? "Checking Golden Record & Registering..."
                    : "Complete Stakeholder Registration"}
                </button>
              </form>
            )}
          </div>

          {/* 1-Click Oral Defense Portal Switcher */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-700">
                <Sparkles className="h-4 w-4 text-emerald-600" />
                <span>1-Click Oral Defense Portal Launchers</span>
              </div>
              <span className="text-[11px] font-medium text-slate-400">
                Instant Role Switch
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleQuickDemo("admin", "admin123")}
                className="group flex items-center gap-3 rounded-xl border border-slate-200 hover:border-slate-900 hover:bg-slate-900 p-3 text-left transition-all"
              >
                <div className="h-9 w-9 rounded-lg bg-slate-100 group-hover:bg-white/15 flex items-center justify-center shrink-0">
                  <ShieldCheck className="h-4 w-4 text-slate-800 group-hover:text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 group-hover:text-white truncate">
                    1. Admin Console
                  </div>
                  <div className="text-[11px] text-slate-500 group-hover:text-slate-300 truncate">
                    admin / admin123
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo("donor1", "pass123")}
                className="group flex items-center gap-3 rounded-xl border border-slate-200 hover:border-emerald-600 hover:bg-emerald-600 p-3 text-left transition-all"
              >
                <div className="h-9 w-9 rounded-lg bg-emerald-50 group-hover:bg-white/15 flex items-center justify-center shrink-0">
                  <HeartHandshake className="h-4 w-4 text-emerald-600 group-hover:text-white" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 group-hover:text-white truncate">
                    2. Donor Portal
                  </div>
                  <div className="text-[11px] text-slate-500 group-hover:text-emerald-100 truncate">
                    Robert Tan (donor1)
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo("org1", "pass123")}
                className="group flex items-center gap-3 rounded-xl border border-slate-200 hover:border-amber-600 hover:bg-amber-600 p-3 text-left transition-all"
              >
                <div className="h-9 w-9 rounded-lg bg-amber-50 group-hover:bg-white/15 flex items-center justify-center shrink-0">
                  <Building2 className="h-4 w-4 text-amber-600 group-hover:text-white" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 group-hover:text-white truncate">
                    3. LGU / Org Portal
                  </div>
                  <div className="text-[11px] text-slate-500 group-hover:text-amber-100 truncate">
                    Red Cross Manila (org1)
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo("vol1", "pass123")}
                className="group flex items-center gap-3 rounded-xl border border-slate-200 hover:border-sky-600 hover:bg-sky-600 p-3 text-left transition-all"
              >
                <div className="h-9 w-9 rounded-lg bg-sky-50 group-hover:bg-white/15 flex items-center justify-center shrink-0">
                  <Truck className="h-4 w-4 text-sky-600 group-hover:text-white" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 group-hover:text-white truncate">
                    4. Volunteer Fleet
                  </div>
                  <div className="text-[11px] text-slate-500 group-hover:text-sky-100 truncate">
                    Charlie Driver (vol1)
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
