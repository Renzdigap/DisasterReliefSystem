"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Truck,
  UserCog,
  Bell,
  Search,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Clock,
  Navigation,
  Check,
  ShieldCheck,
} from "lucide-react";
import { PortalSidebarLayout, SidebarNavItem } from "@/components/PortalHeader";
import { PortalShellSkeleton, StatusBadge } from "@/components/SkeletonUI";
import {
  apiFetch,
  getSavedSession,
  getCachedData,
  setCachedData,
  UserSession,
} from "@/lib/api";

export default function VolunteerPortalPage() {
  const router = useRouter();
  const [session, setSession] = useState<UserSession | null>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "deliveries" | "profile" | "notifications"
  >("deliveries");
  const [banner, setBanner] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  // Volunteer Profile state
  const [fullName, setFullName] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [vehicleType, setVehicleType] = useState("Truck");
  const [isAvailable, setIsAvailable] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);

  const loadVolunteerPortal = useCallback(
    async (userId: number, isBackground = false) => {
      const cacheKey = `vol_portal_${userId}`;
      if (!isBackground) {
        const cached = getCachedData<any>(cacheKey);
        if (cached) {
          setData(cached);
          setFullName(cached.user?.fullName || "");
          setContactInfo(cached.user?.contactInfo || "");
          setVehicleType(cached.volunteer?.vehicleType || "Truck");
          setIsAvailable(cached.volunteer?.isAvailable ?? true);
          setLoading(false);
        }
      } else {
        setRefreshing(true);
      }

      try {
        const fresh = await apiFetch<any>(
          `/api/portal/volunteer?userId=${userId}`
        );
        setData(fresh);
        setCachedData(cacheKey, fresh);
        if (fresh.user) {
          setFullName(fresh.user.fullName || "");
          setContactInfo(fresh.user.contactInfo || "");
        }
        if (fresh.volunteer) {
          setVehicleType(fresh.volunteer.vehicleType || "Truck");
          setIsAvailable(fresh.volunteer.isAvailable ?? true);
        }
      } catch (err: any) {
        setBanner({
          type: "error",
          text: err.message || "Failed to load Volunteer Portal data.",
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    const saved = getSavedSession();
    if (!saved || !saved.user) {
      router.replace("/");
      return;
    }
    setSession(saved);
    loadVolunteerPortal(saved.user.userId);
  }, [router, loadVolunteerPortal]);

  const handleUpdateDeliveryStatus = async (
    deliveryId: number,
    newStatus: "In Transit" | "Delivered"
  ) => {
    if (!session?.user) return;
    setUpdatingId(deliveryId);
    setBanner(null);
    try {
      await apiFetch("/api/deliveries", {
        method: "PUT",
        body: JSON.stringify({
          deliveryId,
          deliveryStatus: newStatus,
        }),
      });
      setBanner({
        type: "success",
        text:
          newStatus === "Delivered"
            ? `Delivery #${deliveryId} marked as Delivered! Parent ReliefRequest automatically updated to 'Fulfilled' via JDBC.`
            : `Delivery #${deliveryId} status updated to '${newStatus}'.`,
      });
      await loadVolunteerPortal(session.user.userId, true);
    } catch (err: any) {
      setBanner({
        type: "error",
        text: err.message || "Failed to update delivery status.",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user) return;
    setSavingProfile(true);
    setBanner(null);
    try {
      await apiFetch("/api/volunteer/profile", {
        method: "PUT",
        body: JSON.stringify({
          userId: session.user.userId,
          fullName,
          contactInfo,
          vehicleType,
          isAvailable,
        }),
      });
      setBanner({
        type: "success",
        text: "Field Volunteer Vehicle & Availability Profile updated in Supabase PostgreSQL.",
      });
      await loadVolunteerPortal(session.user.userId, true);
    } catch (err: any) {
      setBanner({
        type: "error",
        text: err.message || "Failed to update volunteer profile.",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleMarkNotificationRead = async (notificationId: number) => {
    if (!session?.user) return;
    try {
      await apiFetch("/api/notifications/read", {
        method: "PUT",
        body: JSON.stringify({ notificationId }),
      });
      await loadVolunteerPortal(session.user.userId, true);
    } catch (err: any) {
      setBanner({ type: "error", text: err.message });
    }
  };

  const deliveries = data?.deliveries || [];
  const notifications = data?.notifications || [];

  const unreadCount = useMemo(
    () => notifications.filter((n: any) => !n.isRead).length,
    [notifications]
  );

  const filteredDeliveries = useMemo(() => {
    return deliveries.filter((d: any) => {
      const matchesStatus =
        statusFilter === "ALL" || d.deliveryStatus === statusFilter;
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        String(d.deliveryId).includes(q) ||
        String(d.requestId).includes(q) ||
        (d.orgName || "").toLowerCase().includes(q) ||
        (d.location || "").toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [deliveries, statusFilter, searchQuery]);

  if (loading && !data) {
    return <PortalShellSkeleton />;
  }

  const navItems: SidebarNavItem[] = [
    {
      id: "deliveries",
      label: "Assigned Deliveries Queue",
      icon: <Truck className="h-4 w-4" />,
      badge: deliveries.length,
      badgeTone: "emerald",
    },
    {
      id: "profile",
      label: "Vehicle & Fleet Profile",
      icon: <UserCog className="h-4 w-4" />,
      badge: isAvailable ? "Ready" : "Busy",
      badgeTone: isAvailable ? "emerald" : "amber",
    },
    {
      id: "notifications",
      label: "Dispatch Notifications",
      icon: <Bell className="h-4 w-4" />,
      badge: unreadCount > 0 ? unreadCount : undefined,
      badgeTone: "rose",
    },
  ];

  return (
    <PortalSidebarLayout
      session={session}
      portalTitle="Field Logistics Volunteer & Fleet Portal"
      portalSubtitle={`${
        fullName || session?.user?.fullName || "Field Driver"
      } • Vehicle: ${vehicleType} • ${
        isAvailable ? "AVAILABLE FOR DISPATCH" : "ON ASSIGNMENT"
      }`}
      roleBadge="Volunteer"
      navItems={navItems}
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      unreadCount={unreadCount}
      onOpenNotifications={() => setActiveTab("notifications")}
      onSync={() =>
        session?.user && loadVolunteerPortal(session.user.userId, true)
      }
      syncing={refreshing}
    >
      {banner && (
        <div
          className={`rounded-2xl border px-4 py-3.5 flex items-center justify-between text-xs sm:text-sm font-semibold shadow-sm ${
            banner.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-rose-50 border-rose-200 text-rose-900"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {banner.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
            )}
            <span>{banner.text}</span>
          </div>
          <button
            onClick={() => setBanner(null)}
            className="text-xs underline ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
            <span>Assigned Dispatches</span>
            <div className="h-8 w-8 rounded-xl bg-slate-100 flex items-center justify-center">
              <Truck className="h-4 w-4 text-slate-800" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-extrabold text-slate-900">
            {deliveries.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Total missions assigned to your vehicle
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
            <span>Active / In Transit</span>
            <div className="h-8 w-8 rounded-xl bg-amber-50 flex items-center justify-center">
              <Navigation className="h-4 w-4 text-amber-600" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-extrabold text-amber-600">
            {
              deliveries.filter(
                (d: any) =>
                  d.deliveryStatus === "In Transit" ||
                  d.deliveryStatus === "Pending"
              ).length
            }
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Awaiting field arrival confirmation
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
            <span>Completed Deliveries</span>
            <div className="h-8 w-8 rounded-xl bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-extrabold text-emerald-600">
            {
              deliveries.filter((d: any) => d.deliveryStatus === "Delivered")
                .length
            }
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Verified handoffs to partner LGUs/NGOs
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
            <span>Fleet Readiness Status</span>
            <div className="h-8 w-8 rounded-xl bg-sky-50 flex items-center justify-center">
              <ShieldCheck className="h-4 w-4 text-sky-600" />
            </div>
          </div>
          <p className="mt-3 text-lg font-extrabold text-slate-900">
            {vehicleType}
          </p>
          <p
            className={`mt-1 text-xs font-bold ${
              isAvailable ? "text-emerald-600" : "text-amber-600"
            }`}
          >
            ● {isAvailable ? "Available for Dispatch" : "Unavailable / Busy"}
          </p>
        </div>
      </div>

      {/* TAB 1: ASSIGNED DELIVERIES QUEUE */}
      {activeTab === "deliveries" && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Field Logistics Dispatch Queue
              </h2>
              <p className="text-xs text-slate-500">
                Update transit milestones in real time. Confirming delivery
                automatically marks the parent{" "}
                <code className="text-slate-700">ReliefRequest</code> as{" "}
                <code className="text-emerald-700 font-semibold">
                  Fulfilled
                </code>
                .
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search organization or sector..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="rounded-xl border border-slate-300 pl-9 pr-3 py-1.5 text-xs text-slate-900"
                />
              </div>
              {["ALL", "Pending", "In Transit", "Delivered"].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                    statusFilter === st
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-4">Delivery ID</th>
                  <th className="py-3.5 px-4">Requisition</th>
                  <th className="py-3.5 px-4">Receiving Organization</th>
                  <th className="py-3.5 px-4">Destination Sector</th>
                  <th className="py-3.5 px-4">Dispatch Date</th>
                  <th className="py-3.5 px-4">Current Status</th>
                  <th className="py-3.5 px-4 text-right">Field Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredDeliveries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      No assigned deliveries match your filter.
                    </td>
                  </tr>
                ) : (
                  filteredDeliveries.map((del: any) => (
                    <tr key={del.deliveryId} className="hover:bg-slate-50/80">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        #DEL-{del.deliveryId}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        #REQ-{del.requestId}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {del.orgName}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-rose-500" />
                          {del.location}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          {del.dispatchDate}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={del.deliveryStatus} />
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          {del.deliveryStatus === "Pending" && (
                            <button
                              onClick={() =>
                                handleUpdateDeliveryStatus(
                                  del.deliveryId,
                                  "In Transit"
                                )
                              }
                              disabled={updatingId === del.deliveryId}
                              className="rounded-xl bg-amber-500 hover:bg-amber-600 px-3 py-1.5 text-xs font-bold text-slate-950 transition disabled:opacity-50"
                            >
                              Start Transit
                            </button>
                          )}
                          {del.deliveryStatus !== "Delivered" ? (
                            <button
                              onClick={() =>
                                handleUpdateDeliveryStatus(
                                  del.deliveryId,
                                  "Delivered"
                                )
                              }
                              disabled={updatingId === del.deliveryId}
                              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white transition disabled:opacity-50"
                            >
                              {updatingId === del.deliveryId
                                ? "Updating..."
                                : "Confirm Delivery"}
                            </button>
                          ) : (
                            <span className="text-[11px] font-semibold text-emerald-700">
                              ✓ Handoff Verified
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: VEHICLE & AVAILABILITY PROFILE */}
      {activeTab === "profile" && (
        <div className="max-w-2xl bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="bg-slate-900 px-6 py-4 text-white">
            <h2 className="text-sm sm:text-base font-bold">
              Volunteer Driver &amp; Fleet Vehicle Configuration
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Updates both{" "}
              <code className="text-emerald-300">UserAccount</code> and{" "}
              <code className="text-emerald-300">Volunteer</code> tables in
              Supabase PostgreSQL.
            </p>
          </div>

          <form onSubmit={handleSaveProfile} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Driver Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Mobile / Radio Contact Information
              </label>
              <input
                type="text"
                value={contactInfo}
                onChange={(e) => setContactInfo(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Assigned Logistics Vehicle Type
              </label>
              <select
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900"
              >
                <option value="Truck">6-Wheeler Cargo Truck</option>
                <option value="Van">Utility L300 / Closed Van</option>
                <option value="Pickup / 4x4">Off-Road 4x4 Pickup</option>
                <option value="Motorcycle">Rapid Response Motorcycle</option>
                <option value="Boat / Watercraft">
                  Rescue Boat / Amphibious Craft
                </option>
              </select>
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAvailable}
                  onChange={(e) => setIsAvailable(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600"
                />
                <span className="text-sm font-semibold text-slate-800">
                  Mark my vehicle as{" "}
                  <span className="text-emerald-700 font-bold">
                    Available for Immediate Dispatch
                  </span>
                </span>
              </label>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={savingProfile}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition disabled:opacity-50"
              >
                {savingProfile
                  ? "Saving to Supabase..."
                  : "Save Fleet Profile"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: NOTIFICATIONS */}
      {activeTab === "notifications" && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900">
              Field Dispatch Notifications
            </h2>
            <p className="text-xs text-slate-500">
              Real-time alerts when Central Command assigns a relief delivery to
              your vehicle.
            </p>
          </div>
          <div className="divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No dispatch notifications recorded yet.
              </div>
            ) : (
              notifications.map((n: any) => (
                <div
                  key={n.notificationId}
                  className={`p-4 flex items-center justify-between gap-4 ${
                    n.isRead ? "bg-white" : "bg-emerald-50/40"
                  }`}
                >
                  <div className="space-y-1">
                    <p className="text-xs sm:text-sm font-semibold text-slate-900">
                      {n.message}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {n.dateSent
                        ? new Date(n.dateSent).toLocaleString()
                        : "Just now"}
                    </p>
                  </div>
                  {!n.isRead && (
                    <button
                      onClick={() =>
                        handleMarkNotificationRead(n.notificationId)
                      }
                      className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 shrink-0"
                    >
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      Mark Read
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </PortalSidebarLayout>
  );
}
