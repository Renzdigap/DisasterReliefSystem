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
  RefreshCw,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  MapPin,
  Boxes,
  Sparkles,
  Check,
  ShieldCheck,
} from "lucide-react";
import PortalHeader from "@/components/PortalHeader";
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

  // Donation Pledge 3NF Split-Transaction Form State
  const [selectedEventId, setSelectedEventId] = useState<number>(0);
  const [draftItems, setDraftItems] = useState<LineItemDraft[]>([
    { goodId: 1, quantity: 50 },
  ]);
  const [submitting, setSubmitting] = useState(false);

  // History Table Filters
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
          text: err.message || "Failed to load Donor Portal data.",
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
        text: "Please include at least one valid relief good with a positive quantity.",
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
        text: `Donation Pledge #${res.donationId} recorded atomically (${validItems.length} line item(s) saved to DonationItem table). Awaiting Steward verification.`,
      });
      setDraftItems([
        { goodId: data?.goods?.[0]?.goodId || 1, quantity: 50 },
      ]);
      await loadDonorPortal(session.user.userId, true);
      setActiveTab("history");
    } catch (err: any) {
      setBanner({
        type: "error",
        text: err.message || "Failed to record donation pledge.",
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

  return (
    <div className="min-h-screen bg-[#F4F6F9] flex flex-col">
      <PortalHeader
        session={session}
        portalTitle="Citizen & Corporate Donor Portal"
        portalSubtitle={`${session?.user?.fullName || "Registered Donor"} • ${
          data?.donor?.donorType || session?.donorType || "Individual"
        } Contributor`}
        unreadCount={unreadCount}
        onOpenNotifications={() => setActiveTab("notifications")}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {banner && (
          <div
            className={`rounded-xl border px-4 py-3 flex items-center justify-between text-sm font-medium shadow-sm ${
              banner.type === "success"
                ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                : "bg-rose-50 border-rose-300 text-rose-900"
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
              className="text-xs underline ml-4 opacity-75 hover:opacity-100"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 border-t-4 border-t-[#002060] p-5 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
              <span>Total Pledges Logged</span>
              <HeartHandshake className="h-4 w-4 text-[#002060]" />
            </div>
            <p className="mt-2 text-3xl font-extrabold text-slate-900">
              {donations.length}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {
                donations.filter((d: any) => d.status === "Approved").length
              }{" "}
              Verified & Credited to Warehouse
            </p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 border-t-4 border-t-emerald-600 p-5 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
              <span>Total Relief Units Pledged</span>
              <Boxes className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="mt-2 text-3xl font-extrabold text-emerald-700">
              {totalItemsDonated.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Across 3NF DonationItem records
            </p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 border-t-4 border-t-amber-500 p-5 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
              <span>Active Calamity Zones</span>
              <MapPin className="h-4 w-4 text-amber-600" />
            </div>
            <p className="mt-2 text-3xl font-extrabold text-slate-900">
              {events.filter((e: any) => e.status === "Active").length}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Accepting direct commodity pledges
            </p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 border-t-4 border-t-blue-600 p-5 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
              <span>Donor Classification</span>
              <ShieldCheck className="h-4 w-4 text-blue-600" />
            </div>
            <p className="mt-2 text-xl font-bold text-slate-900 truncate">
              {data?.donor?.donorType || session?.donorType || "Individual"}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Donor ID #{data?.donor?.donorId || session?.donorId || 1} • RA
              10173 Verified
            </p>
          </div>
        </div>

        {/* Navigation Bar */}
        <div className="bg-white rounded-xl border border-slate-200 p-2 shadow-sm flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setActiveTab("pledge")}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs sm:text-sm font-semibold transition ${
                activeTab === "pledge"
                  ? "bg-[#002060] text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <PackagePlus className="h-4 w-4" />
              <span>Make a Donation Pledge</span>
            </button>

            <button
              onClick={() => setActiveTab("history")}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs sm:text-sm font-semibold transition ${
                activeTab === "history"
                  ? "bg-[#002060] text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <History className="h-4 w-4" />
              <span>My Contributions Ledger ({donations.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("needs")}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs sm:text-sm font-semibold transition ${
                activeTab === "needs"
                  ? "bg-[#002060] text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <AlertTriangle className="h-4 w-4" />
              <span>Urgent Warehouse Needs & Calamities</span>
            </button>

            <button
              onClick={() => setActiveTab("notifications")}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs sm:text-sm font-semibold transition ${
                activeTab === "notifications"
                  ? "bg-[#002060] text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Bell className="h-4 w-4" />
              <span>Notifications</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-slate-950">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>

          <button
            onClick={() =>
              session?.user && loadDonorPortal(session.user.userId, true)
            }
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
            />
            <span>{refreshing ? "Syncing JDBC..." : "Sync Live Data"}</span>
          </button>
        </div>

        {/* TAB 1: MAKE A DONATION PLEDGE */}
        {activeTab === "pledge" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-[#002060] px-6 py-4 text-white flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-300" />
                    Record New Multi-Item Donation Pledge (3NF Split-Transaction)
                  </h2>
                  <p className="text-xs text-blue-200 mt-0.5">
                    Atomically inserts header into <code className="text-amber-200">Donation</code> and commodity rows into <code className="text-amber-200">DonationItem</code> via Java JDBC.
                  </p>
                </div>
              </div>

              <form onSubmit={handlePledgeSubmit} className="p-6 space-y-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    Target Disaster Operation (or General Warehouse Reserve)
                  </label>
                  <select
                    value={selectedEventId}
                    onChange={(e) => setSelectedEventId(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#002060] focus:outline-none"
                  >
                    <option value={0}>
                      General Relief Fund (Unrestricted National Reserve)
                    </option>
                    {events.map((ev: any) => (
                      <option key={ev.eventId} value={ev.eventId}>
                        [{ev.status}] {ev.eventName} — {ev.location}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Pledged Relief Commodities (DonationItem Lines)
                    </label>
                    <button
                      type="button"
                      onClick={addDraftLine}
                      className="inline-flex items-center gap-1 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 text-xs font-bold text-[#002060] transition"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Another Commodity Line
                    </button>
                  </div>

                  {draftItems.map((line, index) => {
                    const selectedGood = goods.find(
                      (g: any) => g.goodId === line.goodId
                    );
                    return (
                      <div
                        key={index}
                        className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center bg-slate-50 p-3 rounded-lg border border-slate-200"
                      >
                        <div className="sm:col-span-7">
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                            Relief Commodity #{index + 1}
                          </label>
                          <select
                            value={line.goodId}
                            onChange={(e) =>
                              updateDraftLine(
                                index,
                                "goodId",
                                Number(e.target.value)
                              )
                            }
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                          >
                            {goods.map((g: any) => (
                              <option key={g.goodId} value={g.goodId}>
                                {g.itemName} ({g.category} — measured in{" "}
                                {g.unitOfMeasure})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="sm:col-span-4">
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                            Quantity ({selectedGood?.unitOfMeasure || "Units"})
                          </label>
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
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 font-semibold"
                            required
                          />
                        </div>

                        <div className="sm:col-span-1 flex sm:justify-end pt-4">
                          <button
                            type="button"
                            onClick={() => removeDraftLine(index)}
                            disabled={draftItems.length <= 1}
                            className="rounded-lg p-2 text-rose-600 hover:bg-rose-50 disabled:opacity-30"
                            title="Remove Line"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-200">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#002060] hover:bg-[#1F4E79] px-6 py-2.5 text-sm font-bold text-white shadow-sm transition disabled:opacity-50"
                  >
                    <HeartHandshake className="h-4 w-4 text-amber-300" />
                    <span>
                      {submitting
                        ? "Committing JDBC Transaction..."
                        : "Submit Official Donation Pledge"}
                    </span>
                  </button>
                </div>
              </form>
            </div>

            {/* Right Column: Priority Warehouse Shortages */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
              <div className="border-b border-slate-200 pb-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  Priority Warehouse Shortages
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Real-time stock levels from central <code className="text-slate-700">Inventory</code> table.
                </p>
              </div>

              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {inventory.map((item: any) => {
                  const isLow = item.currentStock <= 300;
                  return (
                    <div
                      key={item.inventoryId}
                      className="rounded-lg border border-slate-200 p-3 flex items-center justify-between gap-2 bg-slate-50/60"
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-900">
                          {item.itemName}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Category: {item.category}
                        </div>
                      </div>
                      <div className="text-right">
                        <div
                          className={`text-xs font-extrabold ${
                            isLow ? "text-rose-600" : "text-emerald-700"
                          }`}
                        >
                          {item.currentStock.toLocaleString()}{" "}
                          {item.unitOfMeasure}
                        </div>
                        <span
                          className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                            isLow
                              ? "bg-rose-100 text-rose-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {isLow ? "URGENT NEED" : "Stable"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MY CONTRIBUTIONS LEDGER */}
        {activeTab === "history" && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  My Contributions & Verification Ledger
                </h2>
                <p className="text-xs text-slate-500">
                  Complete audit trail of your pledged relief goods and Steward
                  verification status.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search event or item..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="rounded-lg border border-slate-300 pl-9 pr-3 py-1.5 text-xs text-slate-900 focus:border-[#002060] focus:outline-none"
                  />
                </div>

                {["ALL", "Pending", "Approved"].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                      statusFilter === st
                        ? "bg-[#002060] text-white"
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
                  <tr className="bg-slate-100 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    <th className="py-3 px-4">Pledge ID</th>
                    <th className="py-3 px-4">Target Calamity Operation</th>
                    <th className="py-3 px-4">Date Logged</th>
                    <th className="py-3 px-4">3NF DonationItem Breakdown</th>
                    <th className="py-3 px-4">Verification Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {filteredDonations.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-8 text-center text-slate-500"
                      >
                        No donation records match your current filter.
                      </td>
                    </tr>
                  ) : (
                    filteredDonations.map((don: any) => (
                      <tr
                        key={don.donationId}
                        className="hover:bg-slate-50/80 transition"
                      >
                        <td className="py-3.5 px-4 font-bold text-[#002060]">
                          #DON-{don.donationId}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-900">
                          {don.eventName || "General Relief Fund"}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                            {don.donationDate}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1.5">
                            {(don.items || []).map((it: any, idx: number) => (
                              <span
                                key={idx}
                                className="inline-flex items-center rounded-md bg-blue-50 border border-blue-200 px-2 py-0.5 text-[11px] font-semibold text-[#002060]"
                              >
                                {it.itemName}: {it.quantity} {it.unitOfMeasure}
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

        {/* TAB 3: ACTIVE DISASTER ZONES & NEEDS */}
        {activeTab === "needs" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {events.map((ev: any) => (
              <div
                key={ev.eventId}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400">
                      EVENT #{ev.eventId}
                    </span>
                    <StatusBadge status={ev.status} />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    {ev.eventName}
                  </h3>
                  <p className="text-xs text-slate-600 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-rose-600" />
                    <span>{ev.location}</span>
                    <span className="text-slate-300">•</span>
                    <span>Declared: {ev.startDate}</span>
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    Direct commodity routing available
                  </span>
                  <button
                    onClick={() => {
                      setSelectedEventId(ev.eventId);
                      setActiveTab("pledge");
                    }}
                    className="rounded-lg bg-[#002060] hover:bg-[#1F4E79] px-3.5 py-1.5 text-xs font-bold text-white transition"
                  >
                    Pledge to This Operation →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 4: SYSTEM NOTIFICATIONS */}
        {activeTab === "notifications" && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900">
                Donor Verification & Audit Notifications
              </h2>
              <p className="text-xs text-slate-500">
                Automated alerts triggered when Data Stewards verify and credit
                your pledged items into inventory.
              </p>
            </div>
            <div className="divide-y divide-slate-200">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  No notifications recorded for your account yet.
                </div>
              ) : (
                notifications.map((n: any) => (
                  <div
                    key={n.notificationId}
                    className={`p-4 flex items-center justify-between gap-4 ${
                      n.isRead ? "bg-white" : "bg-amber-50/60"
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
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 shrink-0"
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
      </main>
    </div>
  );
}
