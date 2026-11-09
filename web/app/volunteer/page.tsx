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

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [updatingId, setUpdatingId] = useState<number | null>(null);

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
          text: err.message || "Failed to load data.",
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
        text: `Delivery #${deliveryId} updated to ${newStatus}.`,
      });
      await loadVolunteerPortal(session.user.userId, true);
    } catch (err: any) {
      setBanner({
        type: "error",
        text: err.message || "Failed to update status.",
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
        text: "Profile saved.",
      });
      await loadVolunteerPortal(session.user.userId, true);
    } catch (err: any) {
      setBanner({
        type: "error",
        text: err.message || "Failed to save profile.",
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
      label: "My Deliveries",
      icon: <Truck className="h-4 w-4" />,
      badge: deliveries.length,
    },
    {
      id: "profile",
      label: "Vehicle Profile",
      icon: <UserCog className="h-4 w-4" />,
    },
    {
      id: "notifications",
      label: "Notifications",
      icon: <Bell className="h-4 w-4" />,
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
  ];

  return (
    <PortalSidebarLayout
      session={session}
      portalTitle="Volunteer Portal"
      portalSubtitle={`${fullName || session?.user?.fullName || "Volunteer"} • ${vehicleType}`}
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
          className={`rounded-xl border px-4 py-3 flex items-center justify-between text-xs sm:text-sm font-medium ${
            banner.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-rose-50 border-rose-200 text-rose-900"
          }`}
        >
          <div className="flex items-center gap-2">
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
            Close
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Total Assigned</span>
            <Truck className="h-4 w-4 text-blue-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {deliveries.length}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>In Transit</span>
            <Navigation className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {
              deliveries.filter(
                (d: any) =>
                  d.deliveryStatus === "In Transit" ||
                  d.deliveryStatus === "Pending"
              ).length
            }
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Completed</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {
              deliveries.filter((d: any) => d.deliveryStatus === "Delivered")
                .length
            }
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Status</span>
            <ShieldCheck className="h-4 w-4 text-slate-400" />
          </div>
          <p
            className={`mt-2 text-base font-bold ${
              isAvailable ? "text-emerald-600" : "text-amber-600"
            }`}
          >
            {isAvailable ? "Available" : "Busy"}
          </p>
        </div>
      </div>

      {/* TAB 1: DELIVERIES */}
      {activeTab === "deliveries" && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-base font-bold text-slate-900">
              Assigned Deliveries
            </h2>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="rounded-xl border border-slate-200 pl-9 pr-3 py-1.5 text-xs text-slate-900"
                />
              </div>
              {["ALL", "Pending", "In Transit", "Delivered"].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                    statusFilter === st
                      ? "bg-blue-600 text-white"
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
                <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-semibold uppercase text-slate-400">
                  <th className="py-3 px-4">ID</th>
                  <th className="py-3 px-4">Request</th>
                  <th className="py-3 px-4">Recipient</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredDeliveries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No deliveries found.
                    </td>
                  </tr>
                ) : (
                  filteredDeliveries.map((del: any) => (
                    <tr key={del.deliveryId} className="hover:bg-slate-50/60">
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        #{del.deliveryId}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        #{del.requestId}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-900">
                        {del.orgName}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-rose-500" />
                          {del.location}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {del.dispatchDate}
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
                              className="rounded-xl bg-amber-500 hover:bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition disabled:opacity-50"
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
                              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white transition disabled:opacity-50"
                            >
                              {updatingId === del.deliveryId
                                ? "Saving..."
                                : "Mark Delivered"}
                            </button>
                          ) : (
                            <span className="text-xs font-medium text-emerald-600">
                              Done
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

      {/* TAB 2: PROFILE */}
      {activeTab === "profile" && (
        <div className="max-w-xl bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
          <h2 className="text-base font-bold text-slate-900 mb-4">
            Vehicle &amp; Availability
          </h2>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Contact Info
              </label>
              <input
                type="text"
                value={contactInfo}
                onChange={(e) => setContactInfo(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Vehicle Type
              </label>
              <select
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900"
              >
                <option value="Truck">Truck</option>
                <option value="Van">Van</option>
                <option value="Pickup / 4x4">Pickup / 4x4</option>
                <option value="Motorcycle">Motorcycle</option>
                <option value="Boat / Watercraft">Boat</option>
              </select>
            </div>

            <div className="pt-1">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAvailable}
                  onChange={(e) => setIsAvailable(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600"
                />
                <span className="text-sm font-medium text-slate-700">
                  Available for dispatch
                </span>
              </label>
            </div>

            <div className="pt-3 flex justify-end">
              <button
                type="submit"
                disabled={savingProfile}
                className="rounded-xl bg-blue-600 hover:bg-blue-700 px-5 py-2 text-sm font-semibold text-white shadow-sm transition disabled:opacity-50"
              >
                {savingProfile ? "Saving..." : "Save Changes"}
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
              Notifications
            </h2>
          </div>
          <div className="divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No notifications yet.
              </div>
            ) : (
              notifications.map((n: any) => (
                <div
                  key={n.notificationId}
                  className={`p-4 flex items-center justify-between gap-4 ${
                    n.isRead ? "bg-white" : "bg-blue-50/40"
                  }`}
                >
                  <div className="space-y-0.5">
                    <p className="text-xs sm:text-sm font-medium text-slate-900">
                      {n.message}
                    </p>
                    <p className="text-[11px] text-slate-400">
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
                      className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 shrink-0"
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
