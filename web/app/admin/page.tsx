"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Package,
  HeartHandshake,
  Truck,
  Building2,
  FileBarChart,
  Search,
  Plus,
  CheckCircle2,
  Printer,
  Download,
  RefreshCw,
  Users,
  Bell,
} from "lucide-react";
import PortalHeader from "@/components/PortalHeader";
import { PortalShellSkeleton } from "@/components/SkeletonUI";
import {
  apiFetch,
  getCachedData,
  setCachedData,
  getSavedSession,
  UserSession,
} from "@/lib/api";

type AdminTab =
  | "overview"
  | "events"
  | "requests"
  | "donations"
  | "inventory"
  | "deliveries"
  | "stakeholders"
  | "reports";

export default function AdminPortalPage() {
  const router = useRouter();
  const [session, setSession] = useState<UserSession | null>(null);
  const [data, setData] = useState<any>(() => getCachedData("admin_overview"));
  const [loading, setLoading] = useState<boolean>(
    () => !getCachedData("admin_overview")
  );
  const [syncing, setSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 7;

  // Forms state
  const [newEventName, setNewEventName] = useState("");
  const [newEventLocation, setNewEventLocation] = useState("");
  const [newItemName, setNewItemName] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("Food");
  const [newItemUnit, setNewItemUnit] = useState("Packs");
  const [newItemStock, setNewItemStock] = useState(500);
  const [dispatchReqId, setDispatchReqId] = useState<number>(0);
  const [dispatchVolId, setDispatchVolId] = useState<number>(0);
  const [activeReport, setActiveReport] = useState<
    "operationalSummary" | "inventoryHealth" | "donorImpact"
  >("operationalSummary");
  const [toast, setToast] = useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 4000);
  };

  const refreshData = async () => {
    setSyncing(true);
    try {
      const fresh = await apiFetch("/api/admin/overview");
      setData(fresh);
      setCachedData("admin_overview", fresh);
    } catch (e: any) {
      showToast(e.message || "Sync failed");
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  useEffect(() => {
    const s = getSavedSession();
    if (!s) {
      router.push("/");
      return;
    }
    setSession(s);
    refreshData();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [activeTab, searchQuery, statusFilter]);

  if (loading && !data) {
    return <PortalShellSkeleton title="Loading Admin Operations Console" />;
  }

  const metrics = data?.metrics || {};
  const events: any[] = data?.events || [];
  const inventory: any[] = data?.inventory || [];
  const donations: any[] = data?.donations || [];
  const requests: any[] = data?.requests || [];
  const deliveries: any[] = data?.deliveries || [];
  const volunteers: any[] = data?.volunteers || [];
  const organizations: any[] = data?.organizations || [];
  const donors: any[] = data?.donors || [];
  const reports = data?.reports || {};

  // Actions
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventName || !newEventLocation) return;
    await apiFetch("/api/events", {
      method: "POST",
      body: JSON.stringify({
        eventName: newEventName,
        location: newEventLocation,
        status: "Active",
      }),
    });
    setNewEventName("");
    setNewEventLocation("");
    showToast("Master Disaster Event registered.");
    refreshData();
  };

  const handleToggleEventStatus = async (ev: any) => {
    const next = ev.status === "Active" ? "Resolved" : "Active";
    await apiFetch("/api/events", {
      method: "PUT",
      body: JSON.stringify({ eventId: ev.eventId, status: next }),
    });
    showToast(`Event #${ev.eventId} transitioned to ${next}.`);
    refreshData();
  };

  const handleUpdateRequestStatus = async (reqId: number, status: string) => {
    await apiFetch("/api/requests", {
      method: "PUT",
      body: JSON.stringify({ requestId: reqId, status }),
    });
    showToast(
      `Request #${reqId} marked ${status} (Warehouse inventory synchronized atomically).`
    );
    refreshData();
  };

  const handleUpdateDonationStatus = async (donId: number, status: string) => {
    await apiFetch("/api/donations", {
      method: "PUT",
      body: JSON.stringify({ donationId: donId, status }),
    });
    showToast(
      `Donation #${donId} marked ${status} (Warehouse stock credited atomically).`
    );
    refreshData();
  };

  const handleAddInventoryItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName) return;
    await apiFetch("/api/inventory", {
      method: "POST",
      body: JSON.stringify({
        itemName: newItemName,
        category: newItemCategory,
        unitOfMeasure: newItemUnit,
        currentStock: Number(newItemStock),
      }),
    });
    setNewItemName("");
    showToast("Master ReliefGood & Initial Stock added.");
    refreshData();
  };

  const handleAdjustStock = async (inv: any, delta: number) => {
    const updated = Math.max(0, Number(inv.currentStock) + delta);
    await apiFetch("/api/inventory", {
      method: "PUT",
      body: JSON.stringify({
        inventoryId: inv.inventoryId,
        currentStock: updated,
      }),
    });
    showToast(`Updated ${inv.itemName} balance to ${updated} ${inv.unitOfMeasure}.`);
    refreshData();
  };

  const handleCreateDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchReqId) return;
    await apiFetch("/api/deliveries", {
      method: "POST",
      body: JSON.stringify({
        requestId: Number(dispatchReqId),
        volunteerId: dispatchVolId ? Number(dispatchVolId) : null,
        deliveryStatus: "In Transit",
      }),
    });
    showToast(`Delivery dispatched for Request #${dispatchReqId}.`);
    refreshData();
  };

  const handleUpdateDeliveryStatus = async (delId: number, status: string) => {
    await apiFetch("/api/deliveries", {
      method: "PUT",
      body: JSON.stringify({ deliveryId: delId, deliveryStatus: status }),
    });
    showToast(`Delivery #${delId} updated to ${status}.`);
    refreshData();
  };

  const exportReportCsv = () => {
    const rows = reports[activeReport] || [];
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(","),
      ...rows.map((r: any) =>
        headers
          .map((h) => `"${String(r[h] ?? "").replace(/"/g, '""')}"`)
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `DRRMS_Report_${activeReport}_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <PortalHeader
        session={session}
        portalTitle="DRRMS Administrator Operations Console"
        portalSubtitle="Master Data Steward & Resource Allocation Control Center"
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Top Institutional Banner */}
        <div className="rounded-xl bg-gradient-to-r from-[#002060] to-[#1F4E79] border-t-4 border-amber-400 p-5 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-amber-300">
              Institutional Data Owner &amp; Steward Console
            </div>
            <h1 className="text-xl font-bold mt-0.5">
              National Disaster Relief &amp; Resource Distribution Management
            </h1>
            <p className="text-xs text-blue-100 mt-0.5">
              Atomic 3NF Split-Transactions • Master Catalog Deduplication • Live Decision Analytics
            </p>
          </div>
          <button
            onClick={refreshData}
            disabled={syncing}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 hover:bg-white/25 border border-white/20 px-3.5 py-2 text-xs font-semibold text-white transition self-start sm:self-auto"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing JDBC..." : "Refresh Live DB"}
          </button>
        </div>

        {toast && (
          <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-800 shadow-sm flex items-center gap-2 no-print">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            {toast}
          </div>
        )}

        {/* Executive KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 no-print">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-[11px] font-semibold text-slate-500">
              Active Disasters
            </div>
            <div className="text-2xl font-bold text-rose-600 mt-1">
              {metrics.activeDisasters ?? 0}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Master Event Registry
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-[11px] font-semibold text-slate-500">
              Pending Requests
            </div>
            <div className="text-2xl font-bold text-amber-600 mt-1">
              {metrics.pendingRequests ?? 0}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Awaiting Steward Approval
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-[11px] font-semibold text-slate-500">
              Logged Donations
            </div>
            <div className="text-2xl font-bold text-emerald-600 mt-1">
              {metrics.totalDonations ?? 0}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              3NF Inflow Pledges
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-[11px] font-semibold text-slate-500">
              Master Relief Goods
            </div>
            <div className="text-2xl font-bold text-[#002060] mt-1">
              {metrics.reliefGoodsCount ?? 0}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Standardized SKUs
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-[11px] font-semibold text-slate-500">
              Field Volunteers
            </div>
            <div className="text-2xl font-bold text-indigo-600 mt-1">
              {metrics.registeredVolunteers ?? 0}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Active Fleet Drivers
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-[11px] font-semibold text-slate-500">
              Fulfilled Deliveries
            </div>
            <div className="text-2xl font-bold text-teal-600 mt-1">
              {metrics.completedDeliveries ?? 0}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Verified Dispatches
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 pb-3 no-print">
          {[
            { id: "overview", label: "1. Executive Overview", icon: AlertTriangle },
            { id: "events", label: "2. Disaster Events", icon: AlertTriangle },
            { id: "requests", label: "3. Relief Requests", icon: Building2 },
            { id: "donations", label: "4. Donations Ledger", icon: HeartHandshake },
            { id: "inventory", label: "5. Warehouse Inventory", icon: Package },
            { id: "deliveries", label: "6. Fleet Deliveries", icon: Truck },
            { id: "stakeholders", label: "7. Master Stakeholders", icon: Users },
            { id: "reports", label: "8. Analytical Reports (3)", icon: FileBarChart },
          ].map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => {
                  setActiveTab(t.id as AdminTab);
                  setSearchQuery("");
                  setStatusFilter("ALL");
                }}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition ${
                  active
                    ? "bg-[#002060] text-white shadow-sm"
                    : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-1">
                Pending Relief Requests Queue (Steward Action Required)
              </h3>
              <p className="text-xs text-slate-500 mb-3">
                Approving a request atomically deducts requested items from Warehouse Inventory
              </p>
              <div className="divide-y divide-slate-100">
                {requests
                  .filter((r) => r.status === "Pending")
                  .slice(0, 5)
                  .map((r) => (
                    <div
                      key={r.requestId}
                      className="py-3 flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-800">
                          #{r.requestId} • {r.orgName}
                        </div>
                        <div className="text-slate-500">
                          Event: {r.eventName} ({r.requestDate})
                        </div>
                        <div className="text-[11px] text-slate-600 mt-0.5">
                          Items:{" "}
                          {(r.items || [])
                            .map((i: any) => `${i.itemName} (${i.quantity})`)
                            .join(", ")}
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          handleUpdateRequestStatus(r.requestId, "Approved")
                        }
                        className="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white shrink-0"
                      >
                        Approve &amp; Deduct Stock
                      </button>
                    </div>
                  ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-1">
                Warehouse Stock &amp; Replenishment Alerts
              </h3>
              <p className="text-xs text-slate-500 mb-3">
                Derived operational balances monitored against minimum threshold
              </p>
              <div className="divide-y divide-slate-100">
                {inventory.slice(0, 6).map((inv) => {
                  const low = inv.currentStock <= 200;
                  return (
                    <div
                      key={inv.inventoryId}
                      className="py-2.5 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-slate-800">
                          {inv.itemName}
                        </span>
                        <span className="text-slate-400 ml-2">
                          [{inv.category}]
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">
                          {inv.currentStock} {inv.unitOfMeasure}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            low
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}
                        >
                          {low ? "LOW STOCK" : "SUFFICIENT"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: DISASTER EVENTS */}
        {activeTab === "events" && (
          <div className="space-y-5">
            <form
              onSubmit={handleCreateEvent}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col sm:flex-row items-end gap-3"
            >
              <div className="flex-1 w-full">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  New Disaster Event Name (Master Registry)
                </label>
                <input
                  type="text"
                  required
                  value={newEventName}
                  onChange={(e) => setNewEventName(e.target.value)}
                  placeholder="e.g. Super Typhoon Pepito"
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
                />
              </div>
              <div className="flex-1 w-full">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Affected Province / Region
                </label>
                <input
                  type="text"
                  required
                  value={newEventLocation}
                  onChange={(e) => setNewEventLocation(e.target.value)}
                  placeholder="e.g. Ilocos Norte / Cagayan Valley"
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
                />
              </div>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#002060] hover:bg-[#1F4E79] px-4 py-2 text-xs font-bold text-white shrink-0"
              >
                <Plus className="h-3.5 w-3.5" />
                Register Event
              </button>
            </form>

            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {["ALL", "Active", "Resolved"].map((st) => (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
                        statusFilter === st
                          ? "bg-[#002060] text-white"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search events or locations..."
                    className="rounded-lg border border-slate-300 pl-8 pr-3 py-1.5 text-xs w-64"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="p-3">ID</th>
                      <th className="p-3">Disaster Event Name</th>
                      <th className="p-3">Location</th>
                      <th className="p-3">Start Date</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Governance Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {events
                      .filter(
                        (ev) =>
                          (statusFilter === "ALL" ||
                            ev.status === statusFilter) &&
                          (ev.eventName
                            .toLowerCase()
                            .includes(searchQuery.toLowerCase()) ||
                            ev.location
                              .toLowerCase()
                              .includes(searchQuery.toLowerCase()))
                      )
                      .slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
                      .map((ev) => (
                        <tr key={ev.eventId} className="hover:bg-slate-50">
                          <td className="p-3 font-bold">#{ev.eventId}</td>
                          <td className="p-3 font-semibold text-slate-900">
                            {ev.eventName}
                          </td>
                          <td className="p-3 text-slate-600">{ev.location}</td>
                          <td className="p-3 text-slate-500">{ev.startDate}</td>
                          <td className="p-3">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                                ev.status === "Active"
                                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                                  : "bg-slate-100 text-slate-600 border border-slate-200"
                              }`}
                            >
                              {ev.status}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => handleToggleEventStatus(ev)}
                              className="rounded-lg border border-slate-300 hover:bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700"
                            >
                              Mark {ev.status === "Active" ? "Resolved" : "Active"}
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: RELIEF REQUESTS */}
        {activeTab === "requests" && (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {["ALL", "Pending", "Approved", "Fulfilled"].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
                      statusFilter === st
                        ? "bg-[#002060] text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
              <div className="relative">
                <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search organization or disaster..."
                  className="rounded-lg border border-slate-300 pl-8 pr-3 py-1.5 text-xs w-64"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="p-3">Req ID</th>
                    <th className="p-3">Requesting Organization</th>
                    <th className="p-3">Disaster Event</th>
                    <th className="p-3">3NF Line Items (RequestItem)</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Steward Allocation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {requests
                    .filter(
                      (r) =>
                        (statusFilter === "ALL" || r.status === statusFilter) &&
                        ((r.orgName || "")
                          .toLowerCase()
                          .includes(searchQuery.toLowerCase()) ||
                          (r.eventName || "")
                            .toLowerCase()
                            .includes(searchQuery.toLowerCase()))
                    )
                    .map((r) => (
                      <tr key={r.requestId} className="hover:bg-slate-50">
                        <td className="p-3 font-bold">#{r.requestId}</td>
                        <td className="p-3 font-semibold text-slate-900">
                          {r.orgName}
                        </td>
                        <td className="p-3 text-slate-600">{r.eventName}</td>
                        <td className="p-3 text-slate-700">
                          {(r.items || []).map((it: any) => (
                            <span
                              key={it.requestItemId}
                              className="inline-block rounded bg-slate-100 border border-slate-200 px-2 py-0.5 mr-1 mb-1 text-[11px]"
                            >
                              {it.itemName}: <b>{it.quantity}</b> {it.unitOfMeasure}
                            </span>
                          ))}
                        </td>
                        <td className="p-3 text-slate-500">{r.requestDate}</td>
                        <td className="p-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                              r.status === "Pending"
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : r.status === "Approved"
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="p-3 text-right space-x-1.5">
                          {r.status === "Pending" && (
                            <button
                              onClick={() =>
                                handleUpdateRequestStatus(
                                  r.requestId,
                                  "Approved"
                                )
                              }
                              className="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 text-xs font-bold text-white"
                            >
                              Approve &amp; Deduct
                            </button>
                          )}
                          {r.status === "Approved" && (
                            <button
                              onClick={() =>
                                handleUpdateRequestStatus(
                                  r.requestId,
                                  "Fulfilled"
                                )
                              }
                              className="rounded-lg bg-[#002060] hover:bg-[#1F4E79] px-2.5 py-1 text-xs font-bold text-white"
                            >
                              Mark Fulfilled
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: DONATIONS LEDGER */}
        {activeTab === "donations" && (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {["ALL", "Pending", "Approved"].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
                      statusFilter === st
                        ? "bg-[#002060] text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
              <div className="relative">
                <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search donor or event..."
                  className="rounded-lg border border-slate-300 pl-8 pr-3 py-1.5 text-xs w-64"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="p-3">ID</th>
                    <th className="p-3">Donor Name</th>
                    <th className="p-3">Target Disaster Event</th>
                    <th className="p-3">Donated Items (DonationItem)</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Steward Verification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {donations
                    .filter(
                      (d) =>
                        (statusFilter === "ALL" || d.status === statusFilter) &&
                        ((d.donorName || "")
                          .toLowerCase()
                          .includes(searchQuery.toLowerCase()) ||
                          (d.eventName || "")
                            .toLowerCase()
                            .includes(searchQuery.toLowerCase()))
                    )
                    .map((d) => (
                      <tr key={d.donationId} className="hover:bg-slate-50">
                        <td className="p-3 font-bold">#{d.donationId}</td>
                        <td className="p-3 font-semibold text-slate-900">
                          {d.donorName}
                        </td>
                        <td className="p-3 text-slate-600">{d.eventName}</td>
                        <td className="p-3">
                          {(d.items || []).map((it: any) => (
                            <span
                              key={it.itemId}
                              className="inline-block rounded bg-emerald-50 border border-emerald-200 px-2 py-0.5 mr-1 mb-1 text-[11px] text-emerald-900"
                            >
                              {it.itemName}: <b>+{it.quantity}</b> {it.unitOfMeasure}
                            </span>
                          ))}
                        </td>
                        <td className="p-3 text-slate-500">{d.donationDate}</td>
                        <td className="p-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                              d.status === "Approved"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                            }`}
                          >
                            {d.status}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          {d.status === "Pending" && (
                            <button
                              onClick={() =>
                                handleUpdateDonationStatus(
                                  d.donationId,
                                  "Approved"
                                )
                              }
                              className="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3 py-1 text-xs font-bold text-white"
                            >
                              Verify &amp; Credit Stock
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: WAREHOUSE INVENTORY & MASTER CATALOG */}
        {activeTab === "inventory" && (
          <div className="space-y-5">
            <form
              onSubmit={handleAddInventoryItem}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm grid grid-cols-1 sm:grid-cols-5 gap-3 items-end"
            >
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Master ReliefGood Name
                </label>
                <input
                  type="text"
                  required
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="e.g. Family Hygiene Kit"
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Category
                </label>
                <select
                  value={newItemCategory}
                  onChange={(e) => setNewItemCategory(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs bg-white"
                >
                  <option value="Food">Food</option>
                  <option value="Water">Water</option>
                  <option value="Medicine">Medicine</option>
                  <option value="Non-Food">Non-Food</option>
                  <option value="Shelter">Shelter</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Unit &amp; Opening Stock
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={newItemUnit}
                    onChange={(e) => setNewItemUnit(e.target.value)}
                    placeholder="Packs"
                    className="w-1/2 rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                  />
                  <input
                    type="number"
                    min={0}
                    value={newItemStock}
                    onChange={(e) => setNewItemStock(Number(e.target.value))}
                    className="w-1/2 rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="rounded-lg bg-[#002060] hover:bg-[#1F4E79] py-2 px-4 text-xs font-bold text-white"
              >
                + Add Commodity
              </button>
            </form>

            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="p-3">Good ID (Master PK)</th>
                    <th className="p-3">Commodity Name</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Operational Stock Balance</th>
                    <th className="p-3">Health Status</th>
                    <th className="p-3 text-right">Manual Audit Adjustment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {inventory.map((inv) => (
                    <tr key={inv.inventoryId} className="hover:bg-slate-50">
                      <td className="p-3 font-bold">#{inv.goodId}</td>
                      <td className="p-3 font-semibold text-slate-900">
                        {inv.itemName}
                      </td>
                      <td className="p-3 text-slate-600">{inv.category}</td>
                      <td className="p-3 font-bold text-slate-900">
                        {inv.currentStock} {inv.unitOfMeasure}
                      </td>
                      <td className="p-3">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            inv.currentStock <= 200
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : inv.currentStock <= 1000
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}
                        >
                          {inv.currentStock <= 200
                            ? "CRITICAL ALERT"
                            : inv.currentStock <= 1000
                            ? "LOW STOCK"
                            : "SUFFICIENT"}
                        </span>
                      </td>
                      <td className="p-3 text-right space-x-1.5">
                        <button
                          onClick={() => handleAdjustStock(inv, 100)}
                          className="rounded border border-slate-300 hover:bg-slate-100 px-2 py-1 text-[11px] font-bold"
                        >
                          +100
                        </button>
                        <button
                          onClick={() => handleAdjustStock(inv, -100)}
                          className="rounded border border-slate-300 hover:bg-slate-100 px-2 py-1 text-[11px] font-bold"
                        >
                          -100
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 6: DELIVERIES */}
        {activeTab === "deliveries" && (
          <div className="space-y-5">
            <form
              onSubmit={handleCreateDelivery}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-3 items-end"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Relief Request to Dispatch
                </label>
                <select
                  required
                  value={dispatchReqId}
                  onChange={(e) => setDispatchReqId(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs bg-white"
                >
                  <option value={0}>-- Choose Approved/Pending Request --</option>
                  {requests.map((r) => (
                    <option key={r.requestId} value={r.requestId}>
                      Req #{r.requestId} — {r.orgName} ({r.eventName}) [{r.status}]
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Assign Field Volunteer Driver
                </label>
                <select
                  value={dispatchVolId}
                  onChange={(e) => setDispatchVolId(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs bg-white"
                >
                  <option value={0}>-- Unassigned / Select Volunteer --</option>
                  {volunteers.map((v) => (
                    <option key={v.volunteerId} value={v.volunteerId}>
                      {v.volunteerName} ({v.vehicleType} •{" "}
                      {v.isAvailable ? "Available" : "Busy"})
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="rounded-lg bg-[#002060] hover:bg-[#1F4E79] py-2 px-4 text-xs font-bold text-white"
              >
                Dispatch Fleet Delivery
              </button>
            </form>

            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="p-3">Delivery ID</th>
                    <th className="p-3">Request ID</th>
                    <th className="p-3">Recipient Organization &amp; Destination</th>
                    <th className="p-3">Assigned Volunteer</th>
                    <th className="p-3">Dispatch Date</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Update Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {deliveries.map((d) => (
                    <tr key={d.deliveryId} className="hover:bg-slate-50">
                      <td className="p-3 font-bold">#{d.deliveryId}</td>
                      <td className="p-3 font-semibold">Req #{d.requestId}</td>
                      <td className="p-3">
                        <div className="font-semibold text-slate-900">
                          {d.orgName}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {d.location}
                        </div>
                      </td>
                      <td className="p-3 text-slate-700">{d.volunteerName}</td>
                      <td className="p-3 text-slate-500">{d.dispatchDate}</td>
                      <td className="p-3">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                            d.deliveryStatus === "Delivered"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : d.deliveryStatus === "In Transit"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {d.deliveryStatus}
                        </span>
                      </td>
                      <td className="p-3 text-right space-x-1.5">
                        {d.deliveryStatus !== "Delivered" && (
                          <button
                            onClick={() =>
                              handleUpdateDeliveryStatus(
                                d.deliveryId,
                                "Delivered"
                              )
                            }
                            className="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 text-xs font-bold text-white"
                          >
                            Mark Delivered
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 7: MASTER STAKEHOLDERS */}
        {activeTab === "stakeholders" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-2">
                Partner Organizations &amp; LGUs ({organizations.length})
              </h3>
              <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                {organizations.map((o) => (
                  <div key={o.orgId} className="py-2 text-xs">
                    <div className="font-bold text-slate-800">
                      #{o.orgId} • {o.orgName}
                    </div>
                    <div className="text-slate-500">{o.location}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-2">
                Registered Donors ({donors.length})
              </h3>
              <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                {donors.map((d) => (
                  <div
                    key={d.donorId}
                    className="py-2 flex items-center justify-between text-xs"
                  >
                    <span className="font-bold text-slate-800">
                      #{d.donorId} • {d.donorName}
                    </span>
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                      {d.donorType}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-2">
                Field Volunteers ({volunteers.length})
              </h3>
              <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                {volunteers.map((v) => (
                  <div
                    key={v.volunteerId}
                    className="py-2 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-800">
                        #{v.volunteerId} • {v.volunteerName}
                      </div>
                      <div className="text-slate-500">{v.vehicleType}</div>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        v.isAvailable
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {v.isAvailable ? "Available" : "On Assignment"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 8: ANALYTICAL REPORTS (ReportDAO) */}
        {activeTab === "reports" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setActiveReport("operationalSummary")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                    activeReport === "operationalSummary"
                      ? "bg-[#002060] text-white"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  Report 1: Disaster Operational Summary
                </button>
                <button
                  onClick={() => setActiveReport("inventoryHealth")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                    activeReport === "inventoryHealth"
                      ? "bg-[#002060] text-white"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  Report 2: Warehouse Stock &amp; Replenishment Alert
                </button>
                <button
                  onClick={() => setActiveReport("donorImpact")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                    activeReport === "donorImpact"
                      ? "bg-[#002060] text-white"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  Report 3: Donor Contribution &amp; Impact Ledger
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={exportReportCsv}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white"
                >
                  <Download className="h-3.5 w-3.5" />
                  Export CSV
                </button>
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 px-3 py-1.5 text-xs font-bold text-white"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print Report
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 border-b border-slate-200 pb-3">
                <div className="text-xs font-bold text-[#002060] uppercase">
                  Official Decision-Support Analytical Output (ReportDAO)
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {activeReport === "operationalSummary" &&
                    "Report 1: Disaster Relief Operational Summary (Multi-Table SQL JOIN & GROUP BY)"}
                  {activeReport === "inventoryHealth" &&
                    "Report 2: Warehouse Stock Status & Replenishment Alert Report"}
                  {activeReport === "donorImpact" &&
                    "Report 3: Donor Contribution & Impact Audit Ledger"}
                </h3>
              </div>

              {activeReport === "operationalSummary" && (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Event ID</th>
                      <th className="p-2.5">Disaster Event</th>
                      <th className="p-2.5">Location</th>
                      <th className="p-2.5">Status</th>
                      <th className="p-2.5">Total Donations</th>
                      <th className="p-2.5">Total Aid Requests</th>
                      <th className="p-2.5">Dispatched Deliveries</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(reports.operationalSummary || []).map((r: any) => (
                      <tr key={r.eventId}>
                        <td className="p-2.5 font-bold">#{r.eventId}</td>
                        <td className="p-2.5 font-semibold">{r.eventName}</td>
                        <td className="p-2.5">{r.location}</td>
                        <td className="p-2.5">{r.status}</td>
                        <td className="p-2.5 font-bold text-emerald-700">
                          {r.totalDonations}
                        </td>
                        <td className="p-2.5 font-bold text-amber-700">
                          {r.totalRequests}
                        </td>
                        <td className="p-2.5 font-bold text-blue-700">
                          {r.totalDeliveries}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {activeReport === "inventoryHealth" && (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Good ID</th>
                      <th className="p-2.5">Relief Item</th>
                      <th className="p-2.5">Category</th>
                      <th className="p-2.5">Current Warehouse Stock</th>
                      <th className="p-2.5">Cumulative Donated</th>
                      <th className="p-2.5">Cumulative Requested</th>
                      <th className="p-2.5">Stock Health Alert</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(reports.inventoryHealth || []).map((r: any) => (
                      <tr key={r.goodId}>
                        <td className="p-2.5 font-bold">#{r.goodId}</td>
                        <td className="p-2.5 font-semibold">{r.itemName}</td>
                        <td className="p-2.5">{r.category}</td>
                        <td className="p-2.5 font-bold">
                          {r.currentStockFormatted}
                        </td>
                        <td className="p-2.5 text-emerald-700 font-semibold">
                          +{r.totalDonatedQty}
                        </td>
                        <td className="p-2.5 text-amber-700 font-semibold">
                          -{r.totalRequestedQty}
                        </td>
                        <td className="p-2.5">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                              r.stockHealth === "CRITICAL ALERT"
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : r.stockHealth === "LOW STOCK"
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            }`}
                          >
                            {r.stockHealth}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {activeReport === "donorImpact" && (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Donor ID</th>
                      <th className="p-2.5">Donor Name</th>
                      <th className="p-2.5">Classification</th>
                      <th className="p-2.5">Contact Info</th>
                      <th className="p-2.5">Donations Count</th>
                      <th className="p-2.5">Events Supported</th>
                      <th className="p-2.5">Total Items Donated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(reports.donorImpact || []).map((r: any) => (
                      <tr key={r.donorId}>
                        <td className="p-2.5 font-bold">#{r.donorId}</td>
                        <td className="p-2.5 font-semibold">{r.donorName}</td>
                        <td className="p-2.5">{r.donorType}</td>
                        <td className="p-2.5">{r.contactInfo}</td>
                        <td className="p-2.5 font-bold">{r.totalDonations}</td>
                        <td className="p-2.5">{r.eventsSupported}</td>
                        <td className="p-2.5 font-bold text-emerald-700">
                          {r.totalItemsDonated} units
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
