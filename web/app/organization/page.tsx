"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  ClipboardPlus,
  ClipboardList,
  Truck,
  Bell,
  Search,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Check,
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

interface RequestLineDraft {
  goodId: number;
  quantity: number;
}

function getPortalRouteForRole(role?: string): string {
  const r = (role || "").toLowerCase();
  if (r === "admin" || r === "manager") return "/admin";
  if (r === "donor") return "/donor";
  if (r === "organization") return "/organization";
  if (r === "volunteer") return "/volunteer";
  return "/";
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

  const [selectedEventId, setSelectedEventId] = useState<number>(1);
  const [draftItems, setDraftItems] = useState<RequestLineDraft[]>([
    { goodId: 1, quantity: 100 },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const hasInitDefaultsRef = useRef(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const initDefaultsFromPayload = (payload: any) => {
    if (hasInitDefaultsRef.current) return;
    if (payload?.events?.length > 0 || payload?.goods?.length > 0) {
      hasInitDefaultsRef.current = true;
      if (payload.events?.length > 0) {
        const firstActive =
          payload.events.find((ev: any) => ev.status === "Active") ||
          payload.events[0];
        setSelectedEventId(firstActive.eventId);
      }
      if (payload.goods?.length > 0) {
        setDraftItems([{ goodId: payload.goods[0].goodId, quantity: 100 }]);
      }
    }
  };

  const loadOrgPortal = useCallback(
    async (userId: number, isBackground = false) => {
      const cacheKey = `org_portal_${userId}`;
      if (!isBackground) {
        const cached = getCachedData<any>(cacheKey);
        if (cached) {
          setData(cached);
          initDefaultsFromPayload(cached);
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
        initDefaultsFromPayload(fresh);
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
    const role = (saved.user.role || "").toLowerCase();
    if (role !== "organization") {
      router.replace(getPortalRouteForRole(role));
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
    const safeValue = Number.isFinite(value) ? value : 0;
    setDraftItems((prev) =>
      prev.map((item, idx) =>
        idx === index ? { ...item, [field]: safeValue } : item
      )
    );
  };

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user) return;

    const mergedMap = new Map<number, number>();
    for (const it of draftItems) {
      if (it.goodId > 0 && Number.isInteger(it.quantity) && it.quantity > 0) {
        mergedMap.set(it.goodId, (mergedMap.get(it.goodId) || 0) + it.quantity);
      }
    }
    const validItems = Array.from(mergedMap.entries()).map(
      ([goodId, quantity]) => ({ goodId, quantity })
    );

    if (!selectedEventId || validItems.length === 0) {
      setBanner({
        type: "error",
        text: "Please select a disaster event and enter at least one item with quantity > 0.",
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
        text: `Request #${res.requestId} submitted and queued for Steward approval.`,
      });
      setDraftItems([
        { goodId: data?.goods?.[0]?.goodId || 1, quantity: 100 },
      ]);
      await loadOrgPortal(session.user.userId, true);
      setActiveTab("history");
    } catch (err: any) {
      setBanner({
        type: "error",
        text: err.message || "Failed to submit request.",
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

  const requestedTotalsByGood = useMemo(() => {
    const totals = new Map<number, number>();
    for (const line of draftItems) {
      if (line.goodId > 0 && line.quantity > 0) {
        totals.set(line.goodId, (totals.get(line.goodId) || 0) + line.quantity);
      }
    }
    return totals;
  }, [draftItems]);

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
    "Organization";
  const orgLocation =
    data?.organization?.location || session?.location || "Metro Manila";

  const navItems: SidebarNavItem[] = [
    {
      id: "request",
      label: "New Request",
      icon: <ClipboardPlus className="h-4 w-4" />,
    },
    {
      id: "history",
      label: "My Requests",
      icon: <ClipboardList className="h-4 w-4" />,
      badge: requests.length,
    },
    {
      id: "deliveries",
      label: "Deliveries",
      icon: <Truck className="h-4 w-4" />,
      badge: deliveries.length,
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
      portalTitle="Organization Portal"
      portalSubtitle={`${orgName} • ${orgLocation}`}
      roleBadge="Organization"
      navItems={navItems}
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      unreadCount={unreadCount}
      onOpenNotifications={() => setActiveTab("notifications")}
      notificationsList={notifications}
      onMarkNotificationRead={handleMarkNotificationRead}
      onSync={() => session?.user && loadOrgPortal(session.user.userId, true)}
      syncing={refreshing}
    >
      {banner && (
        <div
          role={banner.type === "error" ? "alert" : "status"}
          aria-live="polite"
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
            type="button"
            onClick={() => setBanner(null)}
            className="text-xs underline ml-4"
          >
            Close
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white hover:bg-blue-50/20 rounded-2xl border border-slate-200/80 hover:border-blue-300 p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Requests</span>
            <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs">
              <ClipboardList className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-3xl font-black text-slate-900 tracking-tight">
            {requests.length}
          </p>
          <p className="text-[11px] text-blue-600 font-semibold mt-1">
            Municipal Aid Requisitions
          </p>
        </div>

        <div className="bg-white hover:bg-emerald-50/20 rounded-2xl border border-slate-200/80 hover:border-emerald-300 p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Approved</span>
            <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-xs">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-3xl font-black text-emerald-600 tracking-tight">
            {
              requests.filter(
                (r: any) =>
                  r.status === "Approved" || r.status === "Fulfilled"
              ).length
            }
          </p>
          <p className="text-[11px] text-emerald-600 font-semibold mt-1">
            Verified &amp; Authorized
          </p>
        </div>

        <div className="bg-white hover:bg-amber-50/20 rounded-2xl border border-slate-200/80 hover:border-amber-300 p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Deliveries</span>
            <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-xs">
              <Truck className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-3xl font-black text-amber-600 tracking-tight">
            {deliveries.length}
          </p>
          <p className="text-[11px] text-amber-600 font-semibold mt-1">
            Fleet Inbound / Dispatched
          </p>
        </div>

        <div className="bg-white hover:bg-indigo-50/20 rounded-2xl border border-slate-200/80 hover:border-indigo-300 p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Location</span>
            <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-xs">
              <Building2 className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-lg font-black text-slate-900 truncate tracking-tight">
            {orgLocation}
          </p>
          <p className="text-[11px] text-indigo-600 font-semibold mt-1">
            Assigned LGU Jurisdiction
          </p>
        </div>
      </div>

      {/* TAB 1: NEW REQUEST */}
      {activeTab === "request" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
            <h2 className="text-base font-bold text-slate-900 mb-4">
              Request Relief Goods
            </h2>

            <form onSubmit={handleRequestSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="org-event-select"
                  className="block text-xs font-medium text-slate-700 mb-1.5"
                >
                  Disaster Event
                </label>
                <select
                  id="org-event-select"
                  name="eventId"
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                  required
                >
                  {events.map((ev: any) => (
                    <option key={ev.eventId} value={ev.eventId}>
                      {ev.eventName} ({ev.location}) [{ev.status}]
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-slate-700">
                    Requested Items
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
                  const stockObj = inventory.find(
                    (i: any) => i.goodId === line.goodId
                  );
                  const avail = stockObj?.currentStock ?? 0;
                  const totalForGood = requestedTotalsByGood.get(line.goodId) || 0;
                  const exceedsStock = totalForGood > avail;
                  return (
                    <div
                      key={index}
                      className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200/70"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                        <div className="sm:col-span-7">
                          <select
                            aria-label={`Requested item ${index + 1}`}
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
                              aria-label={`Requested quantity for item ${index + 1}`}
                              type="number"
                              min={1}
                              max={1000000}
                              step={1}
                              value={line.quantity || ""}
                              onChange={(e) =>
                                updateDraftLine(
                                  index,
                                  "quantity",
                                  Number(e.target.value)
                                )
                              }
                              className={`w-full rounded-xl border bg-white px-3 py-2 text-sm text-slate-900 font-semibold ${
                                exceedsStock
                                  ? "border-amber-400"
                                  : "border-slate-200"
                              }`}
                              required
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 pointer-events-none">
                              Avail: {avail}
                            </span>
                          </div>
                        </div>

                        <div className="sm:col-span-1 flex justify-end">
                          <button
                            type="button"
                            aria-label={`Remove requested item ${index + 1}`}
                            onClick={() => removeDraftLine(index)}
                            disabled={draftItems.length <= 1}
                            className="rounded-lg p-2 text-slate-400 hover:text-rose-600 disabled:opacity-30"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      {exceedsStock && (
                        <p className="text-[11px] font-medium text-amber-700 flex items-center gap-1 px-1">
                          <AlertTriangle className="h-3 w-3 shrink-0" />
                          <span>
                            Requested quantity ({totalForGood}) exceeds current
                            warehouse stock ({avail}). Approval may wait for
                            replenishment.
                          </span>
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-500/25 transition-all disabled:opacity-50"
                >
                  {submitting ? "Submitting Request..." : "Submit Relief Requisition"}
                </button>
              </div>
            </form>
          </div>

          {/* Available Stock */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900">
              Available Warehouse Stock
            </h3>
            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
              {inventory.map((item: any) => (
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
                  <div className="text-xs font-bold text-slate-800">
                    {item.currentStock.toLocaleString()} {item.unitOfMeasure}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: REQUESTS HISTORY */}
      {activeTab === "history" && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-base font-bold text-slate-900">My Requests</h2>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  aria-label="Search my requests"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="rounded-xl border border-slate-200 pl-9 pr-3 py-1.5 text-xs text-slate-900"
                />
              </div>
              {["ALL", "Pending", "Approved", "Fulfilled"].map((st) => (
                <button
                  key={st}
                  type="button"
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

          <div
            tabIndex={0}
            role="region"
            aria-label="My relief requests table"
            className="overflow-x-auto"
          >
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-semibold uppercase text-slate-400">
                  <th scope="col" className="py-3 px-4">ID</th>
                  <th scope="col" className="py-3 px-4">Disaster Event</th>
                  <th scope="col" className="py-3 px-4">Date</th>
                  <th scope="col" className="py-3 px-4">Items</th>
                  <th scope="col" className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No requests found.
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((r: any) => (
                    <tr key={r.requestId} className="hover:bg-slate-50/60">
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        #{r.requestId}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-800">
                        {r.eventName}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {r.requestDate}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          {(r.items || []).map((it: any, idx: number) => (
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

      {/* TAB 3: DELIVERIES */}
      {activeTab === "deliveries" && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900">
              Incoming Deliveries
            </h2>
          </div>

          <div
            tabIndex={0}
            role="region"
            aria-label="Incoming deliveries table"
            className="overflow-x-auto"
          >
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-semibold uppercase text-slate-400">
                  <th scope="col" className="py-3 px-4">ID</th>
                  <th scope="col" className="py-3 px-4">Request</th>
                  <th scope="col" className="py-3 px-4">Volunteer Driver</th>
                  <th scope="col" className="py-3 px-4">Destination</th>
                  <th scope="col" className="py-3 px-4">Date</th>
                  <th scope="col" className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {deliveries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No deliveries assigned yet.
                    </td>
                  </tr>
                ) : (
                  deliveries.map((del: any) => (
                    <tr key={del.deliveryId} className="hover:bg-slate-50/60">
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        #{del.deliveryId}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-800">
                        Request #{del.requestId}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">
                        {del.volunteerName}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {del.location}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
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
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900">
              Notifications
            </h2>
          </div>
          <div className="divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No notifications found.
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
                      type="button"
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
