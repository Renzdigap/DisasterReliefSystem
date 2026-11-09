"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  HeartHandshake,
  Building2,
  Truck,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { apiFetch, saveSession, UserSession } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regFullName, setRegFullName] = useState("");
  const [regContactInfo, setRegContactInfo] = useState("");
  const [regRole, setRegRole] = useState<
    "Donor" | "Organization" | "Volunteer"
  >("Donor");
  const [regDonorType, setRegDonorType] = useState("Individual");
  const [regOrgName, setRegOrgName] = useState("");
  const [regLocation, setRegLocation] = useState("");
  const [regVehicleType, setRegVehicleType] = useState("Van");

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

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
    setSubmitting(true);
    try {
      const session = await apiFetch<UserSession>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
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
      setSuccessMsg("Account created! Signing you in...");
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

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center items-center px-4 py-10 relative overflow-hidden">
      {/* Soft ambient background accents matching the logo */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-96 w-[600px] rounded-full bg-gradient-to-tr from-blue-500/10 via-orange-400/10 to-rose-500/10 blur-3xl" />

      <div className="w-full max-w-[420px] relative z-10 space-y-6">
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

        {/* Auth Card */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-7 space-y-5">
          {/* Mode Switch */}
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setErrorMsg("");
              }}
              className={`rounded-lg py-2 text-xs font-semibold transition ${
                mode === "login"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setErrorMsg("");
              }}
              className={`rounded-lg py-2 text-xs font-semibold transition ${
                mode === "register"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Create Account
            </button>
          </div>

          {errorMsg && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-700 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
              <span>{successMsg}</span>
            </div>
          )}

          {mode === "login" ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Username
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none transition"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 py-2.5 text-sm font-semibold text-white shadow-sm transition flex items-center justify-center gap-2"
              >
                <span>{submitting ? "Signing in..." : "Sign In"}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Role
                </label>
                <select
                  value={regRole}
                  onChange={(e) => setRegRole(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium bg-white"
                >
                  <option value="Donor">Donor</option>
                  <option value="Organization">Organization / LGU</option>
                  <option value="Volunteer">Volunteer Driver</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    required
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Phone / Email
                  </label>
                  <input
                    type="text"
                    required
                    value={regContactInfo}
                    onChange={(e) => setRegContactInfo(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                  />
                </div>
              </div>

              {regRole === "Donor" && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Donor Type
                  </label>
                  <select
                    value={regDonorType}
                    onChange={(e) => setRegDonorType(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white"
                  >
                    <option value="Individual">Individual</option>
                    <option value="Corporate">Corporate / Foundation</option>
                  </select>
                </div>
              )}

              {regRole === "Organization" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Organization Name
                    </label>
                    <input
                      type="text"
                      required
                      value={regOrgName}
                      onChange={(e) => setRegOrgName(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Location
                    </label>
                    <input
                      type="text"
                      required
                      value={regLocation}
                      onChange={(e) => setRegLocation(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                    />
                  </div>
                </div>
              )}

              {regRole === "Volunteer" && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Vehicle
                  </label>
                  <select
                    value={regVehicleType}
                    onChange={(e) => setRegVehicleType(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white"
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
                className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 py-2.5 text-sm font-semibold text-white shadow-sm transition"
              >
                {submitting ? "Creating account..." : "Create Account"}
              </button>
            </form>
          )}

          {/* Compact Demo Switcher */}
          <div className="pt-4 border-t border-slate-100">
            <p className="text-[11px] font-medium text-slate-400 text-center mb-2.5">
              Quick Demo Access
            </p>
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemo("admin", "admin123")}
                className="flex flex-col items-center gap-1 rounded-xl border border-slate-200/80 hover:border-blue-500 hover:bg-blue-50/50 py-2 px-1 transition"
              >
                <ShieldCheck className="h-4 w-4 text-blue-600" />
                <span className="text-[11px] font-semibold text-slate-700">
                  Admin
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo("donor1", "pass123")}
                className="flex flex-col items-center gap-1 rounded-xl border border-slate-200/80 hover:border-rose-500 hover:bg-rose-50/50 py-2 px-1 transition"
              >
                <HeartHandshake className="h-4 w-4 text-rose-500" />
                <span className="text-[11px] font-semibold text-slate-700">
                  Donor
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo("org1", "pass123")}
                className="flex flex-col items-center gap-1 rounded-xl border border-slate-200/80 hover:border-orange-500 hover:bg-orange-50/50 py-2 px-1 transition"
              >
                <Building2 className="h-4 w-4 text-orange-500" />
                <span className="text-[11px] font-semibold text-slate-700">
                  Org / LGU
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo("vol1", "pass123")}
                className="flex flex-col items-center gap-1 rounded-xl border border-slate-200/80 hover:border-emerald-500 hover:bg-emerald-50/50 py-2 px-1 transition"
              >
                <Truck className="h-4 w-4 text-emerald-600" />
                <span className="text-[11px] font-semibold text-slate-700">
                  Volunteer
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
