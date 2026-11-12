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
  Clock,
  RotateCcw,
  FileText,
  ChevronLeft,
  ChevronRight,
  Calendar,
  MapPin,
  X,
  PackageCheck,
} from "lucide-react";
import { PortalSidebarLayout, SidebarNavItem } from "@/components/PortalHeader";
import { PortalShellSkeleton, StatusBadge } from "@/components/SkeletonUI";
import { DeliveryWaybillModal } from "@/components/DisasterEnhancements";
import {
  AnimatedNumber,
  DeliveryStepBar,
  StockLevelBar,
  closeTopLayer,
  handleAnimatedDialogSubmit,
  useSiblingStagger,
} from "@/components/InteractiveMotion";
import {
  apiFetch,
  getSavedSession,
  getCachedData,
  setCachedData,
  UserSession,
} from "@/lib/api";

interface RequestLineDraft {
  rowKey: string;
  goodId: number;
  quantity: number;
}

type OrgTab = "request" | "history" | "deliveries" | "notifications";

const PAGE_SIZE = 7;

function getPortalRouteForRole(role?: string): string {
  const r = (role || "").toLowerCase();
  if (r === "admin" || r === "manager") return "/admin";
  if (r === "donor") return "/donor";
  if (r === "organization") return "/organization";
  if (r === "volunteer") return "/volunteer";
  return "/";
}

function getStockHealthStatus(
  stock: number
): "CRITICAL ALERT" | "LOW STOCK" | "SUFFICIENT" {
  if (stock <= 200) return "CRITICAL ALERT";
  if (stock <= 1000) return "LOW STOCK";
  return "SUFFICIENT";
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
  if (totalItems <= pageSize) return null;

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
          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 active:scale-[0.98] disabled:opacity-40 px-2.5 py-1 font-semibold text-slate-700 transition"
        >
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Prev
        </button>
        <span className="font-semibold text-slate-700 px-1">
          Page {safePage} of {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(safePage + 1)}
          disabled={safePage >= totalPages}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 active:scale-[0.98] disabled:opacity-40 px-2.5 py-1 font-semibold text-slate-700 transition"
        >
          Next
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export default function OrganizationPortalPage() {
  const router = useRouter();
  const [session, setSession] = useState<UserSession | null>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<OrgTab>("request");
  const [banner, setBanner] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const bannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Requisition draft state
  const rowSeqRef = useRef(2);
  const [selectedEventId, setSelectedEventId] = useState<number>(0);
  const [draftItems, setDraftItems] = useState<RequestLineDraft[]>([
    { rowKey: "row-1", goodId: 1, quantity: 100 },
  ]);
  const [touchedQtyRows, setTouchedQtyRows] = useState<Record<string, boolean>>(
    {}
  );
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [recentlyAddedGoodId, setRecentlyAddedGoodId] = useState<number | null>(
    null
  );
  const hasInitDefaultsRef = useRef(false);

  // Stock sidebar filter
  const [stockFilter, setStockFilter] = useState<"ALL" | "IN_STOCK">("ALL");
  const [stockSearch, setStockSearch] = useState("");

  // Requests history filters & pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [historyPage, setHistoryPage] = useState(1);

  // Incoming deliveries filters & pagination
  const [delSearchQuery, setDelSearchQuery] = useState("");
  const [delStatusFilter, setDelStatusFilter] = useState("ALL");
  const [delPage, setDelPage] = useState(1);

  // Notifications filters
  const [notifFilter, setNotifFilter] = useState<"ALL" | "UNREAD">("ALL");
  const [markingAllRead, setMarkingAllRead] = useState(false);

  // Waybill preview + native <dialog> confirmations
  const [selectedWaybill, setSelectedWaybill] = useState<any>(null);

  const [cancelTarget, setCancelTarget] = useState<any>(null);
  const [cancelling, setCancelling] = useState(false);
  const pendingCancelRef = useRef<any>(null);
  const cancelDialogRef = useRef<HTMLDialogElement | null>(null);
  const keepRequestBtnRef = useRef<HTMLButtonElement | null>(null);

  const [receiptTarget, setReceiptTarget] = useState<any>(null);
  const [confirmingReceipt, setConfirmingReceipt] = useState(false);
  const pendingReceiptRef = useRef<any>(null);
  const receiptDialogRef = useRef<HTMLDialogElement | null>(null);
  const keepReceiptBtnRef = useRef<HTMLButtonElement | null>(null);
  const kpiGridRef = useRef<HTMLDivElement | null>(null);

  useSiblingStagger(kpiGridRef, !loading);

  const nextRowKey = () => {
    const k = `row-${rowSeqRef.current}`;
    rowSeqRef.current += 1;
    return k;
  };

  const showBanner = useCallback(
    (text: string, type: "success" | "error" = "success") => {
      if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
      setBanner({ type, text });
      if (type === "success") {
        bannerTimerRef.current = setTimeout(() => {
          setBanner(null);
        }, 6000);
      }
    },
    []
  );

  useEffect(() => {
    return () => {
      if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    };
  }, []);

  const syncDefaultsFromPayload = useCallback((payload: any) => {
    const evList: any[] = payload?.events || [];
    const activeOnly = evList.filter(
      (ev) => (ev.status || "").toLowerCase() === "active"
    );
    const catalog: any[] = payload?.goods || [];
    const validIds = new Set(catalog.map((g) => g.goodId));

    if (!hasInitDefaultsRef.current) {
      if (evList.length > 0 || catalog.length > 0) {
        hasInitDefaultsRef.current = true;
        if (activeOnly.length > 0) {
          setSelectedEventId(activeOnly[0].eventId);
        }
        if (catalog.length > 0) {
          setDraftItems([
            { rowKey: "row-1", goodId: catalog[0].goodId, quantity: 100 },
          ]);
        }
      }
      return;
    }

    if (catalog.length > 0) {
      setDraftItems((prev) =>
        prev.map((line) =>
          validIds.has(line.goodId)
            ? line
            : { ...line, goodId: catalog[0].goodId }
        )
      );
    }
  }, []);

  const loadOrgPortal = useCallback(
    async (userId: number, isBackground = false) => {
      const cacheKey = `org_portal_${userId}`;
      if (!isBackground) {
        const cached = getCachedData<any>(cacheKey);
        if (cached) {
          setData(cached);
          syncDefaultsFromPayload(cached);
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
        syncDefaultsFromPayload(fresh);
      } catch (err: any) {
        showBanner(err.message || "Failed to load data.", "error");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [showBanner, syncDefaultsFromPayload]
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

  useEffect(() => {
    setHistoryPage(1);
  }, [searchQuery, statusFilter, activeTab]);

  useEffect(() => {
    setDelPage(1);
  }, [delSearchQuery, delStatusFilter, activeTab]);

  const executeCancelRequest = useCallback(
    async (reqItem: any) => {
      if (!session?.user || !reqItem?.requestId) return;
      setCancelling(true);
      try {
        await apiFetch(
          `/api/requests?id=${reqItem.requestId}&userId=${session.user.userId}&onlyPending=true`,
          { method: "DELETE" }
        );
        showBanner(
          `Pending Request ${reqItem.requestId} has been cancelled.`,
          "success"
        );
        await loadOrgPortal(session.user.userId, true);
      } catch (err: any) {
        showBanner(err.message || "Failed to cancel request.", "error");
      } finally {
        setCancelling(false);
      }
    },
    [loadOrgPortal, session, showBanner]
  );

  const executeConfirmReceipt = useCallback(
    async (delItem: any) => {
      if (!session?.user || !delItem?.deliveryId) return;
      setConfirmingReceipt(true);
      try {
        await apiFetch("/api/deliveries", {
          method: "PUT",
          body: JSON.stringify({
            deliveryId: delItem.deliveryId,
            deliveryStatus: "Delivered",
          }),
        });
        showBanner(
          `Delivery ${delItem.deliveryId} confirmed received and Request ${delItem.requestId} marked Fulfilled.`,
          "success"
        );
        await loadOrgPortal(session.user.userId, true);
      } catch (err: any) {
        showBanner(
          err.message || "Failed to confirm delivery receipt.",
          "error"
        );
      } finally {
        setConfirmingReceipt(false);
      }
    },
    [loadOrgPortal, session, showBanner]
  );

  // Hook native <dialog> close, cancel, and light-dismiss fallback for Cancel Request dialog
  useEffect(() => {
    const dialog = cancelDialogRef.current;
    if (!dialog) return;

    const handleNativeClose = () => {
      const action = dialog.returnValue;
      dialog.returnValue = "";
      const target = pendingCancelRef.current;
      pendingCancelRef.current = null;
      setCancelTarget(null);
      if (action === "confirm" && target) {
        void executeCancelRequest(target);
      }
    };

    const handleNativeCancel = (e: Event) => {
      e.preventDefault();
      void closeTopLayer(dialog, "cancel");
    };

    dialog.addEventListener("close", handleNativeClose);
    dialog.addEventListener("cancel", handleNativeCancel);

    let pressedOutside = false;
    const isOutside = (e: PointerEvent) => {
      const r = dialog.getBoundingClientRect();
      return (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      );
    };
    const onDown = (e: PointerEvent) => {
      pressedOutside = isOutside(e);
    };
    const onUp = (e: PointerEvent) => {
      if (pressedOutside && isOutside(e)) {
        void closeTopLayer(dialog, "cancel");
      }
      pressedOutside = false;
    };
    const needsFallback = !("closedBy" in HTMLDialogElement.prototype);
    if (needsFallback) {
      dialog.addEventListener("pointerdown", onDown);
      dialog.addEventListener("pointerup", onUp);
    }

    return () => {
      dialog.removeEventListener("close", handleNativeClose);
      dialog.removeEventListener("cancel", handleNativeCancel);
      if (needsFallback) {
        dialog.removeEventListener("pointerdown", onDown);
        dialog.removeEventListener("pointerup", onUp);
      }
    };
  }, [executeCancelRequest, loading]);

  // Hook native <dialog> close, cancel, and light-dismiss fallback for Confirm Receipt dialog
  useEffect(() => {
    const dialog = receiptDialogRef.current;
    if (!dialog) return;

    const handleNativeClose = () => {
      const action = dialog.returnValue;
      dialog.returnValue = "";
      const target = pendingReceiptRef.current;
      pendingReceiptRef.current = null;
      setReceiptTarget(null);
      if (action === "confirm" && target) {
        void executeConfirmReceipt(target);
      }
    };

    const handleNativeCancel = (e: Event) => {
      e.preventDefault();
      void closeTopLayer(dialog, "cancel");
    };

    dialog.addEventListener("close", handleNativeClose);
    dialog.addEventListener("cancel", handleNativeCancel);

    let pressedOutside = false;
    const isOutside = (e: PointerEvent) => {
      const r = dialog.getBoundingClientRect();
      return (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      );
    };
    const onDown = (e: PointerEvent) => {
      pressedOutside = isOutside(e);
    };
    const onUp = (e: PointerEvent) => {
      if (pressedOutside && isOutside(e)) {
        void closeTopLayer(dialog, "cancel");
      }
      pressedOutside = false;
    };
    const needsFallback = !("closedBy" in HTMLDialogElement.prototype);
    if (needsFallback) {
      dialog.addEventListener("pointerdown", onDown);
      dialog.addEventListener("pointerup", onUp);
    }

    return () => {
      dialog.removeEventListener("close", handleNativeClose);
      dialog.removeEventListener("cancel", handleNativeCancel);
      if (needsFallback) {
        dialog.removeEventListener("pointerdown", onDown);
        dialog.removeEventListener("pointerup", onUp);
      }
    };
  }, [executeConfirmReceipt, loading]);

  const openCancelConfirm = (reqItem: any) => {
    pendingCancelRef.current = reqItem;
    setCancelTarget(reqItem);
    const dialog = cancelDialogRef.current;
    if (dialog) {
      dialog.removeAttribute("data-closing");
      dialog.returnValue = "";
      if (!dialog.open) dialog.showModal();
      keepRequestBtnRef.current?.focus();
    }
  };

  const openReceiptConfirm = (delItem: any) => {
    pendingReceiptRef.current = delItem;
    setReceiptTarget(delItem);
    const dialog = receiptDialogRef.current;
    if (dialog) {
      dialog.removeAttribute("data-closing");
      dialog.returnValue = "";
      if (!dialog.open) dialog.showModal();
      keepReceiptBtnRef.current?.focus();
    }
  };

  const requests: any[] = data?.requests || [];
  const deliveries: any[] = data?.deliveries || [];
  const events: any[] = data?.events || [];
  const goods: any[] = data?.goods || [];
  const inventory: any[] = data?.inventory || [];
  const notifications: any[] = data?.notifications || [];

  const activeEvents = useMemo(
    () => events.filter((ev) => (ev.status || "").toLowerCase() === "active"),
    [events]
  );

  // Keep selectedEventId pointed to an Active event when events refresh
  useEffect(() => {
    if (activeEvents.length === 0) {
      if (selectedEventId !== 0) setSelectedEventId(0);
      return;
    }
    if (!activeEvents.some((ev) => ev.eventId === selectedEventId)) {
      setSelectedEventId(activeEvents[0].eventId);
    }
  }, [activeEvents, selectedEventId]);

  const selectedEvent = useMemo(
    () => activeEvents.find((ev) => ev.eventId === selectedEventId) || null,
    [activeEvents, selectedEventId]
  );

  const inventoryByGoodId = useMemo(() => {
    const map = new Map<number, any>();
    for (const inv of inventory) {
      map.set(inv.goodId, inv);
    }
    return map;
  }, [inventory]);

  const filteredStockList = useMemo(() => {
    const q = stockSearch.trim().toLowerCase();
    const base =
      inventory.length > 0
        ? inventory
        : goods.map((g) => ({
            inventoryId: g.goodId,
            goodId: g.goodId,
            itemName: g.itemName,
            category: g.category,
            unitOfMeasure: g.unitOfMeasure,
            currentStock: 0,
          }));
    return base.filter((item) => {
      const stock = Number(item.currentStock || 0);
      const matchesAvail = stockFilter === "ALL" || stock > 0;
      const matchesSearch =
        !q ||
        (item.itemName || "").toLowerCase().includes(q) ||
        (item.category || "").toLowerCase().includes(q);
      return matchesAvail && matchesSearch;
    });
  }, [goods, inventory, stockFilter, stockSearch]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  const pendingRequestsCount = useMemo(
    () => requests.filter((r) => r.status === "Pending").length,
    [requests]
  );

  const approvedCount = useMemo(
    () =>
      requests.filter(
        (r) => r.status === "Approved" || r.status === "Fulfilled"
      ).length,
    [requests]
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

  const hasDuplicateGoods = useMemo(() => {
    const seen = new Set<number>();
    for (const line of draftItems) {
      if (seen.has(line.goodId)) return true;
      seen.add(line.goodId);
    }
    return false;
  }, [draftItems]);

  const draftSummary = useMemo(() => {
    const valid = new Map<number, number>();
    for (const line of draftItems) {
      if (
        line.goodId > 0 &&
        Number.isInteger(line.quantity) &&
        line.quantity > 0
      ) {
        valid.set(line.goodId, (valid.get(line.goodId) || 0) + line.quantity);
      }
    }
    const totalUnits = Array.from(valid.values()).reduce((a, b) => a + b, 0);
    return { itemTypes: valid.size, totalUnits };
  }, [draftItems]);

  const filteredRequests = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return requests.filter((r) => {
      const matchesStatus =
        statusFilter === "ALL" || r.status === statusFilter;
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

  const paginatedRequests = useMemo(() => {
    const totalPages = Math.max(
      1,
      Math.ceil(filteredRequests.length / PAGE_SIZE)
    );
    const safePage = Math.min(Math.max(1, historyPage), totalPages);
    return filteredRequests.slice(
      (safePage - 1) * PAGE_SIZE,
      safePage * PAGE_SIZE
    );
  }, [filteredRequests, historyPage]);

  const filteredDeliveries = useMemo(() => {
    const q = delSearchQuery.trim().toLowerCase();
    return deliveries.filter((del) => {
      const matchesStatus =
        delStatusFilter === "ALL" || del.deliveryStatus === delStatusFilter;
      const cargoStr = (del.items || [])
        .map((i: any) => i.itemName)
        .join(" ")
        .toLowerCase();
      const matchesSearch =
        !q ||
        String(del.deliveryId).includes(q) ||
        String(del.requestId).includes(q) ||
        (del.volunteerName || "").toLowerCase().includes(q) ||
        (del.eventName || "").toLowerCase().includes(q) ||
        (del.location || "").toLowerCase().includes(q) ||
        cargoStr.includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [deliveries, delStatusFilter, delSearchQuery]);

  const paginatedDeliveries = useMemo(() => {
    const totalPages = Math.max(
      1,
      Math.ceil(filteredDeliveries.length / PAGE_SIZE)
    );
    const safePage = Math.min(Math.max(1, delPage), totalPages);
    return filteredDeliveries.slice(
      (safePage - 1) * PAGE_SIZE,
      safePage * PAGE_SIZE
    );
  }, [filteredDeliveries, delPage]);

  const filteredNotifications = useMemo(() => {
    if (notifFilter === "UNREAD") {
      return notifications.filter((n) => !n.isRead);
    }
    return notifications;
  }, [notifications, notifFilter]);

  // Interactive Draft Builders
  const addDraftLine = () => {
    const usedIds = new Set(draftItems.map((l) => l.goodId));
    const nextGood =
      goods.find((g) => !usedIds.has(g.goodId)) || goods[0] || { goodId: 1 };
    setDraftItems((prev) => [
      ...prev,
      { rowKey: nextRowKey(), goodId: nextGood.goodId, quantity: 50 },
    ]);
  };

  const quickAddSupply = (goodId: number, amount = 50) => {
    setActiveTab("request");
    setSubmitAttempted(false);

    setDraftItems((prev) => {
      const existingIdx = prev.findIndex((l) => l.goodId === goodId);
      if (existingIdx >= 0) {
        return prev.map((l, idx) =>
          idx === existingIdx
            ? {
                ...l,
                quantity: Math.min(1000000, Math.max(0, l.quantity) + amount),
              }
            : l
        );
      }
      return [...prev, { rowKey: nextRowKey(), goodId, quantity: amount }];
    });

    setRecentlyAddedGoodId(goodId);
    setTimeout(() => {
      setRecentlyAddedGoodId((curr) => (curr === goodId ? null : curr));
    }, 1500);
  };

  const combineDuplicateDraftLines = () => {
    const merged = new Map<number, { rowKey: string; quantity: number }>();
    for (const line of draftItems) {
      const qty =
        Number.isInteger(line.quantity) && line.quantity > 0
          ? line.quantity
          : 0;
      const existing = merged.get(line.goodId);
      if (existing) {
        existing.quantity += qty;
      } else {
        merged.set(line.goodId, { rowKey: line.rowKey, quantity: qty });
      }
    }
    setDraftItems(
      Array.from(merged.entries()).map(([goodId, info]) => ({
        rowKey: info.rowKey,
        goodId,
        quantity: info.quantity > 0 ? info.quantity : 50,
      }))
    );
  };

  const removeDraftLine = (rowKey: string) => {
    if (draftItems.length <= 1) return;
    setDraftItems((prev) => prev.filter((l) => l.rowKey !== rowKey));
  };

  const updateDraftLine = (
    rowKey: string,
    field: "goodId" | "quantity",
    value: number
  ) => {
    const safeValue = Number.isFinite(value) ? Math.floor(value) : 0;
    setDraftItems((prev) =>
      prev.map((item) =>
        item.rowKey === rowKey ? { ...item, [field]: safeValue } : item
      )
    );
  };

  const bumpDraftQuantity = (rowKey: string, delta: number) => {
    setDraftItems((prev) =>
      prev.map((item) =>
        item.rowKey === rowKey
          ? {
              ...item,
              quantity: Math.min(
                1000000,
                Math.max(1, (item.quantity || 0) + delta)
              ),
            }
          : item
      )
    );
  };

  const resetDraft = () => {
    if (activeEvents.length > 0) {
      setSelectedEventId(activeEvents[0].eventId);
    }
    setDraftItems([
      { rowKey: nextRowKey(), goodId: goods[0]?.goodId || 1, quantity: 100 },
    ]);
    setTouchedQtyRows({});
    setSubmitAttempted(false);
    setBanner(null);
  };

  const handleRequestAgain = (reqRecord: any) => {
    const matchingActive =
      reqRecord.eventId &&
      activeEvents.some((ev) => ev.eventId === reqRecord.eventId);
    const targetEventId = matchingActive
      ? reqRecord.eventId
      : activeEvents[0]?.eventId || 0;

    setSelectedEventId(targetEventId);
    setSubmitAttempted(false);
    setTouchedQtyRows({});

    const validIds = new Set(goods.map((g) => g.goodId));
    const clonedLines: RequestLineDraft[] = (reqRecord.items || [])
      .filter(
        (it: any) => validIds.has(it.goodId) && Number(it.quantity) > 0
      )
      .map((it: any) => ({
        rowKey: nextRowKey(),
        goodId: it.goodId,
        quantity: Number(it.quantity),
      }));

    setDraftItems(
      clonedLines.length > 0
        ? clonedLines
        : [
            {
              rowKey: nextRowKey(),
              goodId: goods[0]?.goodId || 1,
              quantity: 100,
            },
          ]
    );

    setActiveTab("request");
    if (reqRecord.eventId && !matchingActive && targetEventId > 0) {
      showBanner(
        `Items from Request ${reqRecord.requestId} loaded. "${reqRecord.eventName}" is already resolved, so target event switched to the active calamity.`,
        "success"
      );
    } else {
      showBanner(
        `Items from Request ${reqRecord.requestId} loaded into your requisition builder.`,
        "success"
      );
    }
  };

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user) return;
    setSubmitAttempted(true);

    if (!selectedEventId || activeEvents.length === 0) {
      showBanner(
        "Please select an active disaster event before submitting.",
        "error"
      );
      document.getElementById("org-event-select")?.focus();
      return;
    }

    const invalidLine = draftItems.find(
      (it) =>
        !it.goodId ||
        it.goodId <= 0 ||
        !Number.isInteger(it.quantity) ||
        it.quantity <= 0 ||
        it.quantity > 1000000
    );

    if (invalidLine) {
      showBanner(
        "Please enter a valid whole-number quantity between 1 and 1,000,000 for each item.",
        "error"
      );
      document.getElementById(`org-qty-${invalidLine.rowKey}`)?.focus();
      return;
    }

    const mergedMap = new Map<number, number>();
    for (const it of draftItems) {
      mergedMap.set(it.goodId, (mergedMap.get(it.goodId) || 0) + it.quantity);
    }
    const validItems = Array.from(mergedMap.entries()).map(
      ([goodId, quantity]) => ({ goodId, quantity })
    );

    if (validItems.length === 0) {
      showBanner("Please enter at least one valid requested item.", "error");
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
      showBanner(
        `Request ${res.requestId} submitted and queued for Steward approval.`,
        "success"
      );
      setDraftItems([
        { rowKey: nextRowKey(), goodId: goods[0]?.goodId || 1, quantity: 100 },
      ]);
      setTouchedQtyRows({});
      setSubmitAttempted(false);
      await loadOrgPortal(session.user.userId, true);
      setStatusFilter("ALL");
      setActiveTab("history");
    } catch (err: any) {
      showBanner(err.message || "Failed to submit request.", "error");
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
      showBanner(err.message || "Failed to update notification.", "error");
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    if (!session?.user || unreadCount === 0) return;
    setMarkingAllRead(true);
    try {
      try {
        await apiFetch("/api/notifications/read", {
          method: "PUT",
          body: JSON.stringify({ markAll: true, userId: session.user.userId }),
        });
      } catch {
        const unreadIds = notifications
          .filter((n) => !n.isRead && n.notificationId)
          .map((n) => n.notificationId);
        await Promise.all(
          unreadIds.map((id) =>
            apiFetch("/api/notifications/read", {
              method: "PUT",
              body: JSON.stringify({ notificationId: id }),
            })
          )
        );
      }
      await loadOrgPortal(session.user.userId, true);
      showBanner("All notifications marked as read.", "success");
    } catch (err: any) {
      showBanner(err.message || "Failed to mark all read.", "error");
    } finally {
      setMarkingAllRead(false);
    }
  };

  if (loading && !data) {
    return <PortalShellSkeleton title="Loading LGU Portal" />;
  }

  const orgName =
    data?.organization?.orgName ||
    session?.orgName ||
    session?.user?.fullName ||
    "Organization";
  const orgLocation =
    data?.organization?.location || session?.location || "City of Batac, Ilocos Norte";

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
      portalSubtitle={`${orgName} · ${orgLocation}`}
      roleBadge="Organization"
      navItems={navItems}
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      unreadCount={unreadCount}
      onOpenNotifications={() => setActiveTab("notifications")}
      notificationsList={notifications}
      onMarkNotificationRead={handleMarkNotificationRead}
      onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
      onSync={() => session?.user && loadOrgPortal(session.user.userId, true)}
      syncing={refreshing}
    >
      <div className="space-y-6 no-print">
        {banner && (
          <div
            role={banner.type === "error" ? "alert" : "status"}
            aria-live="polite"
            className={`toast-enter rounded-xl border px-4 py-3 flex items-center justify-between gap-3 text-xs sm:text-sm font-medium ${
              banner.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                : "bg-rose-50 border-rose-200 text-rose-900"
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              {banner.type === "success" ? (
                <CheckCircle2
                  className="h-4 w-4 text-emerald-600 shrink-0"
                  aria-hidden="true"
                />
              ) : (
                <AlertTriangle
                  className="h-4 w-4 text-rose-600 shrink-0"
                  aria-hidden="true"
                />
              )}
              <span>{banner.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setBanner(null)}
              aria-label="Dismiss notification message"
              className="rounded-lg p-1 text-slate-500 hover:bg-white/60 hover:text-slate-900 transition shrink-0"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Command & Control KPI Cards */}
        <div
          ref={kpiGridRef}
          className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 stagger-grid"
        >
          <button
            type="button"
            onClick={() => {
              setStatusFilter("ALL");
              setActiveTab("history");
            }}
            className="text-left rounded-lg border border-slate-200 bg-white hover:border-slate-400 p-3.5 shadow-xs transition-colors border-t-4 border-t-[#0038A8] group"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Total Requisitions
              </span>
              <span className="rounded bg-blue-50 text-[#0038A8] border border-blue-200 px-1.5 py-0.5 text-[9px] font-mono font-bold">
                BARANGAY
              </span>
            </div>
            <p className="mt-1.5 text-2xl font-black text-slate-900 tracking-tight tabular-nums group-hover:text-[#0038A8] transition-colors">
              <AnimatedNumber value={requests.length} />
            </p>
            <div className="text-[10px] text-slate-500 font-medium mt-1 truncate">
              Submitted to Batac CDRRMO
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setStatusFilter("Pending");
              setActiveTab("history");
            }}
            className="text-left rounded-lg border border-slate-200 bg-white hover:border-slate-400 p-3.5 shadow-xs transition-colors border-t-4 border-t-[#D97706] group"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Pending Review
              </span>
              <span className="rounded bg-amber-50 text-[#D97706] border border-amber-200 px-1.5 py-0.5 text-[9px] font-mono font-bold">
                EVALUATION
              </span>
            </div>
            <p className="mt-1.5 text-2xl font-black text-slate-900 tracking-tight tabular-nums group-hover:text-[#D97706] transition-colors">
              <AnimatedNumber value={pendingRequestsCount} />
            </p>
            <div className="text-[10px] text-slate-500 font-medium mt-1 truncate">
              Awaiting Central Depot Approval
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setStatusFilter("Approved");
              setActiveTab("history");
            }}
            className="text-left rounded-lg border border-slate-200 bg-white hover:border-slate-400 p-3.5 shadow-xs transition-colors border-t-4 border-t-emerald-600 group"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Approved Requisitions
              </span>
              <span className="rounded bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 text-[9px] font-mono font-bold">
                ALLOCATED
              </span>
            </div>
            <p className="mt-1.5 text-2xl font-black text-slate-900 tracking-tight tabular-nums group-hover:text-emerald-600 transition-colors">
              <AnimatedNumber value={approvedCount} />
            </p>
            <div className="text-[10px] text-slate-500 font-medium mt-1 truncate">
              Ready for Fleet Dispatch
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setDelStatusFilter("ALL");
              setActiveTab("deliveries");
            }}
            className="text-left rounded-lg border border-slate-200 bg-white hover:border-slate-400 p-3.5 shadow-xs transition-colors border-t-4 border-t-sky-600 group"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Deliveries &bull; Inbound
              </span>
              <span className="rounded bg-sky-50 text-sky-700 border border-sky-200 px-1.5 py-0.5 text-[9px] font-mono font-bold">
                LOGISTICS
              </span>
            </div>
            <p className="mt-1.5 text-2xl font-black text-slate-900 tracking-tight tabular-nums group-hover:text-sky-600 transition-colors">
              <AnimatedNumber value={deliveries.length} />
            </p>
            <div className="text-[10px] text-slate-500 font-medium mt-1 truncate">
              Incoming from Batac Depot
            </div>
          </button>
        </div>

        {/* TAB 1: NEW REQUEST BUILDER */}
        {activeTab === "request" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 tab-panel-enter">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 isolated-panel">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h2 className="text-base font-bold text-slate-900">
                  Request Relief Goods
                </h2>
                <button
                  type="button"
                  onClick={resetDraft}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 active:scale-[0.98] px-2.5 py-1 text-xs font-semibold text-slate-600 transition"
                >
                  <RotateCcw className="h-3 w-3" aria-hidden="true" />
                  <span>Reset</span>
                </button>
              </div>

              <form
                onSubmit={handleRequestSubmit}
                noValidate
                className="space-y-5"
              >
                <div>
                  <label
                    htmlFor="org-event-select"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Active Disaster Event{" "}
                    <span className="text-rose-600" aria-hidden="true">
                      *
                    </span>
                  </label>
                  <select
                    id="org-event-select"
                    name="eventId"
                    value={selectedEventId}
                    onChange={(e) => setSelectedEventId(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-600"
                    required
                  >
                    {activeEvents.length === 0 ? (
                      <option value={0}>No Active Disaster Events</option>
                    ) : (
                      activeEvents.map((ev: any) => (
                        <option key={ev.eventId} value={ev.eventId}>
                          {ev.eventName} ({ev.location})
                        </option>
                      ))
                    )}
                  </select>
                  {selectedEvent ? (
                    <div className="mt-2 rounded-xl bg-blue-50/60 border border-blue-100 px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-700">
                      <span className="inline-flex items-center gap-1.5 font-medium">
                        <MapPin
                          className="h-3.5 w-3.5 text-blue-600 shrink-0"
                          aria-hidden="true"
                        />
                        {selectedEvent.location}
                      </span>
                      {selectedEvent.startDate && (
                        <span className="inline-flex items-center gap-1 text-slate-500 tabular-nums">
                          <Calendar
                            className="h-3.5 w-3.5 shrink-0"
                            aria-hidden="true"
                          />
                          Started {selectedEvent.startDate}
                        </span>
                      )}
                    </div>
                  ) : (
                    <p className="mt-2 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                      No active disaster events are currently listed. Requests
                      require an active calamity declaration.
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-700">
                      Requested Items
                    </span>
                    <div className="flex items-center gap-2">
                      {hasDuplicateGoods && (
                        <button
                          type="button"
                          onClick={combineDuplicateDraftLines}
                          className="inline-flex items-center gap-1 rounded-lg bg-amber-50 border border-amber-200 hover:bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800 transition"
                        >
                          Combine duplicates
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={addDraftLine}
                        className="inline-flex items-center gap-1 rounded-lg bg-slate-100 hover:bg-slate-200 active:scale-[0.98] px-2.5 py-1 text-xs font-semibold text-slate-700 transition"
                      >
                        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                        Add Item
                      </button>
                    </div>
                  </div>

                  {draftItems.map((line, index) => {
                    const stockObj = inventoryByGoodId.get(line.goodId);
                    const avail = Number(stockObj?.currentStock ?? 0);
                    const totalForGood =
                      requestedTotalsByGood.get(line.goodId) || 0;
                    const exceedsStock = totalForGood > avail;
                    const qtyInvalid =
                      !Number.isInteger(line.quantity) ||
                      line.quantity <= 0 ||
                      line.quantity > 1000000;
                    const showQtyError =
                      qtyInvalid &&
                      (touchedQtyRows[line.rowKey] || submitAttempted);
                    const qtyId = `org-qty-${line.rowKey}`;
                    const errId = `org-err-${line.rowKey}`;

                    return (
                      <div
                        key={line.rowKey}
                        className="space-y-2 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
                          <div className="sm:col-span-6">
                            <label
                              htmlFor={`org-item-${line.rowKey}`}
                              className="block text-[11px] font-semibold text-slate-600 mb-1"
                            >
                              Relief Item {index + 1}
                            </label>
                            <select
                              id={`org-item-${line.rowKey}`}
                              value={line.goodId}
                              onChange={(e) =>
                                updateDraftLine(
                                  line.rowKey,
                                  "goodId",
                                  Number(e.target.value)
                                )
                              }
                              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                            >
                              {goods.map((g: any) => (
                                <option key={g.goodId} value={g.goodId}>
                                  {g.itemName} ({g.unitOfMeasure})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="sm:col-span-5">
                            <label
                              htmlFor={qtyId}
                              className="flex items-center justify-between text-[11px] font-semibold text-slate-600 mb-1"
                            >
                              <span>Quantity</span>
                              <span className="text-slate-500 font-medium tabular-nums">
                                Available: {avail.toLocaleString()}{" "}
                                {stockObj?.unitOfMeasure || ""}
                              </span>
                            </label>
                            <input
                              id={qtyId}
                              type="number"
                              min={1}
                              max={1000000}
                              step={1}
                              value={line.quantity > 0 ? line.quantity : ""}
                              aria-invalid={showQtyError ? "true" : "false"}
                              aria-describedby={showQtyError ? errId : undefined}
                              onBlur={() =>
                                setTouchedQtyRows((prev) => ({
                                  ...prev,
                                  [line.rowKey]: true,
                                }))
                              }
                              onChange={(e) => {
                                const raw = e.target.value;
                                updateDraftLine(
                                  line.rowKey,
                                  "quantity",
                                  raw === "" ? 0 : Number(raw)
                                );
                              }}
                              className={`w-full rounded-xl border bg-white px-3 py-2 text-sm text-slate-900 font-semibold tabular-nums ${
                                showQtyError
                                  ? "border-rose-500 bg-rose-50/40"
                                  : exceedsStock
                                  ? "border-amber-400"
                                  : "border-slate-300"
                              }`}
                              required
                            />
                            {showQtyError && (
                              <p
                                id={errId}
                                className="mt-1 text-[11px] font-medium text-rose-700"
                              >
                                Error: Enter a whole number from 1 to 1,000,000.
                              </p>
                            )}
                            <div className="mt-1.5 flex items-center gap-1.5">
                              {[25, 50, 100].map((inc) => (
                                <button
                                  key={inc}
                                  type="button"
                                  onClick={() =>
                                    bumpDraftQuantity(line.rowKey, inc)
                                  }
                                  className="rounded-lg border border-slate-200 bg-white hover:bg-slate-100 active:scale-[0.98] px-2 py-0.5 text-[11px] font-semibold text-slate-700 tabular-nums transition"
                                >
                                  +{inc}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="sm:col-span-1 flex justify-end sm:pt-6">
                            <button
                              type="button"
                              aria-label={`Remove requested item ${index + 1}`}
                              onClick={() => removeDraftLine(line.rowKey)}
                              disabled={draftItems.length <= 1}
                              className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30 transition"
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                            </button>
                          </div>
                        </div>

                        {exceedsStock && !showQtyError && (
                          <p className="text-[11px] font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5">
                            <AlertTriangle
                              className="h-3.5 w-3.5 shrink-0 text-amber-600"
                              aria-hidden="true"
                            />
                            <span>
                              Requested quantity (
                              {totalForGood.toLocaleString()}) exceeds current
                              warehouse stock ({avail.toLocaleString()}).
                              Approval may wait for replenishment.
                            </span>
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Summary + Submit */}
                <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-xs text-slate-600">
                    Requisition Summary:{" "}
                    <strong className="text-slate-900 tabular-nums">
                      {draftSummary.itemTypes}
                    </strong>{" "}
                    {draftSummary.itemTypes === 1 ? "item type" : "item types"}{" "}
                    &middot;{" "}
                    <strong className="text-slate-900 tabular-nums">
                      {draftSummary.totalUnits.toLocaleString()}
                    </strong>{" "}
                    total units
                  </div>
                  <button
                    type="submit"
                    disabled={submitting || activeEvents.length === 0}
                    className="rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] px-6 py-2.5 text-sm font-bold text-white shadow-sm transition disabled:opacity-50"
                  >
                    {submitting ? "Submitting..." : "Submit Request"}
                  </button>
                </div>
              </form>
            </div>

            {/* Interactive Warehouse Stock Sidebar */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-3 isolated-panel flex flex-col">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  Warehouse Stock
                </h3>
                <div className="inline-flex rounded-xl bg-slate-100 p-0.5 text-[11px] font-semibold">
                  <button
                    type="button"
                    aria-pressed={stockFilter === "IN_STOCK"}
                    onClick={() => setStockFilter("IN_STOCK")}
                    className={`rounded-lg px-2.5 py-1 transition ${
                      stockFilter === "IN_STOCK"
                        ? "bg-white text-slate-900 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    In Stock
                  </button>
                  <button
                    type="button"
                    aria-pressed={stockFilter === "ALL"}
                    onClick={() => setStockFilter("ALL")}
                    className={`rounded-lg px-2.5 py-1 transition ${
                      stockFilter === "ALL"
                        ? "bg-white text-slate-900 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    All
                  </button>
                </div>
              </div>

              <div className="relative">
                <Search
                  className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  aria-label="Search warehouse stock"
                  value={stockSearch}
                  onChange={(e) => setStockSearch(e.target.value)}
                  placeholder="Search supplies..."
                  className="w-full rounded-xl border border-slate-200 pl-8 pr-3 py-1.5 text-xs text-slate-900"
                />
              </div>

              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {filteredStockList.length === 0 ? (
                  <p className="py-8 text-center text-xs text-slate-400">
                    No matching stock items.
                  </p>
                ) : (
                  filteredStockList.map((item: any) => {
                    const stock = Number(item.currentStock || 0);
                    const health = getStockHealthStatus(stock);
                    const inDraft = draftItems.some(
                      (l) => l.goodId === item.goodId
                    );
                    const justAdded = recentlyAddedGoodId === item.goodId;

                    return (
                      <div
                        key={item.inventoryId || item.goodId}
                        className="rounded-xl border border-slate-200/80 p-3 flex items-center justify-between gap-2 bg-slate-50/50 hover:bg-slate-50 transition"
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="text-xs font-semibold text-slate-900 truncate">
                            {item.itemName}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                            <span>{item.category}</span>
                            <span>&middot;</span>
                            <span className="font-semibold text-slate-700 tabular-nums">
                              {stock.toLocaleString()} {item.unitOfMeasure}
                            </span>
                          </div>
                          <StockLevelBar stock={stock} className="mt-1.5" />
                          <div>
                            <StatusBadge status={health} />
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => quickAddSupply(item.goodId, 50)}
                          className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold shrink-0 transition active:scale-[0.97] ${
                            justAdded
                              ? "bg-emerald-600 text-white"
                              : "bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
                          }`}
                        >
                          {justAdded ? "Added" : inDraft ? "+50" : "+ Add 50"}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: REQUESTS HISTORY */}
        {activeTab === "history" && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden tab-panel-enter">
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                {["ALL", "Pending", "Approved", "Fulfilled"].map((st) => {
                  const count =
                    st === "ALL"
                      ? requests.length
                      : requests.filter((r) => r.status === st).length;
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
                  className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  aria-label="Search my requests"
                  placeholder="Search event or item..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full sm:w-64 rounded-xl border border-slate-300 pl-9 pr-3 py-1.5 text-xs text-slate-900"
                />
              </div>
            </div>

            <div
              tabIndex={0}
              role="region"
              aria-label="My relief requests table"
              className="overflow-x-auto"
            >
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <caption className="sr-only">LGU relief request history</caption>
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                    <th scope="col" className="py-3 px-4">
                      ID
                    </th>
                    <th scope="col" className="py-3 px-4">
                      Disaster Event
                    </th>
                    <th scope="col" className="py-3 px-4">
                      Date
                    </th>
                    <th scope="col" className="py-3 px-4">
                      Requested Items
                    </th>
                    <th scope="col" className="py-3 px-4">
                      Status
                    </th>
                    <th scope="col" className="py-3 px-4 text-right">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedRequests.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-8 text-center text-xs text-slate-400"
                      >
                        No matching requests found.
                      </td>
                    </tr>
                  ) : (
                    paginatedRequests.map((r: any) => (
                      <tr key={r.requestId} className="hover:bg-slate-50/70">
                        <th
                          scope="row"
                          className="py-3.5 px-4 font-semibold text-slate-800 tabular-nums whitespace-nowrap"
                        >
                          {r.requestId}
                        </th>
                        <td className="py-3.5 px-4 font-medium text-slate-900">
                          {r.eventName}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 tabular-nums whitespace-nowrap">
                          {r.requestDate}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1">
                            {(r.items || []).map((it: any, idx: number) => (
                              <span
                                key={it.requestItemId || it.goodId || idx}
                                className="rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700"
                              >
                                {it.itemName}:{" "}
                                {Number(it.quantity || 0).toLocaleString()}{" "}
                                {it.unitOfMeasure}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <StatusBadge status={r.status} />
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleRequestAgain(r)}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 active:scale-[0.98] px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition"
                            >
                              <RotateCcw
                                className="h-3.5 w-3.5 text-slate-500"
                                aria-hidden="true"
                              />
                              Request Again
                            </button>
                            {r.status === "Pending" && (
                              <button
                                type="button"
                                disabled={cancelling}
                                onClick={() => openCancelConfirm(r)}
                                className="rounded-lg border border-rose-200 bg-white hover:bg-rose-50 active:scale-[0.98] disabled:opacity-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 transition"
                              >
                                Cancel
                              </button>
                            )}
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
              page={historyPage}
              pageSize={PAGE_SIZE}
              onPageChange={setHistoryPage}
            />
          </div>
        )}

        {/* TAB 3: INCOMING DELIVERIES */}
        {activeTab === "deliveries" && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden tab-panel-enter">
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
                      aria-pressed={delStatusFilter === st}
                      onClick={() => setDelStatusFilter(st)}
                      className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition active:scale-[0.98] ${
                        delStatusFilter === st
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
                  className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  aria-label="Search incoming deliveries"
                  placeholder="Search driver, event, or item..."
                  value={delSearchQuery}
                  onChange={(e) => setDelSearchQuery(e.target.value)}
                  className="w-full sm:w-64 rounded-xl border border-slate-300 pl-9 pr-3 py-1.5 text-xs text-slate-900"
                />
              </div>
            </div>

            <div
              tabIndex={0}
              role="region"
              aria-label="Incoming deliveries table"
              className="overflow-x-auto"
            >
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <caption className="sr-only">LGU incoming deliveries</caption>
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                    <th scope="col" className="py-3 px-4">
                      ID
                    </th>
                    <th scope="col" className="py-3 px-4">
                      Request
                    </th>
                    <th scope="col" className="py-3 px-4">
                      Cargo &amp; Event
                    </th>
                    <th scope="col" className="py-3 px-4">
                      Volunteer Driver
                    </th>
                    <th scope="col" className="py-3 px-4">
                      Dispatch Date
                    </th>
                    <th scope="col" className="py-3 px-4">
                      Status
                    </th>
                    <th scope="col" className="py-3 px-4 text-right">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedDeliveries.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-8 text-center text-xs text-slate-400"
                      >
                        No deliveries found.
                      </td>
                    </tr>
                  ) : (
                    paginatedDeliveries.map((del: any) => (
                      <tr key={del.deliveryId} className="hover:bg-slate-50/70">
                        <th
                          scope="row"
                          className="py-3.5 px-4 font-semibold text-slate-800 tabular-nums whitespace-nowrap"
                        >
                          {del.deliveryId}
                        </th>
                        <td className="py-3.5 px-4 font-medium text-slate-700 tabular-nums whitespace-nowrap">
                          {del.requestId}
                        </td>
                        <td className="py-3.5 px-4">
                          {del.eventName && (
                            <div className="font-semibold text-slate-900 text-xs mb-1">
                              {del.eventName}
                            </div>
                          )}
                          <div className="flex flex-wrap gap-1">
                            {(del.items || []).length > 0 ? (
                              del.items.map((it: any, idx: number) => (
                                <span
                                  key={it.requestItemId || it.goodId || idx}
                                  className="rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700"
                                >
                                  {it.itemName}:{" "}
                                  {Number(it.quantity || 0).toLocaleString()}{" "}
                                  {it.unitOfMeasure}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-slate-500">
                                {del.location}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-800 text-xs">
                            {del.volunteerName || "Unassigned"}
                          </div>
                          {del.vehicleType && (
                            <div className="text-[11px] text-slate-500">
                              {del.vehicleType}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 tabular-nums whitespace-nowrap">
                          {del.dispatchDate}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <StatusBadge status={del.deliveryStatus} />
                          <DeliveryStepBar status={del.deliveryStatus} />
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedWaybill(del)}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 active:scale-[0.98] px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition"
                            >
                              <FileText
                                className="h-3.5 w-3.5 text-slate-500"
                                aria-hidden="true"
                              />
                              Waybill
                            </button>
                            {del.deliveryStatus === "In Transit" && (
                              <button
                                type="button"
                                disabled={confirmingReceipt}
                                onClick={() => openReceiptConfirm(del)}
                                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50 px-2.5 py-1.5 text-xs font-semibold text-white transition"
                              >
                                <PackageCheck
                                  className="h-3.5 w-3.5"
                                  aria-hidden="true"
                                />
                                Confirm Receipt
                              </button>
                            )}
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
              page={delPage}
              pageSize={PAGE_SIZE}
              onPageChange={setDelPage}
            />
          </div>
        )}

        {/* TAB 4: NOTIFICATIONS */}
        {activeTab === "notifications" && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden tab-panel-enter">
            <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-pressed={notifFilter === "ALL"}
                  onClick={() => setNotifFilter("ALL")}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                    notifFilter === "ALL"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  All ({notifications.length})
                </button>
                <button
                  type="button"
                  aria-pressed={notifFilter === "UNREAD"}
                  onClick={() => setNotifFilter("UNREAD")}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                    notifFilter === "UNREAD"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Unread ({unreadCount})
                </button>
              </div>

              {unreadCount > 0 && (
                <button
                  type="button"
                  disabled={markingAllRead}
                  onClick={handleMarkAllNotificationsRead}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 active:scale-[0.98] disabled:opacity-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition"
                >
                  <Check
                    className="h-3.5 w-3.5 text-emerald-600"
                    aria-hidden="true"
                  />
                  {markingAllRead ? "Marking..." : "Mark All Read"}
                </button>
              )}
            </div>

            <div className="divide-y divide-slate-100">
              {filteredNotifications.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  {notifFilter === "UNREAD"
                    ? "No unread notifications."
                    : "No notifications found."}
                </div>
              ) : (
                filteredNotifications.map((n: any) => (
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
                      <p className="text-[11px] text-slate-500">
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
                        <Check
                          className="h-3.5 w-3.5 text-emerald-600"
                          aria-hidden="true"
                        />
                        Mark Read
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Native <dialog> Cancel Pending Request Confirmation */}
      <dialog
        ref={cancelDialogRef}
        aria-labelledby="cancel-request-title"
        aria-describedby="cancel-request-desc"
        {...({ closedby: "any" } as any)}
        className="p-0 rounded-2xl border border-slate-200 bg-white shadow-xl max-w-md w-[calc(100%-2rem)] m-auto text-slate-900 no-print"
      >
        <div className="p-6 space-y-4">
          <div className="space-y-1.5">
            <h2
              id="cancel-request-title"
              className="text-base font-bold text-slate-900"
            >
              Cancel Pending Request
            </h2>
            <p id="cancel-request-desc" className="text-xs text-slate-600">
              {cancelTarget
                ? `Are you sure you want to withdraw Request ${cancelTarget.requestId} for ${cancelTarget.eventName}?`
                : "Are you sure you want to cancel this pending relief request?"}
            </p>
          </div>
          <form
            method="dialog"
            onSubmit={(e) =>
              handleAnimatedDialogSubmit(e, cancelDialogRef.current)
            }
            className="flex justify-end gap-2 pt-2"
          >
            <button
              ref={keepRequestBtnRef}
              value="cancel"
              autoFocus
              className="rounded-xl border border-slate-300 bg-white hover:bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700"
            >
              Keep Request
            </button>
            <button
              value="confirm"
              className="rounded-xl bg-rose-600 hover:bg-rose-700 px-4 py-2 text-xs font-semibold text-white"
            >
              Yes, Cancel
            </button>
          </form>
        </div>
      </dialog>

      {/* Native <dialog> Confirm Physical Delivery Receipt */}
      <dialog
        ref={receiptDialogRef}
        aria-labelledby="confirm-receipt-title"
        aria-describedby="confirm-receipt-desc"
        {...({ closedby: "any" } as any)}
        className="p-0 rounded-2xl border border-slate-200 bg-white shadow-xl max-w-md w-[calc(100%-2rem)] m-auto text-slate-900 no-print"
      >
        <div className="p-6 space-y-4">
          <div className="space-y-1.5">
            <h2
              id="confirm-receipt-title"
              className="text-base font-bold text-slate-900"
            >
              Confirm Delivery Receipt
            </h2>
            <p id="confirm-receipt-desc" className="text-xs text-slate-600">
              {receiptTarget
                ? `Confirm that Delivery ${receiptTarget.deliveryId} (Request ${receiptTarget.requestId}) from ${receiptTarget.volunteerName || "the volunteer driver"} has arrived at ${receiptTarget.location}? This marks the shipment Delivered and fulfills your request.`
                : "Confirm that this shipment has arrived cleanly at your evacuation site."}
            </p>
          </div>
          <form
            method="dialog"
            onSubmit={(e) =>
              handleAnimatedDialogSubmit(e, receiptDialogRef.current)
            }
            className="flex justify-end gap-2 pt-2"
          >
            <button
              ref={keepReceiptBtnRef}
              value="cancel"
              autoFocus
              className="rounded-xl border border-slate-300 bg-white hover:bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700"
            >
              Not Yet
            </button>
            <button
              value="confirm"
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-semibold text-white"
            >
              Confirm Received
            </button>
          </form>
        </div>
      </dialog>

      {/* Cargo Waybill Modal (Outside .no-print so printing prints only the waybill) */}
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
