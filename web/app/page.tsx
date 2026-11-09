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
  Package,
  Truck,
  HeartHandshake,
  Building2,
  CheckCircle2,
  Sparkles,
  Activity,
} from "lucide-react";
import {
  apiFetch,
  getCachedData,
  setCachedData,
  saveSession,
  UserSession,
} from "@/lib/api";
import { KpiGridSkeleton } from "@/components/SkeletonUI";

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
  const [regRole, setRegRole] = useState<"Donor" | "Organization" | "Volunteer">("Donor");
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
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Top Institutional Banner */}
      <header className="bg-[#002060] border-b-4 border-amber-400 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-amber-400/20 border border-amber-300/40 flex items-center justify-center">
              <ShieldCheck className="h-6 w-6 text-amber-300" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold tracking-tight">
                DISASTER RELIEF &amp; RESOURCE MANAGEMENT SYSTEM (DRRMS)
              </h1>
              <p className="text-xs text-blue-200">
                Institutional Information Management Framework • RA 10121 &amp; RA 10173 Compliant
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 px-3 py-1 text-xs font-medium text-emerald-200">
              <Database className="h-3.5 w-3.5" />
              Supabase PostgreSQL 15 (13 Tables • 3NF)
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Live Public Transparency & Architecture Overview */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-2xl bg-gradient-to-br from-[#002060] to-[#1F4E79] border-t-4 border-amber-400 p-6 text-white shadow-md">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 border border-amber-300/30 px-3 py-0.5 text-xs font-semibold text-amber-200 mb-3">
              <Activity className="h-3.5 w-3.5" />
              Live Public Transparency Dashboard
            </div>
            <h2 className="text-xl sm:text-2xl font-bold mb-2">
              Centralized Master Data &amp; Relief Resource Coordination
            </h2>
            <p className="text-xs sm:text-sm text-blue-100 leading-relaxed">
              Connecting Citizen Donors, Partner Organizations/LGUs, Field Logistics Volunteers, and Operations Stewards through atomic JDBC split-transactions over a single source of truth.
            </p>
          </div>

          {/* Live KPI Cards or Pixel-Perfect Skeleton */}
          {loadingOverview ? (
            <KpiGridSkeleton count={4} />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-500">
                    Active Disasters
                  </span>
                  <AlertTriangle className="h-4 w-4 text-rose-600" />
                </div>
                <div className="text-2xl font-bold text-slate-900">
                  {metrics?.activeDisasters ?? 0}
                </div>
                <div className="text-[11px] text-rose-600 font-medium mt-1">
                  Monitored Calamity Zones
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-500">
                    Logged Donations
                  </span>
                  <HeartHandshake className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-bold text-slate-900">
                  {metrics?.totalDonations ?? 0}
                </div>
                <div className="text-[11px] text-emerald-600 font-medium mt-1">
                  Verified 3NF Pledges
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-500">
                    Pending Requests
                  </span>
                  <Building2 className="h-4 w-4 text-amber-600" />
                </div>
                <div className="text-2xl font-bold text-slate-900">
                  {metrics?.pendingRequests ?? 0}
                </div>
                <div className="text-[11px] text-amber-600 font-medium mt-1">
                  Awaiting Steward Check
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-500">
                    Field Volunteers
                  </span>
                  <Truck className="h-4 w-4 text-blue-700" />
                </div>
                <div className="text-2xl font-bold text-slate-900">
                  {metrics?.registeredVolunteers ?? 0}
                </div>
                <div className="text-[11px] text-blue-700 font-medium mt-1">
                  {metrics?.completedDeliveries ?? 0} Deliveries Fulfilled
                </div>
              </div>
            </div>
          )}

          {/* Active Calamity Registry Preview */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Active Disaster Events Registry (Master Data)
                </h3>
                <p className="text-xs text-slate-500">
                  Real-time calamity incidents open for donor contributions and LGU aid requests
                </p>
              </div>
              <span className="rounded-full bg-rose-50 border border-rose-200 px-2.5 py-0.5 text-xs font-semibold text-rose-700">
                {activeEvents.length} Active
              </span>
            </div>
            <div className="divide-y divide-slate-100">
              {activeEvents.slice(0, 5).map((ev: any) => (
                <div
                  key={ev.eventId}
                  className="py-2.5 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-semibold text-slate-800">
                      {ev.eventName}
                    </span>
                    <span className="text-slate-500 ml-2">• {ev.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">{ev.startDate}</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200 px-2 py-0.5 text-[11px] font-medium text-rose-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                      {ev.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Authentication & 1-Click Role Switcher */}
        <div className="lg:col-span-5 space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            {/* Mode Tabs */}
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1 mb-5">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setErrorMsg("");
                }}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition ${
                  mode === "login"
                    ? "bg-[#002060] text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <LogIn className="h-3.5 w-3.5" />
                Sign In to Portal
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  setErrorMsg("");
                }}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition ${
                  mode === "register"
                    ? "bg-[#002060] text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <UserPlus className="h-3.5 w-3.5" />
                Register Stakeholder
              </button>
            </div>

            {errorMsg && (
              <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700">
                {errorMsg}
              </div>
            )}
            {successMsg && (
              <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-700">
                {successMsg}
              </div>
            )}

            {mode === "login" ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. admin, donor1, org1, vol1"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#002060] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#002060] focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-lg bg-[#002060] hover:bg-[#1F4E79] disabled:opacity-60 py-2.5 text-xs font-bold text-white shadow transition flex items-center justify-center gap-2"
                >
                  <Lock className="h-3.5 w-3.5" />
                  {submitting ? "Authenticating via JDBC..." : "Authenticate & Open Portal"}
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
                      className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
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
                      className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
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
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs bg-white"
                  >
                    <option value="Donor">Donor / Citizen Contributor</option>
                    <option value="Organization">Partner Organization / Barangay LGU</option>
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
                      className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
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
                      className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
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
                      className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs bg-white"
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
                        className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
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
                        className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
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
                      className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs bg-white"
                    >
                      <option value="Truck">Heavy Relief Truck</option>
                      <option value="Van">Utility Van</option>
                      <option value="Pickup / 4x4">Pickup / 4x4 Off-Road</option>
                      <option value="Motorcycle">Motorcycle</option>
                      <option value="Boat / Watercraft">Boat / Watercraft</option>
                    </select>
                  </div>
                )}

                {/* RA 10173 Data Privacy Consent Box */}
                <label className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-[11px] text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={privacyConsent}
                    onChange={(e) => setPrivacyConsent(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300"
                  />
                  <span>
                    <b>RA 10173 Data Privacy Notice:</b> I consent to the processing of my name and contact details solely for humanitarian relief coordination and audit verification.
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 py-2.5 text-xs font-bold text-white shadow transition"
                >
                  {submitting
                    ? "Checking Golden Record & Registering..."
                    : "Complete Stakeholder Registration"}
                </button>
              </form>
            )}

            {/* Quick 1-Click Defense Demo Switcher */}
            <div className="mt-6 pt-5 border-t border-slate-200">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-2.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                1-Click Oral Defense Portal Launchers
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickDemo("admin", "admin123")}
                  className="rounded-lg border border-slate-200 hover:border-[#002060] hover:bg-blue-50/50 p-2.5 text-left transition"
                >
                  <div className="text-xs font-bold text-[#002060]">
                    1. Admin Portal
                  </div>
                  <div className="text-[10px] text-slate-500">
                    admin / admin123
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickDemo("donor1", "pass123")}
                  className="rounded-lg border border-slate-200 hover:border-emerald-600 hover:bg-emerald-50/50 p-2.5 text-left transition"
                >
                  <div className="text-xs font-bold text-emerald-700">
                    2. Donor Portal
                  </div>
                  <div className="text-[10px] text-slate-500">
                    donor1 / pass123 (Robert Tan)
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickDemo("org1", "pass123")}
                  className="rounded-lg border border-slate-200 hover:border-amber-600 hover:bg-amber-50/50 p-2.5 text-left transition"
                >
                  <div className="text-xs font-bold text-amber-700">
                    3. Organization Portal
                  </div>
                  <div className="text-[10px] text-slate-500">
                    org1 / pass123 (Red Cross Manila)
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickDemo("vol1", "pass123")}
                  className="rounded-lg border border-slate-200 hover:border-indigo-600 hover:bg-indigo-50/50 p-2.5 text-left transition"
                >
                  <div className="text-xs font-bold text-indigo-700">
                    4. Volunteer Portal
                  </div>
                  <div className="text-[10px] text-slate-500">
                    vol1 / pass123 (Charlie Driver)
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
