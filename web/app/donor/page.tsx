"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  HeartHandshake,
  PackagePlus,
  History,
  AlertTriangle,
  Bell,
  Search,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  MapPin,
  Boxes,
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

interface LineItemDraft {
  goodId: number;
  quantity: number;
}

export default function DonorPortalPage() {
  const router = useRouter();
  const [session, setSession] = useState<UserSession | null>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "pledge" | "history" | "needs" | "notifications"
  >("pledge");
  const [banner, setBanner] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [selectedEventId, setSelectedEventId] = useState<number>(0);
  const [draftItems, setDraftItems] = useState<LineItemDraft[]>([
    { goodId: 1, quantity: 50 },
  ]);
  const [submitting, setSubmitting] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const loadDonorPortal = useCallback(
    async (userId: number, isBackground = false) => {
      const cacheKey = `donor_portal_${userId}`;
      if (!isBackground) {
        const cached = getCachedData<any>(cacheKey);
        if (cached) {
          setData(cached);
          setLoading(false);
        }
      } else {
        setRefreshing(true);
      }

      try {
        const fresh = await apiFetch<any>(
          `/api/portal/donor?userId=${userId}`
        );
        setData(fresh);
        setCachedData(cacheKey, fresh);
        if (
          fresh.goods?.length > 0 &&
          draftItems.length === 1 &&
          draftItems[0].goodId === 1
        ) {
          setDraftItems([{ goodId: fresh.goods[0].goodId, quantity: 50 }]);
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
    [draftItems]
  );

  useEffect(() => {
    const saved = getSavedSession();
    if (!saved || !saved.user) {
      router.replace("/");
      return;
    }
    setSession(saved);
    loadDonorPortal(saved.user.userId);
  }, [router, loadDonorPortal]);

  const addDraftLine = () => {
    const defaultGoodId = data?.goods?.[0]?.goodId || 1;
    setDraftItems((prev) => [...prev, { goodId: defaultGoodId, quantity: 25 }]);
  };

  const removeDraftLine = (index: number) => {
    if (draftItems.length <= 1) return;
    setDraftItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const updateDraftLine = (
    index: number,
    field: "goodId" | "quantity",
    value: number
  ) => {
    setDraftItems((prev) =>
      prev.map((item, idx) =>
        idx === index ? { ...item, [field]: value } : item
      )
    );
  };

  const handlePledgeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user) return;

    const validItems = draftItems.filter(
      (it) => it.goodId > 0 && it.quantity > 0
    );
    if (validItems.length === 0) {
      setBanner({
        type: "error",
        text: "Please add at least one item.",
      });
      return;
    }

    setSubmitting(true);
    setBanner(null);
    try {
      const res = await apiFetch<{ donationId: number }>("/api/donations", {
        method: "POST",
        body: JSON.stringify({
          userId: session.user.userId,
          eventId: selectedEventId > 0 ? selectedEventId : null,
          items: validItems,
        }),
      });
      setBanner({
        type: "success",
        text: `Donation #${res.donationId} submitted.`,
      });
      setDraftItems([
        { goodId: data?.goods?.[0]?.goodId || 1, quantity: 50 },
      ]);
      await loadDonorPortal(session.user.userId, true);
      setActiveTab("history");
    } catch (err: any) {
      setBanner({
        type: "error",
        text: err.message || "Failed to submit donation.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkNotificationRead = async (notificationId: number) => {
    if (!session?.user) return;
    try {
      await apiFetch("/api/notifications/read", {
        method: "PUT",
        body: JSON.stringify({ notificationId }),
      });
      await loadDonorPortal(session.user.userId, true);
    } catch (err: any) {
      setBanner({ type: "error", text: err.message });
    }
  };

  const donations = data?.donations || [];
  const events = data?.events || [];
  const goods = data?.goods || [];
  const inventory = data?.inventory || [];
  const notifications = data?.notifications || [];

  const unreadCount = useMemo(
    () => notifications.filter((n: any) => !n.isRead).length,
    [notifications]
  );

  const totalItemsDonated = useMemo(() => {
    return donations.reduce((sum: number, d: any) => {
      const sub = (d.items || []).reduce(
        (acc: number, it: any) => acc + Number(it.quantity || 0),
        0
      );
      return sum + sub;
    }, 0);
  }, [donations]);

  const filteredDonations = useMemo(() => {
    return donations.filter((d: any) => {
      const matchesStatus =
        statusFilter === "ALL" || d.status === statusFilter;
      const q = searchQuery.toLowerCase();
      const itemSummary = (d.items || [])
        .map((i: any) => i.itemName)
        .join(" ")
        .toLowerCase();
      const matchesSearch =
        !q ||
        String(d.donationId).includes(q) ||
        (d.eventName || "").toLowerCase().includes(q) ||
        itemSummary.includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [donations, statusFilter, searchQuery]);

  if (loading && !data) {
    return <PortalShellSkeleton />;
  }

  const navItems: SidebarNavItem[] = [
    {
      id: "pledge",
      label: "New Donation",
      icon: <PackagePlus className="h-4 w-4" />,
    },
    {
      id: "history",
      label: "My Donations",
      icon: <History className="h-4 w-4" />,
      badge: donations.length,
    },
    {
      id: "needs",
      label: "Active Disasters",
      icon: <AlertTriangle className="h-4 w-4" />,
      badge: events.filter((e: any) => e.status === "Active").length,
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
      portalTitle="Donor Portal"
      portalSubtitle={session?.user?.fullName || "Donor"}
      roleBadge="Donor"
      navItems={navItems}
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      unreadCount={unreadCount}
      onOpenNotifications={() => setActiveTab("notifications")}
      onSync={() => session?.user && loadDonorPortal(session.user.userId, true)}
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
            <span>Total Donations</span>
            <HeartHandshake className="h-4 w-4 text-blue-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {donations.length}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Items Donated</span>
            <Boxes className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {totalItemsDonated.toLocaleString()}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Active Disasters</span>
            <MapPin className="h-4 w-4 text-rose-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {events.filter((e: any) => e.status === "Active").length}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Donor Type</span>
            <ShieldCheck className="h-4 w-4 text-slate-400" />
          </div>
          <p className="mt-2 text-lg font-bold text-slate-900 truncate">
            {data?.donor?.donorType || session?.donorType || "Individual"}
          </p>
        </div>
      </div>

      {/* TAB 1: NEW DONATION */}
      {activeTab === "pledge" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
            <h2 className="text-base font-bold text-slate-900 mb-4">
              Submit a Donation
            </h2>

            <form onSubmit={handlePledgeSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Disaster Event
                </label>
                <select
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                >
                  <option value={0}>General Relief Fund</option>
                  {events.map((ev: any) => (
                    <option key={ev.eventId} value={ev.eventId}>
                      {ev.eventName} ({ev.location})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-slate-700">
                    Items to Donate
                  </label>
                  <button
                    type="button"
                    onClick={addDraftLine}
                    className="inline-flex items-center gap-1 rounded-lg bg-slate-100 hover:bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 transition"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Item
                  </button>
                </div>

                {draftItems.map((line, index) => {
                  const selectedGood = goods.find(
                    (g: any) => g.goodId === line.goodId
                  );
                  return (
                    <div
                      key={index}
                      className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center bg-slate-50 p-3 rounded-xl border border-slate-200/70"
                    >
                      <div className="sm:col-span-7">
                        <select
                          value={line.goodId}
                          onChange={(e) =>
                            updateDraftLine(
                              index,
                              "goodId",
                              Number(e.target.value)
                            )
                          }
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                        >
                          {goods.map((g: any) => (
                            <option key={g.goodId} value={g.goodId}>
                              {g.itemName} ({g.unitOfMeasure})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-4">
                        <div className="relative">
                          <input
                            type="number"
                            min={1}
                            max={1000000}
                            value={line.quantity}
                            onChange={(e) =>
                              updateDraftLine(
                                index,
                                "quantity",
                                Number(e.target.value)
                              )
                            }
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 font-semibold"
                            required
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
                            {selectedGood?.unitOfMeasure || "Units"}
                          </span>
                        </div>
                      </div>

                      <div className="sm:col-span-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => removeDraftLine(index)}
                          disabled={draftItems.length <= 1}
                          className="rounded-lg p-2 text-slate-400 hover:text-rose-600 disabled:opacity-30"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-blue-600 hover:bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition disabled:opacity-50"
                >
                  {submitting ? "Submitting..." : "Submit Donation"}
                </button>
              </div>
            </form>
          </div>

          {/* Needed Items */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900">
              Current Warehouse Stock
            </h3>

            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
              {inventory.map((item: any) => {
                const isLow = item.currentStock <= 300;
                return (
                  <div
                    key={item.inventoryId}
                    className="rounded-xl border border-slate-100 p-3 flex items-center justify-between bg-slate-50/50"
                  >
                    <div>
                      <div className="text-xs font-semibold text-slate-900">
                        {item.itemName}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {item.category}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-slate-800">
                        {item.currentStock.toLocaleString()}{" "}
                        {item.unitOfMeasure}
                      </div>
                      {isLow && (
                        <span className="text-[10px] font-semibold text-rose-600">
                          Low Stock
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: HISTORY */}
      {activeTab === "history" && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-base font-bold text-slate-900">My Donations</h2>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="rounded-xl border border-slate-200 pl-9 pr-3 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                />
              </div>

              {["ALL", "Pending", "Approved"].map((st) => (
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
                  <th className="py-3 px-4">Disaster Event</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Items</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredDonations.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No donations found.
                    </td>
                  </tr>
                ) : (
                  filteredDonations.map((don: any) => (
                    <tr key={don.donationId} className="hover:bg-slate-50/60">
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        #{don.donationId}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-800">
                        {don.eventName || "General Fund"}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {don.donationDate}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          {(don.items || []).map((it: any, idx: number) => (
                            <span
                              key={idx}
                              className="rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700"
                            >
                              {it.itemName} ({it.quantity} {it.unitOfMeasure})
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={don.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: ACTIVE DISASTERS */}
      {activeTab === "needs" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {events.map((ev: any) => (
            <div
              key={ev.eventId}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm flex flex-col justify-between gap-4"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">
                    {ev.eventName}
                  </h3>
                  <StatusBadge status={ev.status} />
                </div>
                <p className="text-xs text-slate-500 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-rose-500" />
                  <span>{ev.location}</span>
                  <span>•</span>
                  <span>{ev.startDate}</span>
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => {
                    setSelectedEventId(ev.eventId);
                    setActiveTab("pledge");
                  }}
                  className="rounded-xl bg-blue-600 hover:bg-blue-700 px-3.5 py-1.5 text-xs font-semibold text-white transition"
                >
                  Donate to Event
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 4: NOTIFICATIONS */}
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
