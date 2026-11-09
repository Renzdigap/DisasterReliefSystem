"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  ClipboardPlus,
  ClipboardList,
  Truck,
  Bell,
  Search,
  RefreshCw,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Clock,
  Check,
  Boxes,
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

interface RequestLineDraft {
  goodId: number;
  quantity: number;
}

export default function OrganizationPortalPage() {
  const router = useRouter();
  const [session, setSession] = useState<UserSession | null>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "request" | "history" | "deliveries" | "notifications"
  >("request");
  const [banner, setBanner] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // 3NF ReliefRequest + RequestItem Form State
  const [selectedEventId, setSelectedEventId] = useState<number>(1);
  const [draftItems, setDraftItems] = useState<RequestLineDraft[]>([
    { goodId: 1, quantity: 100 },
  ]);
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const loadOrgPortal = useCallback(
    async (userId: number, isBackground = false) => {
      const cacheKey = `org_portal_${userId}`;
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
          `/api/portal/organization?userId=${userId}`
        );
        setData(fresh);
        setCachedData(cacheKey, fresh);
        if (fresh.events?.length > 0 && selectedEventId === 1) {
          setSelectedEventId(fresh.events[0].eventId);
        }
      } catch (err: any) {
        setBanner({
          type: "error",
          text: err.message || "Failed to load Organization Portal data.",
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedEventId]
  );

  useEffect(() => {
    const saved = getSavedSession();
    if (!saved || !saved.user) {
      router.replace("/");
      return;
    }
    setSession(saved);
    loadOrgPortal(saved.user.userId);
  }, [router, loadOrgPortal]);

  const addDraftLine = () => {
    const defaultGoodId = data?.goods?.[0]?.goodId || 1;
    setDraftItems((prev) => [...prev, { goodId: defaultGoodId, quantity: 50 }]);
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

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user) return;

    const validItems = draftItems.filter(
      (it) => it.goodId > 0 && it.quantity > 0
    );
    if (!selectedEventId || validItems.length === 0) {
      setBanner({
        type: "error",
        text: "Please select an active Disaster Event and at least one relief commodity.",
      });
      return;
    }

    setSubmitting(true);
    setBanner(null);
    try {
      const res = await apiFetch<{ requestId: number }>("/api/requests", {
        method: "POST",
        body: JSON.stringify({
          userId: session.user.userId,
          eventId: selectedEventId,
          items: validItems,
        }),
      });
      setBanner({
        type: "success",
        text: `Emergency Relief Request #${res.requestId} logged atomically (${validItems.length} RequestItem lines). Queued for Steward approval and dispatch.`,
      });
      setDraftItems([
        { goodId: data?.goods?.[0]?.goodId || 1, quantity: 100 },
      ]);
      await loadOrgPortal(session.user.userId, true);
      setActiveTab("history");
    } catch (err: any) {
      setBanner({
        type: "error",
        text: err.message || "Failed to submit emergency relief request.",
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
      await loadOrgPortal(session.user.userId, true);
    } catch (err: any) {
      setBanner({ type: "error", text: err.message });
    }
  };

  const requests = data?.requests || [];
  const deliveries = data?.deliveries || [];
  const events = data?.events || [];
  const goods = data?.goods || [];
  const inventory = data?.inventory || [];
  const notifications = data?.notifications || [];

  const unreadCount = useMemo(
    () => notifications.filter((n: any) => !n.isRead).length,
    [notifications]
  );

  const filteredRequests = useMemo(() => {
    return requests.filter((r: any) => {
      const matchesStatus =
        statusFilter === "ALL" || r.status === statusFilter;
      const q = searchQuery.toLowerCase();
      const itemsStr = (r.items || [])
        .map((i: any) => i.itemName)
        .join(" ")
        .toLowerCase();
      const matchesSearch =
        !q ||
        String(r.requestId).includes(q) ||
        (r.eventName || "").toLowerCase().includes(q) ||
        itemsStr.includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [requests, statusFilter, searchQuery]);

  if (loading && !data) {
    return <PortalShellSkeleton />;
  }

  const orgName =
    data?.organization?.orgName ||
    session?.orgName ||
    session?.user?.fullName ||
    "Partner Organization";
  const orgLocation =
    data?.organization?.location || session?.location || "Field Command Sector";

  return (
    <div className="min-h-screen bg-[#F4F6F9] flex flex-col">
      <PortalHeader
        session={session}
        portalTitle="Partner Organization & LGU Requisition Portal"
        portalSubtitle={`${orgName} • Jurisdiction: ${orgLocation}`}
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
              className="text-xs underline ml-4"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 border-t-4 border-t-[#002060] p-5 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
              <span>Total Requisitions Filed</span>
              <ClipboardList className="h-4 w-4 text-[#002060]" />
            </div>
            <p className="mt-2 text-3xl font-extrabold text-slate-900">
              {requests.length}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {requests.filter((r: any) => r.status === "Pending").length}{" "}
              Awaiting Steward Approval
            </p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 border-t-4 border-t-emerald-600 p-5 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
              <span>Approved & Fulfilled</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="mt-2 text-3xl font-extrabold text-emerald-700">
              {
                requests.filter(
                  (r: any) =>
                    r.status === "Approved" || r.status === "Fulfilled"
                ).length
              }
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Stock allocated from Central Warehouse
            </p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 border-t-4 border-t-amber-500 p-5 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
              <span>Incoming Fleet Dispatches</span>
              <Truck className="h-4 w-4 text-amber-600" />
            </div>
            <p className="mt-2 text-3xl font-extrabold text-slate-900">
              {deliveries.length}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {
                deliveries.filter((d: any) => d.deliveryStatus === "In Transit")
                  .length
              }{" "}
              Currently In Transit
            </p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 border-t-4 border-t-blue-600 p-5 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
              <span>LGU / NGO Jurisdiction</span>
              <Building2 className="h-4 w-4 text-blue-600" />
            </div>
            <p className="mt-2 text-base font-bold text-slate-900 truncate">
              {orgName}
            </p>
            <p className="mt-1 text-xs text-slate-500 flex items-center gap-1 truncate">
              <MapPin className="h-3 w-3 text-rose-500 shrink-0" />
              {orgLocation}
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-xl border border-slate-200 p-2 shadow-sm flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setActiveTab("request")}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs sm:text-sm font-semibold transition ${
                activeTab === "request"
                  ? "bg-[#002060] text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <ClipboardPlus className="h-4 w-4" />
              <span>Submit Emergency Relief Request</span>
            </button>

            <button
              onClick={() => setActiveTab("history")}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs sm:text-sm font-semibold transition ${
                activeTab === "history"
                  ? "bg-[#002060] text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <ClipboardList className="h-4 w-4" />
              <span>My Requisitions ({requests.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("deliveries")}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs sm:text-sm font-semibold transition ${
                activeTab === "deliveries"
                  ? "bg-[#002060] text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Truck className="h-4 w-4" />
              <span>Incoming Fleet Deliveries ({deliveries.length})</span>
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
              session?.user && loadOrgPortal(session.user.userId, true)
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

        {/* TAB 1: SUBMIT EMERGENCY RELIEF REQUEST */}
        {activeTab === "request" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-[#002060] px-6 py-4 text-white">
                <h2 className="text-base font-bold">
                  Emergency Relief Requisition Form (3NF Split-Transaction)
                </h2>
                <p className="text-xs text-blue-200 mt-0.5">
                  Atomically records request header in{" "}
                  <code className="text-amber-200">ReliefRequest</code> and
                  itemized lines in{" "}
                  <code className="text-amber-200">RequestItem</code>.
                </p>
              </div>

              <form onSubmit={handleRequestSubmit} className="p-6 space-y-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    Associated Calamity / Emergency Operation
                  </label>
                  <select
                    value={selectedEventId}
                    onChange={(e) => setSelectedEventId(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#002060] focus:outline-none"
                    required
                  >
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
                      Requested Relief Commodities (RequestItem Lines)
                    </label>
                    <button
                      type="button"
                      onClick={addDraftLine}
                      className="inline-flex items-center gap-1 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 text-xs font-bold text-[#002060] transition"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Commodity Line
                    </button>
                  </div>

                  {draftItems.map((line, index) => {
                    const stockObj = inventory.find(
                      (i: any) => i.goodId === line.goodId
                    );
                    return (
                      <div
                        key={index}
                        className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center bg-slate-50 p-3 rounded-lg border border-slate-200"
                      >
                        <div className="sm:col-span-7">
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                            Commodity #{index + 1}
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
                                {g.itemName} ({g.category} — {g.unitOfMeasure})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="sm:col-span-4">
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                            Requested Qty (Avail:{" "}
                            {stockObj?.currentStock ?? "N/A"})
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
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2 flex items-center justify-end border-t border-slate-200">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#002060] hover:bg-[#1F4E79] px-6 py-2.5 text-sm font-bold text-white shadow-sm transition disabled:opacity-50"
                  >
                    <ClipboardPlus className="h-4 w-4 text-amber-300" />
                    <span>
                      {submitting
                        ? "Submitting Requisition..."
                        : "Transmit Official Relief Request"}
                    </span>
                  </button>
                </div>
              </form>
            </div>

            {/* Available Central Warehouse Stock */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
              <div className="border-b border-slate-200 pb-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Boxes className="h-4 w-4 text-[#002060]" />
                  Central Warehouse Stock Availability
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Live allocatable balances across all relief categories.
                </p>
              </div>
              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {inventory.map((item: any) => (
                  <div
                    key={item.inventoryId}
                    className="rounded-lg border border-slate-200 p-3 flex items-center justify-between bg-slate-50/60"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        {item.itemName}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {item.category}
                      </div>
                    </div>
                    <div className="text-xs font-extrabold text-[#002060]">
                      {item.currentStock.toLocaleString()} {item.unitOfMeasure}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MY RELIEF REQUESTS */}
        {activeTab === "history" && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Organization Requisition History & Status
                </h2>
                <p className="text-xs text-slate-500">
                  Tracks approval and fulfillment status for all requests filed
                  by {orgName}.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search request or item..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="rounded-lg border border-slate-300 pl-9 pr-3 py-1.5 text-xs text-slate-900"
                  />
                </div>
                {["ALL", "Pending", "Approved", "Fulfilled"].map((st) => (
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
                    <th className="py-3 px-4">Request ID</th>
                    <th className="py-3 px-4">Calamity Event</th>
                    <th className="py-3 px-4">Date Filed</th>
                    <th className="py-3 px-4">Requested Line Items (3NF)</th>
                    <th className="py-3 px-4">Approval Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {filteredRequests.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-8 text-center text-slate-500"
                      >
                        No relief requisitions match your filter.
                      </td>
                    </tr>
                  ) : (
                    filteredRequests.map((r: any) => (
                      <tr key={r.requestId} className="hover:bg-slate-50/80">
                        <td className="py-3.5 px-4 font-bold text-[#002060]">
                          #REQ-{r.requestId}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-900">
                          {r.eventName}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                            {r.requestDate}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1.5">
                            {(r.items || []).map((it: any, idx: number) => (
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
                          <StatusBadge status={r.status} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: INCOMING FLEET DELIVERIES */}
        {activeTab === "deliveries" && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900">
                Incoming Fleet Deliveries & Logistics Tracker
              </h2>
              <p className="text-xs text-slate-500">
                Real-time dispatch assignments from the Central Warehouse to{" "}
                {orgName}.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    <th className="py-3 px-4">Delivery ID</th>
                    <th className="py-3 px-4">Linked Request</th>
                    <th className="py-3 px-4">Assigned Field Volunteer</th>
                    <th className="py-3 px-4">Destination Sector</th>
                    <th className="py-3 px-4">Dispatch Date</th>
                    <th className="py-3 px-4">Logistics Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {deliveries.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-8 text-center text-slate-500"
                      >
                        No fleet dispatches assigned to your organization yet.
                      </td>
                    </tr>
                  ) : (
                    deliveries.map((del: any) => (
                      <tr key={del.deliveryId} className="hover:bg-slate-50/80">
                        <td className="py-3.5 px-4 font-bold text-[#002060]">
                          #DEL-{del.deliveryId}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-800">
                          Request #{del.requestId}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 font-medium">
                          {del.volunteerName}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          {del.location}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          {del.dispatchDate}
                        </td>
                        <td className="py-3.5 px-4">
                          <StatusBadge status={del.deliveryStatus} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: NOTIFICATIONS */}
        {activeTab === "notifications" && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900">
                Organization Dispatch & Approval Alerts
              </h2>
              <p className="text-xs text-slate-500">
                System notifications for requisition approvals and fleet
                deliveries.
              </p>
            </div>
            <div className="divide-y divide-slate-200">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  No notifications found.
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
