"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  Users,
  Bell,
  Trash2,
  Check,
  ChevronLeft,
  ChevronRight,
  Radio,
  FileText,
} from "lucide-react";
import { PortalSidebarLayout, SidebarNavItem } from "@/components/PortalHeader";
import { PortalShellSkeleton, StatusBadge } from "@/components/SkeletonUI";
import {
  OperationalSummaryCharts,
  InventoryHealthCharts,
  DonorImpactCharts,
} from "@/components/ReportCharts";
import {
  EmergencyBroadcastModal,
  DeliveryWaybillModal,
} from "@/components/DisasterEnhancements";
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
  | "notifications"
  | "reports";

type DeleteTarget =
  | { kind: "event"; id: number; label: string }
  | { kind: "request"; id: number; label: string }
  | { kind: "donation"; id: number; label: string }
  | { kind: "inventory"; id: number; label: string }
  | { kind: "delivery"; id: number; label: string };

const PAGE_SIZE = 7;

function getPortalRouteForRole(role?: string): string {
  const r = (role || "").toLowerCase();
  if (r === "admin" || r === "manager") return "/admin";
  if (r === "donor") return "/donor";
  if (r === "organization") return "/organization";
  if (r === "volunteer") return "/volunteer";
  return "/";
}

function PaginationControls({
  totalItems,
  page,
  pageSize,
  onPageChange,
}: {
  totalItems: number;
  page: number;
  pageSize: number;
  onPageChange: (nextPage: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  if (totalItems === 0) return null;

  const start = (safePage - 1) * pageSize + 1;
  const end = Math.min(totalItems, safePage * pageSize);

  return (
    <div className="px-4 py-3 border-t border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600">
      <span>
        Showing <strong>{start}</strong>–<strong>{end}</strong> of{" "}
        <strong>{totalItems}</strong> records
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(safePage - 1)}
          disabled={safePage <= 1}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 px-2.5 py-1 font-semibold text-slate-700"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Prev
        </button>
        <span className="font-semibold text-slate-700 px-1">
          Page {safePage} of {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(safePage + 1)}
          disabled={safePage >= totalPages}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 px-2.5 py-1 font-semibold text-slate-700"
        >
          Next
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export default function AdminPortalPage() {
  const router = useRouter();
  const [session, setSession] = useState<UserSession | null>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [syncing, setSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);

  // Action busy key + toast banner
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Forms state
  const [newEventName, setNewEventName] = useState("");
  const [newEventLocation, setNewEventLocation] = useState("");
  const [newItemName, setNewItemName] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("Food");
  const [newItemUnit, setNewItemUnit] = useState("Packs");
  const [newItemStock, setNewItemStock] = useState(500);
  const [stockEdits, setStockEdits] = useState<Record<number, string>>({});
  const [dispatchReqId, setDispatchReqId] = useState<number>(0);
  const [dispatchVolId, setDispatchVolId] = useState<number>(0);
  const [activeReport, setActiveReport] = useState<
    "operationalSummary" | "inventoryHealth" | "donorImpact"
  >("operationalSummary");
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [selectedWaybill, setSelectedWaybill] = useState<any>(null);

  // Delete confirmation modal
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const pendingDeleteRef = useRef<DeleteTarget | null>(null);
  const confirmDialogRef = useRef<HTMLDialogElement | null>(null);
  const cancelBtnRef = useRef<HTMLButtonElement | null>(null);

  const showToast = useCallback(
    (text: string, type: "success" | "error" = "success") => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      setToast({ type, text });
      toastTimerRef.current = setTimeout(() => {
        setToast(null);
      }, 5000);
    },
    []
  );

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const refreshData = useCallback(
    async (isBackground = false) => {
      if (!isBackground) {
        const cached = getCachedData<any>("admin_overview");
        if (cached) {
          setData(cached);
          setLoading(false);
        }
      } else {
        setSyncing(true);
      }

      try {
        const fresh = await apiFetch<any>("/api/admin/overview");
        setData(fresh);
        setCachedData("admin_overview", fresh);
      } catch (e: any) {
        showToast(e.message || "Failed to load admin overview.", "error");
      } finally {
        setLoading(false);
        setSyncing(false);
      }
    },
    [showToast]
  );

  useEffect(() => {
    const s = getSavedSession();
    if (!s || !s.user) {
      router.replace("/");
      return;
    }
    const role = (s.user.role || "").toLowerCase();
    if (role !== "admin" && role !== "manager") {
      router.replace(getPortalRouteForRole(role));
      return;
    }
    setSession(s);
    refreshData(false);
  }, [router, refreshData]);

  useEffect(() => {
    setPage(1);
  }, [activeTab, searchQuery, statusFilter]);

  const executeDeleteTarget = useCallback(
    async (target: DeleteTarget) => {
      const key = `delete-${target.kind}-${target.id}`;
      setBusyKey(key);
      try {
        if (target.kind === "event") {
          await apiFetch(`/api/events?id=${target.id}`, { method: "DELETE" });
          showToast(`Deleted disaster event ${target.id}.`);
        } else if (target.kind === "request") {
          await apiFetch(`/api/requests?id=${target.id}`, { method: "DELETE" });
          showToast(`Deleted relief request ${target.id}.`);
        } else if (target.kind === "donation") {
          await apiFetch(`/api/donations?id=${target.id}`, { method: "DELETE" });
          showToast(`Deleted donation ${target.id}.`);
        } else if (target.kind === "inventory") {
          await apiFetch(`/api/inventory?id=${target.id}`, {
            method: "DELETE",
          });
          showToast(`Deleted ${target.label} from catalog.`);
        } else if (target.kind === "delivery") {
          await apiFetch(`/api/deliveries?id=${target.id}`, {
            method: "DELETE",
          });
          showToast(`Deleted delivery ${target.id}.`);
        }
        await refreshData(true);
      } catch (err: any) {
        showToast(err.message || "Delete failed.", "error");
      } finally {
        setBusyKey(null);
      }
    },
    [refreshData, showToast]
  );

  // Hook native <dialog> close event reliably in React 18
  useEffect(() => {
    const dialog = confirmDialogRef.current;
    if (!dialog) return;

    const handleNativeClose = () => {
      const action = dialog.returnValue;
      dialog.returnValue = "";
      const target = pendingDeleteRef.current;
      pendingDeleteRef.current = null;
      setDeleteTarget(null);
      if (action === "delete" && target) {
        void executeDeleteTarget(target);
      }
    };

    dialog.addEventListener("close", handleNativeClose);
    return () => {
      dialog.removeEventListener("close", handleNativeClose);
    };
  }, [executeDeleteTarget, loading]);

  const openDeleteConfirm = (target: DeleteTarget) => {
    pendingDeleteRef.current = target;
    setDeleteTarget(target);
    const dialog = confirmDialogRef.current;
    if (dialog) {
      dialog.returnValue = "";
      if (!dialog.open) {
        dialog.showModal();
      }
      cancelBtnRef.current?.focus();
    }
  };

  const metrics = data?.metrics || {};
  const events: any[] = data?.events || [];
  const inventory: any[] = data?.inventory || [];
  const donations: any[] = data?.donations || [];
  const requests: any[] = data?.requests || [];
  const deliveries: any[] = data?.deliveries || [];
  const volunteers: any[] = data?.volunteers || [];
  const organizations: any[] = data?.organizations || [];
  const donors: any[] = data?.donors || [];
  const users: any[] = data?.users || [];
  const notifications: any[] = data?.notifications || [];
  const reports = data?.reports || {};

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  const pendingRequestsList = useMemo(
    () => requests.filter((r) => r.status === "Pending"),
    [requests]
  );

  const dispatchedRequestIds = useMemo(
    () => new Set(deliveries.map((d) => Number(d.requestId))),
    [deliveries]
  );

  const approvedRequestsForDispatch = useMemo(
    () =>
      requests.filter(
        (r) =>
          r.status === "Approved" &&
          !dispatchedRequestIds.has(Number(r.requestId))
      ),
    [requests, dispatchedRequestIds]
  );

  const filteredEvents = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return events.filter(
      (ev) =>
        (statusFilter === "ALL" || ev.status === statusFilter) &&
        (!q ||
          (ev.eventName || "").toLowerCase().includes(q) ||
          (ev.location || "").toLowerCase().includes(q) ||
          String(ev.eventId).includes(q))
    );
  }, [events, statusFilter, searchQuery]);

  const filteredRequests = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return requests.filter(
      (r) =>
        (statusFilter === "ALL" || r.status === statusFilter) &&
        (!q ||
          String(r.requestId).includes(q) ||
          (r.orgName || "").toLowerCase().includes(q) ||
          (r.eventName || "").toLowerCase().includes(q))
    );
  }, [requests, statusFilter, searchQuery]);

  const filteredDonations = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return donations.filter(
      (d) =>
        (statusFilter === "ALL" || d.status === statusFilter) &&
        (!q ||
          String(d.donationId).includes(q) ||
          (d.donorName || "").toLowerCase().includes(q) ||
          (d.eventName || "").toLowerCase().includes(q))
    );
  }, [donations, statusFilter, searchQuery]);

  const filteredInventory = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return inventory.filter((inv) => {
      const health =
        inv.currentStock <= 200
          ? "CRITICAL ALERT"
          : inv.currentStock <= 1000
          ? "LOW STOCK"
          : "SUFFICIENT";
      const matchesStatus = statusFilter === "ALL" || health === statusFilter;
      const matchesSearch =
        !q ||
        String(inv.goodId).includes(q) ||
        (inv.itemName || "").toLowerCase().includes(q) ||
        (inv.category || "").toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [inventory, statusFilter, searchQuery]);

  const filteredDeliveries = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return deliveries.filter(
      (d) =>
        (statusFilter === "ALL" || d.deliveryStatus === statusFilter) &&
        (!q ||
          String(d.deliveryId).includes(q) ||
          String(d.requestId).includes(q) ||
          (d.orgName || "").toLowerCase().includes(q) ||
          (d.location || "").toLowerCase().includes(q) ||
          (d.volunteerName || "").toLowerCase().includes(q))
    );
  }, [deliveries, statusFilter, searchQuery]);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return users.filter(
      (u) =>
        (statusFilter === "ALL" ||
          (u.role || "").toLowerCase() === statusFilter.toLowerCase()) &&
        (!q ||
          String(u.userId).includes(q) ||
          (u.fullName || "").toLowerCase().includes(q) ||
          (u.username || "").toLowerCase().includes(q) ||
          (u.email || "").toLowerCase().includes(q) ||
          (u.contactInfo || "").toLowerCase().includes(q))
    );
  }, [users, statusFilter, searchQuery]);

  if (loading && !data) {
    return <PortalShellSkeleton title="Loading Admin Operations Console" />;
  }

  // Action handlers with strict try/catch and busy guards
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newEventName.trim();
    const loc = newEventLocation.trim();
    if (!name || !loc) {
      showToast("Event name and affected location are required.", "error");
      return;
    }
    setBusyKey("create-event");
    try {
      await apiFetch("/api/events", {
        method: "POST",
        body: JSON.stringify({
          eventName: name,
          location: loc,
          status: "Active",
        }),
      });
      setNewEventName("");
      setNewEventLocation("");
      showToast("Master Disaster Event registered.");
      await refreshData(true);
    } catch (err: any) {
      showToast(err.message || "Failed to register event.", "error");
    } finally {
      setBusyKey(null);
    }
  };

  const handleToggleEventStatus = async (ev: any) => {
    const next = ev.status === "Active" ? "Resolved" : "Active";
    setBusyKey(`event-${ev.eventId}`);
    try {
      await apiFetch("/api/events", {
        method: "PUT",
        body: JSON.stringify({ eventId: ev.eventId, status: next }),
      });
      showToast(`Event ${ev.eventId} transitioned to ${next}.`);
      await refreshData(true);
    } catch (err: any) {
      showToast(err.message || "Failed to update event status.", "error");
    } finally {
      setBusyKey(null);
    }
  };

  const handleUpdateRequestStatus = async (reqId: number, status: string) => {
    setBusyKey(`request-${reqId}`);
    try {
      await apiFetch("/api/requests", {
        method: "PUT",
        body: JSON.stringify({ requestId: reqId, status }),
      });
      showToast(
        `Request ${reqId} marked ${status} (Warehouse inventory synchronized).`
      );
      await refreshData(true);
    } catch (err: any) {
      showToast(err.message || "Failed to update relief request.", "error");
    } finally {
      setBusyKey(null);
    }
  };

  const handleUpdateDonationStatus = async (donId: number, status: string) => {
    setBusyKey(`donation-${donId}`);
    try {
      await apiFetch("/api/donations", {
        method: "PUT",
        body: JSON.stringify({ donationId: donId, status }),
      });
      showToast(
        `Donation ${donId} marked ${status} (Warehouse stock updated).`
      );
      await refreshData(true);
    } catch (err: any) {
      showToast(err.message || "Failed to verify donation.", "error");
    } finally {
      setBusyKey(null);
    }
  };

  const handleAddInventoryItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const itemName = newItemName.trim();
    const unit = newItemUnit.trim();
    const stock = Number(newItemStock);
    if (!itemName || !unit) {
      showToast("Item name and unit of measure are required.", "error");
      return;
    }
    if (!Number.isInteger(stock) || stock < 0) {
      showToast("Initial stock must be a non-negative integer.", "error");
      return;
    }
    setBusyKey("create-inventory");
    try {
      await apiFetch("/api/inventory", {
        method: "POST",
        body: JSON.stringify({
          itemName,
          category: newItemCategory,
          unitOfMeasure: unit,
          currentStock: stock,
        }),
      });
      setNewItemName("");
      showToast("Relief item added to warehouse inventory.");
      await refreshData(true);
    } catch (err: any) {
      showToast(err.message || "Failed to add relief item.", "error");
    } finally {
      setBusyKey(null);
    }
  };

  const handleAdjustStock = async (inv: any, delta: number) => {
    const updated = Math.max(0, Number(inv.currentStock) + delta);
    setBusyKey(`inv-${inv.inventoryId}`);
    try {
      await apiFetch("/api/inventory", {
        method: "PUT",
        body: JSON.stringify({
          inventoryId: inv.inventoryId,
          currentStock: updated,
        }),
      });
      setStockEdits((prev) => ({
        ...prev,
        [inv.inventoryId]: String(updated),
      }));
      showToast(
        `Updated ${inv.itemName} balance to ${updated} ${inv.unitOfMeasure}.`
      );
      await refreshData(true);
    } catch (err: any) {
      showToast(err.message || "Failed to adjust warehouse stock.", "error");
    } finally {
      setBusyKey(null);
    }
  };

  const handleSetCustomStock = async (inv: any) => {
    const raw = stockEdits[inv.inventoryId];
    if (raw === undefined || raw.trim() === "") return;
    const parsed = Number(raw);
    if (!Number.isInteger(parsed) || parsed < 0) {
      showToast("Stock balance must be a whole number >= 0.", "error");
      return;
    }
    setBusyKey(`inv-${inv.inventoryId}`);
    try {
      await apiFetch("/api/inventory", {
        method: "PUT",
        body: JSON.stringify({
          inventoryId: inv.inventoryId,
          currentStock: parsed,
        }),
      });
      showToast(
        `Adjusted ${inv.itemName} balance to ${parsed} ${inv.unitOfMeasure}.`
      );
      await refreshData(true);
    } catch (err: any) {
      showToast(err.message || "Failed to update warehouse stock.", "error");
    } finally {
      setBusyKey(null);
    }
  };

  const handleCreateDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchReqId) {
      showToast("Please select an Approved relief request to dispatch.", "error");
      return;
    }
    setBusyKey("create-delivery");
    try {
      await apiFetch("/api/deliveries", {
        method: "POST",
        body: JSON.stringify({
          requestId: Number(dispatchReqId),
          volunteerId: dispatchVolId ? Number(dispatchVolId) : null,
          deliveryStatus: "In Transit",
        }),
      });
      const dispatchedId = dispatchReqId;
      setDispatchReqId(0);
      setDispatchVolId(0);
      showToast(`Delivery dispatched for Request ${dispatchedId}.`);
      await refreshData(true);
    } catch (err: any) {
      showToast(err.message || "Failed to dispatch delivery.", "error");
    } finally {
      setBusyKey(null);
    }
  };

  const handleUpdateDeliveryStatus = async (delId: number, status: string) => {
    setBusyKey(`delivery-${delId}`);
    try {
      await apiFetch("/api/deliveries", {
        method: "PUT",
        body: JSON.stringify({ deliveryId: delId, deliveryStatus: status }),
      });
      showToast(`Delivery ${delId} updated to ${status}.`);
      await refreshData(true);
    } catch (err: any) {
      showToast(err.message || "Failed to update delivery status.", "error");
    } finally {
      setBusyKey(null);
    }
  };

  const handleMarkNotificationRead = async (notificationId: number) => {
    setBusyKey(`notif-${notificationId}`);
    try {
      await apiFetch("/api/notifications/read", {
        method: "PUT",
        body: JSON.stringify({ notificationId }),
      });
      await refreshData(true);
    } catch (err: any) {
      showToast(err.message || "Failed to mark notification read.", "error");
    } finally {
      setBusyKey(null);
    }
  };

  const exportReportCsv = () => {
    const rows = reports[activeReport] || [];
    if (!rows.length) {
      showToast("No report rows available to export.", "error");
      return;
    }

    const timestamp = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Manila",
    });

    let statisticalSummary = "";
    if (activeReport === "operationalSummary") {
      const totalEvents = rows.length;
      const totalDonations = rows.reduce(
        (s: number, r: any) => s + Number(r.totalDonations || 0),
        0
      );
      const totalRequests = rows.reduce(
        (s: number, r: any) => s + Number(r.totalRequests || 0),
        0
      );
      const totalDeliveries = rows.reduce(
        (s: number, r: any) => s + Number(r.totalDeliveries || 0),
        0
      );
      const fulfillmentRate =
        totalRequests > 0
          ? ((totalDeliveries / totalRequests) * 100).toFixed(1) + "%"
          : "N/A";

      statisticalSummary = [
        `"--- STATISTICAL SUMMARY & AGGREGATE METRICS ---"`,
        `"Metric Description","Calculated Aggregate"`,
        `"Total Tracked Disaster Operations","${totalEvents}"`,
        `"Cumulative Donations Recorded","${totalDonations}"`,
        `"Cumulative Aid Demands Received","${totalRequests}"`,
        `"Dispatched Deliveries (Fulfilled)","${totalDeliveries}"`,
        `"Overall Operational Relief Fulfillment Rate","${fulfillmentRate}"`,
        `""`,
        `"--- DETAILED DISASTER OPERATIONAL DATA ---"`,
      ].join("\n");
    } else if (activeReport === "inventoryHealth") {
      const totalItems = rows.length;
      const totalStock = rows.reduce((s: number, r: any) => {
        const val = Number(
          String(r.currentStockFormatted || r.currentStock || "0").replace(/,/g, "")
        ) || 0;
        return s + val;
      }, 0);
      const totalDonated = rows.reduce(
        (s: number, r: any) => s + Number(r.totalDonatedQty || 0),
        0
      );
      const totalRequested = rows.reduce(
        (s: number, r: any) => s + Number(r.totalRequestedQty || 0),
        0
      );
      const criticalCount = rows.filter((r: any) =>
        (r.stockHealth || "").toLowerCase().includes("critical")
      ).length;
      const lowStockCount = rows.filter(
        (r: any) => (r.stockHealth || "").toLowerCase() === "low stock"
      ).length;

      statisticalSummary = [
        `"--- STATISTICAL SUMMARY & INVENTORY HEALTH METRICS ---"`,
        `"Metric Description","Calculated Aggregate"`,
        `"Total Tracked Relief SKU Commodities","${totalItems}"`,
        `"Total Central Warehouse Stock Volume (Units)","${totalStock}"`,
        `"Cumulative Inflow Donated (Units)","${totalDonated}"`,
        `"Cumulative Outflow Requested (Units)","${totalRequested}"`,
        `"Replenishment Urgency (Critical Alert SKUs)","${criticalCount}"`,
        `"Low Stock Warning SKUs","${lowStockCount}"`,
        `""`,
        `"--- DETAILED WAREHOUSE STOCK STATUS & AUDIT ---"`,
      ].join("\n");
    } else if (activeReport === "donorImpact") {
      const totalDonors = rows.length;
      const totalDonations = rows.reduce(
        (s: number, r: any) => s + Number(r.totalDonations || 0),
        0
      );
      const totalUnits = rows.reduce(
        (s: number, r: any) => s + Number(r.totalItemsDonated || 0),
        0
      );
      const avgPerDonor =
        totalDonors > 0 ? Math.round(totalUnits / totalDonors) : 0;

      statisticalSummary = [
        `"--- STATISTICAL SUMMARY & DONOR IMPACT METRICS ---"`,
        `"Metric Description","Calculated Aggregate"`,
        `"Total Registered Benefactor Entities","${totalDonors}"`,
        `"Cumulative Donation Pledges Submitted","${totalDonations}"`,
        `"Total Relief Units Donated","${totalUnits}"`,
        `"Average Units Donated Per Benefactor","${avgPerDonor}"`,
        `""`,
        `"--- DETAILED DONOR IMPACT & CONTRIBUTION LEDGER ---"`,
      ].join("\n");
    }

    const headers = Object.keys(rows[0]);
    const csv = [
      `"NATIONAL DISASTER RISK REDUCTION AND MANAGEMENT COUNCIL (NDRRMC)"`,
      `"DRRMS CENTRAL OPERATIONS - OFFICIAL DECISION-SUPPORT REPORT"`,
      `"Report Classifier: ${activeReport}"`,
      `"Generated At: ${timestamp}"`,
      `""`,
      statisticalSummary,
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
    a.download = `DRRMS_Official_Report_${activeReport}_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const slicePage = <T,>(items: T[]) => {
    const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
    const safePage = Math.min(Math.max(1, page), totalPages);
    return items.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  };

  const navItems: SidebarNavItem[] = [
    {
      id: "overview",
      label: "Overview",
      icon: <AlertTriangle className="h-4 w-4" />,
    },
    {
      id: "events",
      label: "Disasters",
      icon: <AlertTriangle className="h-4 w-4" />,
      badge: metrics.activeDisasters ?? 0,
    },
    {
      id: "requests",
      label: "Requests",
      icon: <Building2 className="h-4 w-4" />,
      badge: metrics.pendingRequests ?? 0,
    },
    {
      id: "donations",
      label: "Donations",
      icon: <HeartHandshake className="h-4 w-4" />,
      badge: metrics.totalDonations ?? 0,
    },
    {
      id: "inventory",
      label: "Inventory",
      icon: <Package className="h-4 w-4" />,
      badge: metrics.reliefGoodsCount ?? 0,
    },
    {
      id: "deliveries",
      label: "Deliveries",
      icon: <Truck className="h-4 w-4" />,
      badge: deliveries.length,
    },
    {
      id: "stakeholders",
      label: "Users",
      icon: <Users className="h-4 w-4" />,
      badge: users.length || donors.length + organizations.length + volunteers.length,
    },
    {
      id: "notifications",
      label: "Notifications",
      icon: <Bell className="h-4 w-4" />,
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
    {
      id: "reports",
      label: "Reports",
      icon: <FileBarChart className="h-4 w-4" />,
    },
  ];

  const isBusy = busyKey !== null;

  return (
    <PortalSidebarLayout
      session={session}
      portalTitle="Admin Dashboard"
      portalSubtitle=""
      roleBadge={session?.user?.role || "Admin"}
      navItems={navItems}
      activeTab={activeTab}
      onSelectTab={(id: AdminTab) => {
        setActiveTab(id);
        setSearchQuery("");
        setStatusFilter("ALL");
        window.scrollTo({ top: 0 });
      }}
      unreadCount={unreadCount}
      onOpenNotifications={() => {
        setActiveTab("notifications");
        setSearchQuery("");
        setStatusFilter("ALL");
        window.scrollTo({ top: 0 });
      }}
      notificationsList={notifications}
      onMarkNotificationRead={handleMarkNotificationRead}
      onSync={() => refreshData(true)}
      syncing={syncing}
      headerActions={
        <button
          type="button"
          onClick={() => setShowBroadcastModal(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-700 hover:to-amber-700 active:scale-[0.98] px-3 py-1.5 text-xs font-bold text-white shadow-sm transition"
          title="Broadcast Emergency Fleet Dispatch Alert"
        >
          <Radio className="h-3.5 w-3.5 animate-pulse" aria-hidden="true" />
          <span className="hidden sm:inline">Broadcast Fleet Alert</span>
        </button>
      }
    >
      {toast && (
        <div
          role={toast.type === "error" ? "alert" : "status"}
          aria-live="polite"
          className={`rounded-xl border px-4 py-3 text-xs sm:text-sm font-medium flex items-center justify-between gap-3 no-print ${
            toast.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-rose-200 bg-rose-50 text-rose-900"
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            {toast.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
            )}
            <span>{toast.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="text-xs underline shrink-0"
          >
            Close
          </button>
        </div>
      )}

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Executive KPI Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 no-print">
            <div className="rounded-2xl border border-slate-200/80 bg-white hover:border-rose-300 p-4 shadow-xs transition">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-600">
                  Active Disasters
                </span>
                <div className="h-7 w-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                </div>
              </div>
              <div className="text-2xl font-black text-rose-600 mt-2 tracking-tight tabular-nums">
                {Number(metrics.activeDisasters ?? 0).toLocaleString()}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white hover:border-amber-300 p-4 shadow-xs transition">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-600">
                  Pending Requests
                </span>
                <div className="h-7 w-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
                </div>
              </div>
              <div className="text-2xl font-black text-amber-600 mt-2 tracking-tight tabular-nums">
                {Number(metrics.pendingRequests ?? 0).toLocaleString()}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white hover:border-blue-300 p-4 shadow-xs transition">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-600">
                  Donations
                </span>
                <div className="h-7 w-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <HeartHandshake className="h-3.5 w-3.5" aria-hidden="true" />
                </div>
              </div>
              <div className="text-2xl font-black text-blue-600 mt-2 tracking-tight tabular-nums">
                {Number(metrics.totalDonations ?? 0).toLocaleString()}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white hover:border-indigo-300 p-4 shadow-xs transition">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-600">
                  Relief Items
                </span>
                <div className="h-7 w-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <Package className="h-3.5 w-3.5" aria-hidden="true" />
                </div>
              </div>
              <div className="text-2xl font-black text-indigo-600 mt-2 tracking-tight tabular-nums">
                {Number(metrics.reliefGoodsCount ?? 0).toLocaleString()}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white hover:border-sky-300 p-4 shadow-xs transition">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-600">
                  Volunteers
                </span>
                <div className="h-7 w-7 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                  <Users className="h-3.5 w-3.5" aria-hidden="true" />
                </div>
              </div>
              <div className="text-2xl font-black text-sky-600 mt-2 tracking-tight tabular-nums">
                {Number(metrics.registeredVolunteers ?? 0).toLocaleString()}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white hover:border-emerald-300 p-4 shadow-xs transition">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-600">
                  Deliveries Done
                </span>
                <div className="h-7 w-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <Truck className="h-3.5 w-3.5" aria-hidden="true" />
                </div>
              </div>
              <div className="text-2xl font-black text-emerald-600 mt-2 tracking-tight tabular-nums">
                {Number(metrics.completedDeliveries ?? 0).toLocaleString()}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-slate-900">
                  Pending Requests
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("requests");
                    window.scrollTo({ top: 0 });
                  }}
                  className="text-xs font-semibold text-blue-600 hover:underline"
                >
                  View all
                </button>
              </div>
              {pendingRequestsList.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  All relief requests have been reviewed.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {pendingRequestsList.slice(0, 5).map((r) => (
                    <div
                      key={r.requestId}
                      className="py-3 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-semibold text-slate-900 truncate">
                            {r.orgName}
                          </span>
                          <span className="text-[11px] font-medium text-slate-400 tabular-nums shrink-0">
                            ID {r.requestId}
                          </span>
                        </div>
                        <div className="text-slate-600 truncate">
                          {(r.items || []).length > 0 ? (
                            <>
                              <span className="font-medium text-slate-700">
                                {(r.items || [])
                                  .map(
                                    (i: any) =>
                                      `${Number(i.quantity).toLocaleString()} ${i.itemName}`
                                  )
                                  .join(", ")}
                              </span>
                              {" · "}
                              <span className="text-slate-500">{r.eventName}</span>
                            </>
                          ) : (
                            r.eventName
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() =>
                          handleUpdateRequestStatus(r.requestId, "Approved")
                        }
                        className="rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50 px-3.5 py-1.5 text-xs font-semibold text-white transition shrink-0"
                      >
                        {busyKey === `request-${r.requestId}`
                          ? "Saving..."
                          : "Approve"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-slate-900">
                  Warehouse Stock
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("inventory");
                    window.scrollTo({ top: 0 });
                  }}
                  className="text-xs font-semibold text-blue-600 hover:underline"
                >
                  Manage inventory
                </button>
              </div>
              <div className="divide-y divide-slate-100">
                {inventory.slice(0, 6).map((inv) => {
                  const low = inv.currentStock <= 200;
                  return (
                    <div
                      key={inv.inventoryId}
                      className="py-2.5 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0 truncate">
                        <span className="font-semibold text-slate-900">
                          {inv.itemName}
                        </span>
                        <span className="text-slate-400 ml-2">
                          {inv.category}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-semibold text-slate-900 tabular-nums">
                          {Number(inv.currentStock ?? 0).toLocaleString()}{" "}
                          {inv.unitOfMeasure}
                        </span>
                        {low && (
                          <span className="rounded-full bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 text-xs font-semibold">
                            Low
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </div>
      )}

      {/* TAB 2: DISASTER EVENTS */}
      {activeTab === "events" && (
        <div className="space-y-5">
          <form
            onSubmit={handleCreateEvent}
            className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs flex flex-col sm:flex-row items-end gap-3"
          >
            <div className="flex-1 w-full">
              <label
                htmlFor="new-event-name"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Disaster Event Name
              </label>
              <input
                id="new-event-name"
                name="eventName"
                type="text"
                required
                value={newEventName}
                onChange={(e) => setNewEventName(e.target.value)}
                placeholder="e.g. Super Typhoon Pepito"
                className="w-full min-h-[40px] rounded-xl border border-slate-300 px-3 py-2 text-xs sm:text-sm focus:border-blue-600 focus:outline-none"
              />
            </div>
            <div className="flex-1 w-full">
              <label
                htmlFor="new-event-location"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Affected Location
              </label>
              <input
                id="new-event-location"
                name="location"
                type="text"
                required
                value={newEventLocation}
                onChange={(e) => setNewEventLocation(e.target.value)}
                placeholder="e.g. Ilocos Norte / Cagayan Valley"
                className="w-full min-h-[40px] rounded-xl border border-slate-300 px-3 py-2 text-xs sm:text-sm focus:border-blue-600 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={isBusy}
              className="inline-flex items-center gap-1.5 min-h-[40px] rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50 px-4 py-2 text-xs font-bold text-white transition shrink-0"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{busyKey === "create-event" ? "Saving..." : "Add Event"}</span>
            </button>
          </form>

          <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {["ALL", "Active", "Resolved"].map((st) => (
                  <button
                    key={st}
                    type="button"
                    aria-pressed={statusFilter === st}
                    onClick={() => setStatusFilter(st)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition active:scale-[0.98] ${
                      statusFilter === st
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {st === "ALL" ? "All" : st}
                  </button>
                ))}
              </div>
              <div className="relative">
                <Search
                  className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  aria-label="Search disaster events or locations"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search events or locations..."
                  className="rounded-xl border border-slate-300 pl-8 pr-3 py-1.5 text-xs w-full sm:w-64 focus:border-blue-600 focus:outline-none"
                />
              </div>
            </div>

            <div
              tabIndex={0}
              role="region"
              aria-label="Disaster events table"
              className="table-scroll-container"
            >
              <table className="w-full text-left text-xs sm:text-sm disaster-table">
                <caption className="sr-only">Disaster events directory</caption>
                <thead className="bg-slate-50 text-slate-600 text-xs border-b border-slate-200">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      ID
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Event Name
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Location
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Start Date
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Status
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEvents.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="p-6 text-center text-xs text-slate-400"
                      >
                        No matching disaster events found.
                      </td>
                    </tr>
                  ) : (
                    slicePage(filteredEvents).map((ev) => (
                      <tr key={ev.eventId} className="hover:bg-slate-50/80">
                        <th
                          scope="row"
                          className="px-4 py-3 font-semibold text-slate-700 tabular-nums whitespace-nowrap"
                        >
                          {ev.eventId}
                        </th>
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {ev.eventName}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {ev.location}
                        </td>
                        <td className="px-4 py-3 text-slate-500 tabular-nums whitespace-nowrap">
                          {ev.startDate}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <StatusBadge status={ev.status} />
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleToggleEventStatus(ev)}
                              className="rounded-lg border border-slate-300 hover:bg-slate-100 active:scale-[0.98] disabled:opacity-50 px-2.5 py-1 text-xs font-semibold text-slate-700 transition"
                            >
                              Mark{" "}
                              {ev.status === "Active" ? "Resolved" : "Active"}
                            </button>
                            <button
                              type="button"
                              disabled={isBusy}
                              aria-label={`Delete event ${ev.eventId}`}
                              onClick={() =>
                                openDeleteConfirm({
                                  kind: "event",
                                  id: ev.eventId,
                                  label: `Disaster Event ${ev.eventId} (${ev.eventName})`,
                                })
                              }
                              className="rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 active:scale-[0.98] disabled:opacity-50 p-1.5 transition"
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <PaginationControls
              totalItems={filteredEvents.length}
              page={page}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
          </div>
        </div>
      )}

      {/* TAB 3: RELIEF REQUESTS */}
      {activeTab === "requests" && (
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {["ALL", "Pending", "Approved", "Fulfilled"].map((st) => (
                <button
                  key={st}
                  type="button"
                  aria-pressed={statusFilter === st}
                  onClick={() => setStatusFilter(st)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition active:scale-[0.98] ${
                    statusFilter === st
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {st === "ALL" ? "All" : st}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search
                className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="search"
                aria-label="Search relief requests by organization or disaster"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search organization or disaster..."
                className="rounded-xl border border-slate-300 pl-8 pr-3 py-1.5 text-xs w-full sm:w-64 focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>

          <div
            tabIndex={0}
            role="region"
            aria-label="Relief requests table"
            className="overflow-x-auto"
          >
            <table className="w-full text-left text-xs sm:text-sm">
              <caption className="sr-only">Organization relief requests</caption>
              <thead className="bg-slate-50 text-slate-600 text-xs border-b border-slate-200">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    ID
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Organization
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Disaster
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Requested Items
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Date
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-xs text-slate-400">
                      No matching relief requests found.
                    </td>
                  </tr>
                ) : (
                  slicePage(filteredRequests).map((r) => (
                    <tr key={r.requestId} className="hover:bg-slate-50/80">
                      <th
                        scope="row"
                        className="px-4 py-3 font-semibold text-slate-700 tabular-nums whitespace-nowrap"
                      >
                        {r.requestId}
                      </th>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {r.orgName}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{r.eventName}</td>
                      <td className="px-4 py-3 text-xs text-slate-700">
                        {(r.items || []).length === 0 ? (
                          <span className="text-slate-400">—</span>
                        ) : (
                          <ul className="space-y-1">
                            {(r.items || []).map((it: any, idx: number) => (
                              <li key={it.requestItemId || idx} className="leading-snug">
                                <span className="font-semibold text-slate-900 tabular-nums">
                                  {Number(it.quantity).toLocaleString()} {it.unitOfMeasure}
                                </span>
                                <span className="text-slate-400 mx-1.5">&middot;</span>
                                <span className="text-slate-700">{it.itemName}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-500 tabular-nums whitespace-nowrap">
                        {r.requestDate}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {r.status === "Pending" && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() =>
                                handleUpdateRequestStatus(
                                  r.requestId,
                                  "Approved"
                                )
                              }
                              className="rounded-lg bg-blue-600 hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50 px-3 py-1.5 text-xs font-semibold text-white transition"
                            >
                              {busyKey === `request-${r.requestId}`
                                ? "Saving..."
                                : "Approve"}
                            </button>
                          )}
                          {r.status === "Approved" && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() =>
                                handleUpdateRequestStatus(
                                  r.requestId,
                                  "Fulfilled"
                                )
                              }
                              className="rounded-lg border border-slate-300 bg-white hover:bg-slate-100 active:scale-[0.98] disabled:opacity-50 px-2.5 py-1 text-xs font-semibold text-slate-700 transition"
                            >
                              {busyKey === `request-${r.requestId}`
                                ? "Saving..."
                                : "Mark Fulfilled"}
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={isBusy}
                            aria-label={`Delete request ${r.requestId}`}
                            onClick={() =>
                              openDeleteConfirm({
                                kind: "request",
                                id: r.requestId,
                                label: `Relief Request ${r.requestId} (${r.orgName})`,
                              })
                            }
                            className="rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 active:scale-[0.98] disabled:opacity-50 p-1.5 transition"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <PaginationControls
            totalItems={filteredRequests.length}
            page={page}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />
        </div>
      )}

      {/* TAB 4: DONATIONS LEDGER */}
      {activeTab === "donations" && (
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {["ALL", "Pending", "Approved"].map((st) => (
                <button
                  key={st}
                  type="button"
                  aria-pressed={statusFilter === st}
                  onClick={() => setStatusFilter(st)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition active:scale-[0.98] ${
                    statusFilter === st
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {st === "ALL" ? "All" : st}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search
                className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="search"
                aria-label="Search donations by donor or event"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search donor or event..."
                className="rounded-xl border border-slate-300 pl-8 pr-3 py-1.5 text-xs w-full sm:w-64 focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>

          <div
            tabIndex={0}
            role="region"
            aria-label="Donations ledger table"
            className="overflow-x-auto"
          >
            <table className="w-full text-left text-xs sm:text-sm">
              <caption className="sr-only">Donations ledger</caption>
              <thead className="bg-slate-50 text-slate-600 text-xs border-b border-slate-200">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    ID
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Donor
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Disaster Event
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Donated Items
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Date
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDonations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-xs text-slate-400">
                      No matching donations found.
                    </td>
                  </tr>
                ) : (
                  slicePage(filteredDonations).map((d) => (
                    <tr key={d.donationId} className="hover:bg-slate-50/80">
                      <th
                        scope="row"
                        className="px-4 py-3 font-semibold text-slate-700 tabular-nums whitespace-nowrap"
                      >
                        {d.donationId}
                      </th>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {d.donorName}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{d.eventName}</td>
                      <td className="px-4 py-3 text-xs text-slate-700">
                        {(d.items || []).length === 0 ? (
                          <span className="text-slate-400">—</span>
                        ) : (
                          <ul className="space-y-1">
                            {(d.items || []).map((it: any, idx: number) => (
                              <li key={it.itemId || idx} className="leading-snug">
                                <span className="font-semibold text-emerald-700 tabular-nums">
                                  +{Number(it.quantity).toLocaleString()} {it.unitOfMeasure}
                                </span>
                                <span className="text-slate-400 mx-1.5">&middot;</span>
                                <span className="text-slate-700">{it.itemName}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-500 tabular-nums whitespace-nowrap">
                        {d.donationDate}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusBadge status={d.status} />
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {d.status === "Pending" && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() =>
                                handleUpdateDonationStatus(
                                  d.donationId,
                                  "Approved"
                                )
                              }
                              className="rounded-lg bg-blue-600 hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50 px-3 py-1.5 text-xs font-semibold text-white transition"
                            >
                              {busyKey === `donation-${d.donationId}`
                                ? "Saving..."
                                : "Approve"}
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={isBusy}
                            aria-label={`Delete donation ${d.donationId}`}
                            onClick={() =>
                              openDeleteConfirm({
                                kind: "donation",
                                id: d.donationId,
                                label: `Donation ${d.donationId} by ${d.donorName}`,
                              })
                            }
                            className="rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 active:scale-[0.98] disabled:opacity-50 p-1.5 transition"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <PaginationControls
            totalItems={filteredDonations.length}
            page={page}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />
        </div>
      )}

      {/* TAB 5: WAREHOUSE INVENTORY */}
      {activeTab === "inventory" && (
        <div className="space-y-5">
          {/* Low Stock Alert */}
          {(() => {
            const criticalOrLowItems = inventory.filter(
              (item) => item.currentStock <= 1000
            );
            if (criticalOrLowItems.length === 0) return null;
            const remainingCount = Math.max(0, criticalOrLowItems.length - 3);
            return (
              <div className="rounded-2xl border border-amber-200/90 bg-amber-50/70 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="h-8 w-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                    <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs sm:text-sm font-bold text-slate-900">
                        Low Stock Alert
                      </span>
                      <span className="rounded-full bg-amber-100 border border-amber-200 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                        {criticalOrLowItems.length}{" "}
                        {criticalOrLowItems.length === 1 ? "item" : "items"} need restocking
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">
                      Restock needed:{" "}
                      {criticalOrLowItems
                        .slice(0, 3)
                        .map(
                          (i) =>
                            `${i.itemName} (${Number(i.currentStock).toLocaleString()} ${i.unitOfMeasure})`
                        )
                        .join(", ")}
                      {remainingCount > 0 ? `, and ${remainingCount} more` : ""}.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    showToast(
                      `Urgent donor appeal published for: ${criticalOrLowItems
                        .slice(0, 3)
                        .map((i) => i.itemName)
                        .join(", ")}.`,
                      "success"
                    )
                  }
                  className="rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-[0.98] px-4 py-2 text-xs font-semibold text-white shadow-xs transition shrink-0"
                >
                  Publish Urgent Donor Appeal
                </button>
              </div>
            );
          })()}

          <form
            onSubmit={handleAddInventoryItem}
            className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs grid grid-cols-1 sm:grid-cols-6 gap-3 items-end"
          >
            <div className="sm:col-span-2">
              <label
                htmlFor="new-good-name"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Item Name
              </label>
              <input
                id="new-good-name"
                name="itemName"
                type="text"
                required
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="e.g. Family Hygiene Kit"
                className="w-full min-h-[40px] rounded-xl border border-slate-300 px-3 py-2 text-xs sm:text-sm focus:border-blue-600 focus:outline-none"
              />
            </div>
            <div>
              <label
                htmlFor="new-good-category"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Category
              </label>
              <select
                id="new-good-category"
                name="category"
                value={newItemCategory}
                onChange={(e) => setNewItemCategory(e.target.value)}
                className="w-full min-h-[40px] rounded-xl border border-slate-300 px-3 py-2 text-xs sm:text-sm bg-white focus:border-blue-600 focus:outline-none"
              >
                <option value="Food">Food</option>
                <option value="Water">Water</option>
                <option value="Medicine">Medicine</option>
                <option value="Hygiene">Hygiene</option>
                <option value="Non-Food">Non-Food</option>
                <option value="Shelter">Shelter</option>
                <option value="Care">Care</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="new-good-unit"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Unit
              </label>
              <input
                id="new-good-unit"
                name="unitOfMeasure"
                type="text"
                required
                value={newItemUnit}
                onChange={(e) => setNewItemUnit(e.target.value)}
                placeholder="Packs"
                className="w-full min-h-[40px] rounded-xl border border-slate-300 px-3 py-2 text-xs sm:text-sm focus:border-blue-600 focus:outline-none"
              />
            </div>
            <div>
              <label
                htmlFor="new-good-stock"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Initial Stock
              </label>
              <input
                id="new-good-stock"
                name="currentStock"
                type="number"
                min={0}
                step={1}
                required
                value={newItemStock}
                onChange={(e) => setNewItemStock(Number(e.target.value))}
                className="w-full min-h-[40px] rounded-xl border border-slate-300 px-3 py-2 text-xs sm:text-sm focus:border-blue-600 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={isBusy}
              className="inline-flex items-center justify-center gap-1.5 min-h-[40px] rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50 py-2 px-4 text-xs font-bold text-white transition"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{busyKey === "create-inventory" ? "Adding..." : "Add Item"}</span>
            </button>
          </form>

          <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {["ALL", "CRITICAL ALERT", "LOW STOCK", "SUFFICIENT"].map(
                  (st) => (
                    <button
                      key={st}
                      type="button"
                      aria-pressed={statusFilter === st}
                      onClick={() => setStatusFilter(st)}
                      className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition active:scale-[0.98] ${
                        statusFilter === st
                          ? "bg-blue-600 text-white shadow-xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {st === "ALL"
                        ? "All"
                        : st === "CRITICAL ALERT"
                        ? "Critical Alert"
                        : st === "LOW STOCK"
                        ? "Low Stock"
                        : "Sufficient"}
                    </button>
                  )
                )}
              </div>
              <div className="relative">
                <Search
                  className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  aria-label="Search inventory items"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search item or category..."
                  className="rounded-xl border border-slate-300 pl-8 pr-3 py-1.5 text-xs w-full sm:w-64 focus:border-blue-600 focus:outline-none"
                />
              </div>
            </div>

            <div
              tabIndex={0}
              role="region"
              aria-label="Warehouse inventory table"
              className="overflow-x-auto"
            >
              <table className="w-full text-left text-xs sm:text-sm">
                <caption className="sr-only">Warehouse inventory</caption>
                <thead className="bg-slate-50 text-slate-600 text-xs border-b border-slate-200">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      ID
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Item Name
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Category
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Current Stock
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Status
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold text-right">
                      Adjust Stock
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInventory.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="p-6 text-center text-xs text-slate-400"
                      >
                        No matching inventory items found.
                      </td>
                    </tr>
                  ) : (
                    slicePage(filteredInventory).map((inv) => {
                      const healthLabel =
                        inv.currentStock <= 200
                          ? "CRITICAL ALERT"
                          : inv.currentStock <= 1000
                          ? "LOW STOCK"
                          : "SUFFICIENT";
                      const customVal =
                        stockEdits[inv.inventoryId] ?? String(inv.currentStock);
                      return (
                        <tr key={inv.inventoryId} className="hover:bg-slate-50/80">
                          <th
                            scope="row"
                            className="px-4 py-3 font-semibold text-slate-700 tabular-nums whitespace-nowrap"
                          >
                            {inv.goodId}
                          </th>
                          <td className="px-4 py-3 font-semibold text-slate-900">
                            {inv.itemName}
                          </td>
                          <td className="px-4 py-3 text-slate-600">{inv.category}</td>
                          <td className="px-4 py-3 font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                            {Number(inv.currentStock ?? 0).toLocaleString()} {inv.unitOfMeasure}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <StatusBadge status={healthLabel} />
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <div className="inline-flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleAdjustStock(inv, 100)}
                                className="rounded-lg border border-slate-300 bg-white hover:bg-slate-100 active:scale-[0.98] disabled:opacity-50 px-2 py-1 text-xs font-semibold text-slate-700 tabular-nums transition"
                              >
                                +100
                              </button>
                              <button
                                type="button"
                                disabled={isBusy || inv.currentStock <= 0}
                                onClick={() => handleAdjustStock(inv, -100)}
                                className="rounded-lg border border-slate-300 bg-white hover:bg-slate-100 active:scale-[0.98] disabled:opacity-50 px-2 py-1 text-xs font-semibold text-slate-700 tabular-nums transition"
                              >
                                -100
                              </button>
                              <input
                                type="number"
                                min={0}
                                step={1}
                                aria-label={`Exact stock balance for ${inv.itemName}`}
                                value={customVal}
                                onChange={(e) =>
                                  setStockEdits((prev) => ({
                                    ...prev,
                                    [inv.inventoryId]: e.target.value,
                                  }))
                                }
                                className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold tabular-nums focus:border-blue-600 focus:outline-none"
                              />
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleSetCustomStock(inv)}
                                className="rounded-lg bg-slate-800 hover:bg-slate-900 active:scale-[0.98] disabled:opacity-50 px-2.5 py-1 text-xs font-semibold text-white transition"
                              >
                                Set
                              </button>
                              <button
                                type="button"
                                disabled={isBusy}
                                aria-label={`Delete ${inv.itemName}`}
                                onClick={() =>
                                  openDeleteConfirm({
                                    kind: "inventory",
                                    id: inv.inventoryId,
                                    label: `${inv.itemName} (ID ${inv.goodId})`,
                                  })
                                }
                                className="rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 active:scale-[0.98] disabled:opacity-50 p-1.5 transition"
                              >
                                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <PaginationControls
              totalItems={filteredInventory.length}
              page={page}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
          </div>
        </div>
      )}

      {/* TAB 6: DELIVERIES */}
      {activeTab === "deliveries" && (
        <div className="space-y-5 no-print">
          <form
            onSubmit={handleCreateDelivery}
            className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-3 items-end"
          >
            <div>
              <label
                htmlFor="dispatch-request-id"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Approved Request
              </label>
              <select
                id="dispatch-request-id"
                name="requestId"
                required
                value={dispatchReqId}
                onChange={(e) => setDispatchReqId(Number(e.target.value))}
                className="w-full min-h-[40px] rounded-xl border border-slate-300 px-3 py-2 text-xs sm:text-sm bg-white focus:border-blue-600 focus:outline-none"
              >
                {approvedRequestsForDispatch.length === 0 ? (
                  <option value={0}>
                    No approved requests awaiting dispatch
                  </option>
                ) : (
                  <>
                    <option value={0}>-- Choose Approved Request --</option>
                    {approvedRequestsForDispatch.map((r) => (
                      <option key={r.requestId} value={r.requestId}>
                        Request {r.requestId} — {r.orgName} ({r.eventName})
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>
            <div>
              <label
                htmlFor="dispatch-volunteer-id"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Assign Volunteer
              </label>
              <select
                id="dispatch-volunteer-id"
                name="volunteerId"
                value={dispatchVolId}
                onChange={(e) => setDispatchVolId(Number(e.target.value))}
                className="w-full min-h-[40px] rounded-xl border border-slate-300 px-3 py-2 text-xs sm:text-sm bg-white focus:border-blue-600 focus:outline-none"
              >
                <option value={0}>-- Unassigned / Select Volunteer --</option>
                {volunteers.map((v) => (
                  <option key={v.volunteerId} value={v.volunteerId}>
                    {v.volunteerName} ({v.vehicleType} •{" "}
                    {v.isAvailable ? "Available" : "On Assignment"})
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={isBusy || approvedRequestsForDispatch.length === 0}
              className="min-h-[40px] rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50 py-2 px-4 text-xs font-bold text-white transition"
            >
              {busyKey === "create-delivery"
                ? "Dispatching..."
                : "Dispatch Delivery"}
            </button>
          </form>

          <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {["ALL", "Pending", "In Transit", "Delivered"].map((st) => {
                  const count =
                    st === "ALL"
                      ? deliveries.length
                      : deliveries.filter((d) => d.deliveryStatus === st)
                          .length;
                  return (
                    <button
                      key={st}
                      type="button"
                      aria-pressed={statusFilter === st}
                      onClick={() => setStatusFilter(st)}
                      className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition active:scale-[0.98] ${
                        statusFilter === st
                          ? "bg-blue-600 text-white shadow-xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {st === "ALL" ? "All" : st} ({count})
                    </button>
                  );
                })}
              </div>
              <div className="relative">
                <Search
                  className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  aria-label="Search deliveries by recipient, volunteer, or location"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search organization, volunteer..."
                  className="rounded-xl border border-slate-300 pl-8 pr-3 py-1.5 text-xs w-full sm:w-64 focus:border-blue-600 focus:outline-none"
                />
              </div>
            </div>

            <div
              tabIndex={0}
              role="region"
              aria-label="Deliveries table"
              className="overflow-x-auto"
            >
              <table className="w-full text-left text-xs sm:text-sm">
                <caption className="sr-only">Deliveries dispatch log</caption>
                <thead className="bg-slate-50 text-slate-600 text-xs border-b border-slate-200">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      ID
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Request ID
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Recipient &amp; Destination
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Volunteer
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Dispatch Date
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Status
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDeliveries.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="p-6 text-center text-xs text-slate-400"
                      >
                        No matching deliveries found.
                      </td>
                    </tr>
                  ) : (
                    slicePage(filteredDeliveries).map((d) => (
                      <tr key={d.deliveryId} className="hover:bg-slate-50/80">
                        <th
                          scope="row"
                          className="px-4 py-3 font-semibold text-slate-700 tabular-nums whitespace-nowrap"
                        >
                          {d.deliveryId}
                        </th>
                        <td className="px-4 py-3 font-medium text-slate-700 tabular-nums whitespace-nowrap">
                          {d.requestId}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">
                            {d.orgName}
                          </div>
                          <div className="text-xs text-slate-500">
                            {d.location}
                            {d.eventName ? ` · ${d.eventName}` : ""}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          <div>{d.volunteerName}</div>
                          {d.vehicleType && (
                            <div className="text-[11px] text-slate-400">
                              {d.vehicleType}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-500 tabular-nums whitespace-nowrap">
                          {d.dispatchDate}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <StatusBadge status={d.deliveryStatus} />
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedWaybill(d)}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 active:scale-[0.98] px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition"
                            >
                              <FileText
                                className="h-3.5 w-3.5 text-slate-500"
                                aria-hidden="true"
                              />
                              Waybill
                            </button>
                            {d.deliveryStatus === "Pending" && (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() =>
                                  handleUpdateDeliveryStatus(
                                    d.deliveryId,
                                    "In Transit"
                                  )
                                }
                                className="rounded-lg bg-amber-500 hover:bg-amber-600 active:scale-[0.98] disabled:opacity-50 px-2.5 py-1.5 text-xs font-semibold text-white transition"
                              >
                                Start Transit
                              </button>
                            )}
                            {d.deliveryStatus !== "Delivered" && (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() =>
                                  handleUpdateDeliveryStatus(
                                    d.deliveryId,
                                    "Delivered"
                                  )
                                }
                                className="rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50 px-2.5 py-1.5 text-xs font-semibold text-white transition"
                              >
                                {busyKey === `delivery-${d.deliveryId}`
                                  ? "Saving..."
                                  : "Mark Delivered"}
                              </button>
                            )}
                            <button
                              type="button"
                              disabled={isBusy}
                              aria-label={`Delete delivery ${d.deliveryId}`}
                              onClick={() =>
                                openDeleteConfirm({
                                  kind: "delivery",
                                  id: d.deliveryId,
                                  label: `Delivery ${d.deliveryId} for Request ${d.requestId}`,
                                })
                              }
                              className="rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 active:scale-[0.98] disabled:opacity-50 p-1.5 transition"
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <PaginationControls
              totalItems={filteredDeliveries.length}
              page={page}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
          </div>
        </div>
      )}

      {/* TAB 7: MASTER STAKEHOLDERS & SYSTEM USERS */}
      {activeTab === "stakeholders" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
              <h2 className="text-sm font-bold text-slate-900 mb-2">
                Partner Organizations &amp; LGUs ({organizations.length})
              </h2>
              <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                {organizations.map((o) => (
                  <div key={o.orgId} className="py-2 text-xs">
                    <div className="font-semibold text-slate-900 flex items-center justify-between gap-2">
                      <span>{o.orgName}</span>
                      <span className="text-[11px] font-medium text-slate-400 tabular-nums shrink-0">
                        ID {o.orgId}
                      </span>
                    </div>
                    <div className="text-slate-500">{o.location}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
              <h2 className="text-sm font-bold text-slate-900 mb-2">
                Registered Donors ({donors.length})
              </h2>
              <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                {donors.map((d) => (
                  <div
                    key={d.donorId}
                    className="py-2 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <span className="font-semibold text-slate-900">
                        {d.donorName}
                      </span>
                      <span className="text-[11px] font-medium text-slate-400 tabular-nums ml-1.5">
                        ID {d.donorId}
                      </span>
                    </div>
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 shrink-0">
                      {d.donorType}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
              <h2 className="text-sm font-bold text-slate-900 mb-2">
                Field Volunteers ({volunteers.length})
              </h2>
              <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                {volunteers.map((v) => (
                  <div
                    key={v.volunteerId}
                    className="py-2 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <div>
                        <span className="font-semibold text-slate-900">
                          {v.volunteerName}
                        </span>
                        <span className="text-[11px] font-medium text-slate-400 tabular-nums ml-1.5">
                          ID {v.volunteerId}
                        </span>
                      </div>
                      <div className="text-slate-500">{v.vehicleType}</div>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold border shrink-0 ${
                        v.isAvailable
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200/80"
                          : "bg-slate-100 text-slate-600 border-slate-200"
                      }`}
                    >
                      {v.isAvailable ? "Available" : "On Assignment"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-sm font-bold text-slate-900">
                User Accounts ({filteredUsers.length})
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                {["ALL", "Admin", "Donor", "Organization", "Volunteer"].map(
                  (role) => (
                    <button
                      key={role}
                      type="button"
                      aria-pressed={statusFilter === role}
                      onClick={() => setStatusFilter(role)}
                      className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition active:scale-[0.98] ${
                        statusFilter === role
                          ? "bg-blue-600 text-white shadow-xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {role === "ALL" ? "All" : role}
                    </button>
                  )
                )}
                <div className="relative">
                  <Search
                    className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    aria-label="Search system user accounts"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search user, username..."
                    className="rounded-xl border border-slate-300 pl-8 pr-3 py-1.5 text-xs w-full sm:w-52 focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div
              tabIndex={0}
              role="region"
              aria-label="System user accounts table"
              className="overflow-x-auto"
            >
              <table className="w-full text-left text-xs sm:text-sm">
                <caption className="sr-only">System user accounts</caption>
                <thead className="bg-slate-50 text-slate-600 text-xs border-b border-slate-200">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      ID
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Full Name
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Username
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Role
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Email &amp; Contact
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="p-6 text-center text-xs text-slate-400"
                      >
                        No matching user accounts found.
                      </td>
                    </tr>
                  ) : (
                    slicePage(filteredUsers).map((u) => (
                      <tr key={u.userId} className="hover:bg-slate-50/80">
                        <th
                          scope="row"
                          className="px-4 py-3 font-semibold text-slate-700 tabular-nums whitespace-nowrap"
                        >
                          {u.userId}
                        </th>
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {u.fullName}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">
                          {u.username}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-block rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                            {u.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {u.email ? (
                            <div className="space-y-0.5">
                              <div className="text-slate-700 font-medium">
                                {u.email}
                              </div>
                              {u.contactInfo && (
                                <div className="text-xs text-slate-400">
                                  {u.contactInfo}
                                </div>
                              )}
                            </div>
                          ) : (
                            u.contactInfo || "—"
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                              u.isVerified === false
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200"
                            }`}
                          >
                            {u.isVerified === false ? "Unverified" : "Verified"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <PaginationControls
              totalItems={filteredUsers.length}
              page={page}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
          </div>
        </div>
      )}

      {/* TAB 8: NOTIFICATIONS */}
      {activeTab === "notifications" && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">
              Notifications
            </h2>
            <span className="text-xs font-medium text-slate-500">
              {unreadCount} unread
            </span>
          </div>
          <div className="divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No notifications recorded yet.
              </div>
            ) : (
              slicePage(notifications).map((n) => (
                <div
                  key={n.notificationId}
                  className={`p-4 flex items-center justify-between gap-4 ${
                    n.isRead ? "bg-white" : "bg-blue-50/40"
                  }`}
                >
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-slate-900">
                      {n.message}
                    </p>
                    <p className="text-xs text-slate-400">
                      User {n.userId} &middot;{" "}
                      {n.dateSent
                        ? new Date(n.dateSent).toLocaleString()
                        : "Just now"}
                    </p>
                  </div>
                  {!n.isRead && (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() =>
                        handleMarkNotificationRead(n.notificationId)
                      }
                      className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 px-3 py-1.5 text-xs font-medium text-slate-700 shrink-0"
                    >
                      <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                      Mark Read
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
          <PaginationControls
            totalItems={notifications.length}
            page={page}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />
        </div>
      )}

      {/* TAB 9: REPORTS */}
      {activeTab === "reports" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                aria-pressed={activeReport === "operationalSummary"}
                onClick={() => setActiveReport("operationalSummary")}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition active:scale-[0.98] ${
                  activeReport === "operationalSummary"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Summary
              </button>
              <button
                type="button"
                aria-pressed={activeReport === "inventoryHealth"}
                onClick={() => setActiveReport("inventoryHealth")}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition active:scale-[0.98] ${
                  activeReport === "inventoryHealth"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Stocks Report
              </button>
              <button
                type="button"
                aria-pressed={activeReport === "donorImpact"}
                onClick={() => setActiveReport("donorImpact")}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition active:scale-[0.98] ${
                  activeReport === "donorImpact"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Donor Report
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={exportReportCsv}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] px-3 py-1.5 text-xs font-semibold text-white transition"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                Export CSV
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 active:scale-[0.98] px-3 py-1.5 text-xs font-semibold text-white transition"
              >
                <Printer className="h-3.5 w-3.5" aria-hidden="true" />
                Print Report
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            {/* Printable Official Header (Shows when printing) */}
            <div className="hidden print:block mb-6 border-b-2 border-slate-900 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src="/ndrrmc-logo.png"
                    alt="NDRRMC Seal"
                    className="h-16 w-16 object-contain"
                  />
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                      Republic of the Philippines &bull; Office of Civil Defense
                    </div>
                    <h1 className="text-lg font-black text-slate-900 leading-tight">
                      National Disaster Risk Reduction &amp; Management Council
                    </h1>
                    <p className="text-xs font-semibold text-blue-900">
                      Disaster Relief &amp; Resource Management System (DRRMS) &bull; Central Decision-Support Operations
                    </p>
                  </div>
                </div>
                <div className="text-right text-[11px] text-slate-600 space-y-0.5">
                  <div>
                    <span className="font-bold">Doc ID:</span> DRRMS-REP-
                    {activeReport.toUpperCase()}
                  </div>
                  <div>
                    <span className="font-bold">Date Generated:</span>{" "}
                    {new Date().toLocaleDateString("en-PH", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                  <div className="text-[10px] uppercase font-bold text-emerald-700">
                    Official Decision-Support Record
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-4 border-b border-slate-200 pb-3">
              <h2 className="text-base font-bold text-slate-900">
                {activeReport === "operationalSummary" && "Summary"}
                {activeReport === "inventoryHealth" && "Stocks Report"}
                {activeReport === "donorImpact" && "Donor Report"}
              </h2>
            </div>

            {/* Statistical Graphs and Visual Charts (Visible in UI and Rendered Crisply on Print) */}
            {activeReport === "operationalSummary" && (
              <OperationalSummaryCharts
                rows={reports.operationalSummary || []}
              />
            )}
            {activeReport === "inventoryHealth" && (
              <InventoryHealthCharts
                rows={reports.inventoryHealth || []}
              />
            )}
            {activeReport === "donorImpact" && (
              <DonorImpactCharts
                rows={reports.donorImpact || []}
              />
            )}

            {activeReport === "operationalSummary" && (
              <div
                tabIndex={0}
                role="region"
                aria-label="Disaster summary report table"
                className="overflow-x-auto"
              >
                <table className="w-full text-left text-xs sm:text-sm">
                  <caption className="sr-only">Disaster operations summary</caption>
                  <thead className="bg-slate-50 text-slate-600 text-xs border-b border-slate-200">
                    <tr>
                      <th scope="col" className="px-4 py-3 font-semibold">
                        ID
                      </th>
                      <th scope="col" className="px-4 py-3 font-semibold">
                        Disaster Event
                      </th>
                      <th scope="col" className="px-4 py-3 font-semibold">
                        Location
                      </th>
                      <th scope="col" className="px-4 py-3 font-semibold">
                        Status
                      </th>
                      <th scope="col" className="px-4 py-3 font-semibold">
                        Donations
                      </th>
                      <th scope="col" className="px-4 py-3 font-semibold">
                        Requests
                      </th>
                      <th scope="col" className="px-4 py-3 font-semibold">
                        Deliveries
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(reports.operationalSummary || []).map((r: any) => (
                      <tr key={r.eventId} className="hover:bg-slate-50/80">
                        <th
                          scope="row"
                          className="px-4 py-3 font-semibold text-slate-700 tabular-nums whitespace-nowrap"
                        >
                          {r.eventId}
                        </th>
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {r.eventName}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{r.location}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <StatusBadge status={r.status} />
                        </td>
                        <td className="px-4 py-3 font-semibold text-emerald-700 tabular-nums">
                          {Number(r.totalDonations || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 font-semibold text-amber-700 tabular-nums">
                          {Number(r.totalRequests || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 font-semibold text-blue-700 tabular-nums">
                          {Number(r.totalDeliveries || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeReport === "inventoryHealth" && (
              <div
                tabIndex={0}
                role="region"
                aria-label="Stocks report table"
                className="overflow-x-auto"
              >
                <table className="w-full text-left text-xs sm:text-sm">
                  <caption className="sr-only">Warehouse stocks report</caption>
                  <thead className="bg-slate-50 text-slate-600 text-xs border-b border-slate-200">
                    <tr>
                      <th scope="col" className="px-4 py-3 font-semibold">
                        ID
                      </th>
                      <th scope="col" className="px-4 py-3 font-semibold">
                        Item Name
                      </th>
                      <th scope="col" className="px-4 py-3 font-semibold">
                        Category
                      </th>
                      <th scope="col" className="px-4 py-3 font-semibold">
                        Current Stock
                      </th>
                      <th scope="col" className="px-4 py-3 font-semibold">
                        Donated
                      </th>
                      <th scope="col" className="px-4 py-3 font-semibold">
                        Requested
                      </th>
                      <th scope="col" className="px-4 py-3 font-semibold">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(reports.inventoryHealth || []).map((r: any) => (
                      <tr key={r.goodId} className="hover:bg-slate-50/80">
                        <th
                          scope="row"
                          className="px-4 py-3 font-semibold text-slate-700 tabular-nums whitespace-nowrap"
                        >
                          {r.goodId}
                        </th>
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {r.itemName}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{r.category}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                          {r.currentStockFormatted}
                        </td>
                        <td className="px-4 py-3 text-emerald-700 font-semibold tabular-nums">
                          +{Number(r.totalDonatedQty || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-amber-700 font-semibold tabular-nums">
                          -{Number(r.totalRequestedQty || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <StatusBadge status={r.stockHealth} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeReport === "donorImpact" && (
              <div
                tabIndex={0}
                role="region"
                aria-label="Donor report table"
                className="overflow-x-auto"
              >
                <table className="w-full text-left text-xs sm:text-sm">
                  <caption className="sr-only">Donor contribution report</caption>
                  <thead className="bg-slate-50 text-slate-600 text-xs border-b border-slate-200">
                    <tr>
                      <th scope="col" className="px-4 py-3 font-semibold">
                        ID
                      </th>
                      <th scope="col" className="px-4 py-3 font-semibold">
                        Donor
                      </th>
                      <th scope="col" className="px-4 py-3 font-semibold">
                        Type
                      </th>
                      <th scope="col" className="px-4 py-3 font-semibold">
                        Contact
                      </th>
                      <th scope="col" className="px-4 py-3 font-semibold">
                        Donations
                      </th>
                      <th scope="col" className="px-4 py-3 font-semibold">
                        Events Supported
                      </th>
                      <th scope="col" className="px-4 py-3 font-semibold">
                        Total Items Donated
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(reports.donorImpact || []).map((r: any) => (
                      <tr key={r.donorId} className="hover:bg-slate-50/80">
                        <th
                          scope="row"
                          className="px-4 py-3 font-semibold text-slate-700 tabular-nums whitespace-nowrap"
                        >
                          {r.donorId}
                        </th>
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {r.donorName}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{r.donorType}</td>
                        <td className="px-4 py-3 text-slate-600">{r.contactInfo}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900 tabular-nums">
                          {Number(r.totalDonations || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-slate-700 tabular-nums">
                          {Number(r.eventsSupported || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 font-semibold text-emerald-700 tabular-nums whitespace-nowrap">
                          {Number(r.totalItemsDonated || 0).toLocaleString()} units
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Official Print Sign-Off Block (Shows when printing) */}
            <div className="hidden print:grid grid-cols-3 gap-8 pt-8 mt-8 border-t-2 border-slate-300 text-xs text-center">
              <div className="space-y-8">
                <p className="font-semibold text-slate-600">Prepared By:</p>
                <div className="border-t border-slate-400 pt-1 font-bold text-slate-900">
                  Central Operations Officer
                  <span className="block text-[10px] font-normal text-slate-500">
                    Disaster Relief Dispatch
                  </span>
                </div>
              </div>
              <div className="space-y-8">
                <p className="font-semibold text-slate-600">Verified By:</p>
                <div className="border-t border-slate-400 pt-1 font-bold text-slate-900">
                  Logistics &amp; Inventory Controller
                  <span className="block text-[10px] font-normal text-slate-500">
                    Resource Management Division
                  </span>
                </div>
              </div>
              <div className="space-y-8">
                <p className="font-semibold text-slate-600">Approved By:</p>
                <div className="border-t border-slate-400 pt-1 font-bold text-slate-900">
                  NDRRMC Operations Director
                  <span className="block text-[10px] font-normal text-slate-500">
                    Executive Oversight
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Native top-layer modal delete confirmation */}
      <dialog
        ref={confirmDialogRef}
        aria-labelledby="confirm-delete-title"
        aria-describedby="confirm-delete-desc"
        className="p-0 rounded-2xl border border-slate-200 bg-white shadow-xl max-w-md w-[calc(100%-2rem)] m-auto text-slate-900"
      >
        <div className="p-6 space-y-4">
          <div className="space-y-1.5">
            <h2
              id="confirm-delete-title"
              className="text-base font-bold text-slate-900"
            >
              Confirm Record Deletion
            </h2>
            <p id="confirm-delete-desc" className="text-xs text-slate-600">
              {deleteTarget
                ? `Are you sure you want to permanently remove ${deleteTarget.label}? Cascading child items linked in PostgreSQL will also be removed.`
                : "Are you sure you want to delete this record?"}
            </p>
          </div>
          <form method="dialog" className="flex justify-end gap-2 pt-2">
            <button
              ref={cancelBtnRef}
              value="cancel"
              autoFocus
              className="rounded-xl border border-slate-300 bg-white hover:bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              value="delete"
              className="rounded-xl bg-rose-600 hover:bg-rose-700 px-4 py-2 text-xs font-semibold text-white"
            >
              Delete Record
            </button>
          </form>
        </div>
      </dialog>

      {/* Emergency Fleet SMS Broadcast Console */}
      {showBroadcastModal && (
        <EmergencyBroadcastModal
          events={events}
          onClose={() => setShowBroadcastModal(false)}
          onBroadcastSent={(msg) => showToast(msg, "success")}
        />
      )}

      {/* Cargo Waybill Modal */}
      {selectedWaybill && (
        <DeliveryWaybillModal
          delivery={selectedWaybill}
          driverName={selectedWaybill.volunteerName}
          vehicle={selectedWaybill.vehicleType}
          onClose={() => setSelectedWaybill(null)}
        />
      )}
    </PortalSidebarLayout>
  );
}
