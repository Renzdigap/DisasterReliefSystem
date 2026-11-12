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
  HeartHandshake,
  PackagePlus,
  History,
  AlertTriangle,
  Bell,
  Search,
  Plus,
  Trash2,
  CheckCircle2,
  MapPin,
  Boxes,
  Check,
  Award,
  Clock,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Calendar,
  X,
} from "lucide-react";
import { PortalSidebarLayout, SidebarNavItem } from "@/components/PortalHeader";
import { PortalShellSkeleton, StatusBadge } from "@/components/SkeletonUI";
import {
  DonationCertificateModal,
  getDisasterAlertInfo,
} from "@/components/DisasterEnhancements";
import {
  AnimatedNumber,
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

interface LineItemDraft {
  rowKey: string;
  goodId: number;
  quantity: number;
}

type DonorTab = "pledge" | "history" | "needs" | "notifications";

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

export default function DonorPortalPage() {
  const router = useRouter();
  const [session, setSession] = useState<UserSession | null>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<DonorTab>("pledge");

  const [banner, setBanner] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const bannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // New donation draft state
  const rowSeqRef = useRef(2);
  const [selectedEventId, setSelectedEventId] = useState<number>(0);
  const [draftItems, setDraftItems] = useState<LineItemDraft[]>([
    { rowKey: "row-1", goodId: 1, quantity: 50 },
  ]);
  const [touchedQtyRows, setTouchedQtyRows] = useState<Record<string, boolean>>(
    {}
  );
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [recentlyAddedGoodId, setRecentlyAddedGoodId] = useState<number | null>(
    null
  );
  const hasInitDraftRef = useRef(false);

  // Interactive Warehouse needs panel filter
  const [needsFilter, setNeedsFilter] = useState<"ALL" | "NEEDED">("NEEDED");
  const [needsSearch, setNeedsSearch] = useState("");

  // History filters & pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [historyPage, setHistoryPage] = useState(1);

  // Disasters tab filters
  const [disasterFilter, setDisasterFilter] = useState<
    "Active" | "ALL" | "Resolved"
  >("Active");
  const [disasterSearch, setDisasterSearch] = useState("");

  // Notifications tab filter & busy state
  const [notifFilter, setNotifFilter] = useState<"ALL" | "UNREAD">("ALL");
  const [markingAllRead, setMarkingAllRead] = useState(false);

  // Receipt modal & cancel pledge confirmation dialog
  const [selectedCertificateDonation, setSelectedCertificateDonation] =
    useState<any>(null);
  const [cancelTarget, setCancelTarget] = useState<any>(null);
  const [cancelling, setCancelling] = useState(false);
  const pendingCancelRef = useRef<any>(null);
  const cancelDialogRef = useRef<HTMLDialogElement | null>(null);
  const keepBtnRef = useRef<HTMLButtonElement | null>(null);
  const kpiGridRef = useRef<HTMLDivElement | null>(null);
  const disastersGridRef = useRef<HTMLDivElement | null>(null);

  useSiblingStagger(kpiGridRef, !loading);
  useSiblingStagger(
    disastersGridRef,
    `${activeTab}-${disasterFilter}-${loading}`
  );

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

  const syncDraftDefaults = useCallback((payload: any) => {
    const catalog: any[] = payload?.goods || [];
    if (catalog.length === 0) return;

    const validIds = new Set(catalog.map((g) => g.goodId));
    if (!hasInitDraftRef.current) {
      hasInitDraftRef.current = true;
      setDraftItems([
        { rowKey: "row-1", goodId: catalog[0].goodId, quantity: 50 },
      ]);
      return;
    }

    setDraftItems((prev) =>
      prev.map((line) =>
        validIds.has(line.goodId) ? line : { ...line, goodId: catalog[0].goodId }
      )
    );
  }, []);

  const loadDonorPortal = useCallback(
    async (userId: number, isBackground = false) => {
      const cacheKey = `donor_portal_${userId}`;
      if (!isBackground) {
        const cached = getCachedData<any>(cacheKey);
        if (cached) {
          setData(cached);
          syncDraftDefaults(cached);
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
        syncDraftDefaults(fresh);
      } catch (err: any) {
        showBanner(err.message || "Failed to load donor data.", "error");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [showBanner, syncDraftDefaults]
  );

  useEffect(() => {
    const saved = getSavedSession();
    if (!saved || !saved.user) {
      router.replace("/");
      return;
    }
    const role = (saved.user.role || "").toLowerCase();
    if (role !== "donor") {
      router.replace(getPortalRouteForRole(role));
      return;
    }
    setSession(saved);
    loadDonorPortal(saved.user.userId);
  }, [router, loadDonorPortal]);

  useEffect(() => {
    setHistoryPage(1);
  }, [searchQuery, statusFilter, activeTab]);

  const executeCancelDonation = useCallback(
    async (donation: any) => {
      if (!session?.user || !donation?.donationId) return;
      setCancelling(true);
      try {
        await apiFetch(
          `/api/donations?id=${donation.donationId}&userId=${session.user.userId}&onlyPending=true`,
          { method: "DELETE" }
        );
        showBanner(
          `Pending Donation ${donation.donationId} has been cancelled.`,
          "success"
        );
        await loadDonorPortal(session.user.userId, true);
      } catch (err: any) {
        showBanner(err.message || "Failed to cancel donation.", "error");
      } finally {
        setCancelling(false);
      }
    },
    [loadDonorPortal, session, showBanner]
  );

  // Hook native <dialog> close, cancel, and light-dismiss fallback reliably
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
        void executeCancelDonation(target);
      }
    };

    const handleNativeCancel = (e: Event) => {
      e.preventDefault();
      void closeTopLayer(dialog, "cancel");
    };

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

    dialog.addEventListener("close", handleNativeClose);
    dialog.addEventListener("cancel", handleNativeCancel);
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
  }, [executeCancelDonation, loading]);

  const openCancelConfirm = (donation: any) => {
    pendingCancelRef.current = donation;
    setCancelTarget(donation);
    const dialog = cancelDialogRef.current;
    if (dialog) {
      dialog.returnValue = "";
      if (!dialog.open) {
        dialog.showModal();
      }
      keepBtnRef.current?.focus();
    }
  };

  const donations: any[] = data?.donations || [];
  const events: any[] = data?.events || [];
  const goods: any[] = data?.goods || [];
  const inventory: any[] = data?.inventory || [];
  const notifications: any[] = data?.notifications || [];

  const activeEvents = useMemo(
    () => events.filter((e) => (e.status || "").toLowerCase() === "active"),
    [events]
  );

  // Ensure selectedEventId remains active or falls back to 0 (General Relief Fund)
  useEffect(() => {
    if (
      selectedEventId > 0 &&
      events.length > 0 &&
      !activeEvents.some((e) => e.eventId === selectedEventId)
    ) {
      setSelectedEventId(0);
    }
  }, [activeEvents, events.length, selectedEventId]);

  const inventoryByGoodId = useMemo(() => {
    const map = new Map<number, any>();
    for (const inv of inventory) {
      map.set(inv.goodId, inv);
    }
    return map;
  }, [inventory]);

  const prioritizedInventory = useMemo(() => {
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

    return [...base].sort(
      (a, b) => Number(a.currentStock || 0) - Number(b.currentStock || 0)
    );
  }, [goods, inventory]);

  const filteredNeededSupplies = useMemo(() => {
    const q = needsSearch.trim().toLowerCase();
    return prioritizedInventory.filter((item) => {
      const stock = Number(item.currentStock || 0);
      const matchesNeed = needsFilter === "ALL" || stock <= 1000;
      const matchesSearch =
        !q ||
        (item.itemName || "").toLowerCase().includes(q) ||
        (item.category || "").toLowerCase().includes(q);
      return matchesNeed && matchesSearch;
    });
  }, [prioritizedInventory, needsFilter, needsSearch]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  const pendingDonationsCount = useMemo(
    () => donations.filter((d) => d.status === "Pending").length,
    [donations]
  );

  const approvedDonationsCount = useMemo(
    () => donations.filter((d) => d.status === "Approved").length,
    [donations]
  );

  const totalItemsDonated = useMemo(() => {
    return donations.reduce((sum, d) => {
      const sub = (d.items || []).reduce(
        (acc: number, it: any) => acc + Number(it.quantity || 0),
        0
      );
      return sum + sub;
    }, 0);
  }, [donations]);

  const filteredDonations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return donations.filter((d) => {
      const matchesStatus =
        statusFilter === "ALL" || d.status === statusFilter;
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

  const paginatedDonations = useMemo(() => {
    const totalPages = Math.max(
      1,
      Math.ceil(filteredDonations.length / PAGE_SIZE)
    );
    const safePage = Math.min(Math.max(1, historyPage), totalPages);
    return filteredDonations.slice(
      (safePage - 1) * PAGE_SIZE,
      safePage * PAGE_SIZE
    );
  }, [filteredDonations, historyPage]);

  const filteredDisasters = useMemo(() => {
    const q = disasterSearch.trim().toLowerCase();
    return events.filter((ev) => {
      const matchesStatus =
        disasterFilter === "ALL" || ev.status === disasterFilter;
      const matchesSearch =
        !q ||
        (ev.eventName || "").toLowerCase().includes(q) ||
        (ev.location || "").toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [events, disasterFilter, disasterSearch]);

  const filteredNotifications = useMemo(() => {
    if (notifFilter === "UNREAD") {
      return notifications.filter((n) => !n.isRead);
    }
    return notifications;
  }, [notifications, notifFilter]);

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
      if (line.goodId > 0 && Number.isInteger(line.quantity) && line.quantity > 0) {
        valid.set(line.goodId, (valid.get(line.goodId) || 0) + line.quantity);
      }
    }
    const totalUnits = Array.from(valid.values()).reduce((a, b) => a + b, 0);
    return { itemTypes: valid.size, totalUnits };
  }, [draftItems]);

  const selectedEvent = useMemo(
    () => activeEvents.find((ev) => ev.eventId === selectedEventId) || null,
    [activeEvents, selectedEventId]
  );

  // Interactive draft actions
  const addDraftLine = () => {
    const usedIds = new Set(draftItems.map((l) => l.goodId));
    const nextPriority =
      prioritizedInventory.find((inv) => !usedIds.has(inv.goodId)) ||
      goods.find((g) => !usedIds.has(g.goodId)) ||
      goods[0];

    const defaultGoodId = nextPriority?.goodId || 1;
    setDraftItems((prev) => [
      ...prev,
      { rowKey: nextRowKey(), goodId: defaultGoodId, quantity: 25 },
    ]);
  };

  const quickAddSupply = (goodId: number, amount = 25, targetEventId?: number) => {
    if (targetEventId !== undefined) {
      setSelectedEventId(targetEventId);
    }
    setActiveTab("pledge");
    setSubmitAttempted(false);

    setDraftItems((prev) => {
      const existingIdx = prev.findIndex((line) => line.goodId === goodId);
      if (existingIdx >= 0) {
        return prev.map((line, idx) =>
          idx === existingIdx
            ? {
                ...line,
                quantity: Math.min(1000000, Math.max(0, line.quantity) + amount),
              }
            : line
        );
      }
      return [
        ...prev,
        { rowKey: nextRowKey(), goodId, quantity: amount },
      ];
    });

    setRecentlyAddedGoodId(goodId);
    setTimeout(() => {
      setRecentlyAddedGoodId((curr) => (curr === goodId ? null : curr));
    }, 1500);
  };

  const combineDuplicateDraftLines = () => {
    const merged = new Map<number, { rowKey: string; quantity: number }>();
    for (const line of draftItems) {
      const qty = Number.isInteger(line.quantity) && line.quantity > 0 ? line.quantity : 0;
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
        quantity: info.quantity > 0 ? info.quantity : 25,
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
    setSelectedEventId(0);
    setDraftItems([
      { rowKey: nextRowKey(), goodId: goods[0]?.goodId || 1, quantity: 50 },
    ]);
    setTouchedQtyRows({});
    setSubmitAttempted(false);
    setBanner(null);
  };

  const handleDonateAgain = (don: any) => {
    const targetActive =
      don.eventId && activeEvents.some((ev) => ev.eventId === don.eventId)
        ? don.eventId
        : 0;

    setSelectedEventId(targetActive);
    setSubmitAttempted(false);
    setTouchedQtyRows({});

    const items: any[] = don.items || [];
    const validCatalogIds = new Set(goods.map((g) => g.goodId));
    const clonedLines: LineItemDraft[] = items
      .filter((it) => validCatalogIds.has(it.goodId) && Number(it.quantity) > 0)
      .map((it) => ({
        rowKey: nextRowKey(),
        goodId: it.goodId,
        quantity: Number(it.quantity),
      }));

    if (clonedLines.length > 0) {
      setDraftItems(clonedLines);
    } else {
      setDraftItems([
        { rowKey: nextRowKey(), goodId: goods[0]?.goodId || 1, quantity: 50 },
      ]);
    }

    setActiveTab("pledge");
    if (don.eventId && targetActive === 0) {
      showBanner(
        `Items from Donation ${don.donationId} loaded. "${don.eventName}" is already resolved, so target defaulted to General Relief Fund.`,
        "success"
      );
    } else {
      showBanner(
        `Items from Donation ${don.donationId} loaded into your pledge builder.`,
        "success"
      );
    }
  };

  const handlePledgeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user) return;
    setSubmitAttempted(true);

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
      const invalidEl = document.getElementById(`qty-${invalidLine.rowKey}`);
      invalidEl?.focus();
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
      showBanner("Please enter at least one valid relief item.", "error");
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
      showBanner(
        `Donation ${res.donationId} submitted and awaiting verification.`,
        "success"
      );
      setDraftItems([
        { rowKey: nextRowKey(), goodId: goods[0]?.goodId || 1, quantity: 50 },
      ]);
      setSelectedEventId(0);
      setTouchedQtyRows({});
      setSubmitAttempted(false);
      await loadDonorPortal(session.user.userId, true);
      setStatusFilter("ALL");
      setActiveTab("history");
    } catch (err: any) {
      showBanner(err.message || "Failed to submit donation.", "error");
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
        // Fallback if upstream Java server runs older endpoint requiring single notificationId
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
      await loadDonorPortal(session.user.userId, true);
      showBanner("All notifications marked as read.", "success");
    } catch (err: any) {
      showBanner(err.message || "Failed to mark all read.", "error");
    } finally {
      setMarkingAllRead(false);
    }
  };

  if (loading && !data) {
    return <PortalShellSkeleton title="Loading Donor Portal" />;
  }

  const donorType =
    data?.donor?.donorType || session?.donorType || "Individual";

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
      badge: activeEvents.length,
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
      portalSubtitle={`${session?.user?.fullName || "Donor"} · ${donorType} Donor`}
      roleBadge="Donor"
      navItems={navItems}
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      unreadCount={unreadCount}
      onOpenNotifications={() => setActiveTab("notifications")}
      notificationsList={notifications}
      onMarkNotificationRead={handleMarkNotificationRead}
      onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
      onSync={() => session?.user && loadDonorPortal(session.user.userId, true)}
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

        {/* Interactive KPI Strip */}
        <div
          ref={kpiGridRef}
          className="stagger-grid grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
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
                Total Pledges
              </span>
              <span className="rounded bg-blue-50 text-[#0038A8] border border-blue-200 px-1.5 py-0.5 text-[9px] font-mono font-bold">
                CIVIC AID
              </span>
            </div>
            <p className="mt-1.5 text-2xl font-black text-slate-900 tracking-tight tabular-nums group-hover:text-[#0038A8] transition-colors">
              <AnimatedNumber value={donations.length} />
            </p>
            <div className="text-[10px] text-slate-500 font-medium mt-1 truncate">
              Recorded in Batac System
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
                Pending Verification
              </span>
              <span className="rounded bg-amber-50 text-[#D97706] border border-amber-200 px-1.5 py-0.5 text-[9px] font-mono font-bold">
                AUDIT
              </span>
            </div>
            <p className="mt-1.5 text-2xl font-black text-slate-900 tracking-tight tabular-nums group-hover:text-[#D97706] transition-colors">
              <AnimatedNumber value={pendingDonationsCount} />
            </p>
            <div className="text-[10px] text-slate-500 font-medium mt-1 truncate">
              Awaiting CDRRMO Verification
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
                Relief Units Donated
              </span>
              <span className="rounded bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 text-[9px] font-mono font-bold">
                CREDITED
              </span>
            </div>
            <p className="mt-1.5 text-2xl font-black text-slate-900 tracking-tight tabular-nums group-hover:text-emerald-600 transition-colors">
              <AnimatedNumber value={totalItemsDonated} />
            </p>
            <div className="text-[10px] text-slate-500 font-medium mt-1 truncate">
              Dispatched to Evacuation Centers
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setDisasterFilter("Active");
              setActiveTab("needs");
            }}
            className="text-left rounded-lg border border-slate-200 bg-white hover:border-slate-400 p-3.5 shadow-xs transition-colors border-t-4 border-t-[#CE1126] group"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Monitored Calamities
              </span>
              <span className="rounded bg-rose-50 text-[#CE1126] border border-rose-200 px-1.5 py-0.5 text-[9px] font-mono font-bold">
                ACTIVE
              </span>
            </div>
            <p className="mt-1.5 text-2xl font-black text-slate-900 tracking-tight tabular-nums group-hover:text-[#CE1126] transition-colors">
              <AnimatedNumber value={activeEvents.length} />
            </p>
            <div className="text-[10px] text-slate-500 font-medium mt-1 truncate">
              Quiaoit River &amp; Batac Zones
            </div>
          </button>
        </div>

        {/* TAB 1: NEW DONATION BUILDER + INTERACTIVE WAREHOUSE NEEDS */}
        {activeTab === "pledge" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 tab-panel-enter">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 isolated-panel">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h2 className="text-base font-bold text-slate-900">
                  Submit a Donation
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
                onSubmit={handlePledgeSubmit}
                noValidate
                aria-label="Submit relief donation pledge"
                className="space-y-5"
              >
                <div className="space-y-2">
                  <label
                    htmlFor="donor-event-select"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Disaster Event
                  </label>
                  <select
                    id="donor-event-select"
                    name="eventId"
                    value={selectedEventId}
                    onChange={(e) => setSelectedEventId(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-600"
                  >
                    <option value={0}>General Relief Fund</option>
                    {activeEvents.map((ev: any) => (
                      <option key={ev.eventId} value={ev.eventId}>
                        {ev.eventName} ({ev.location})
                      </option>
                    ))}
                  </select>

                  {selectedEvent && (
                    <div className="rounded-xl border border-blue-200/80 bg-blue-50/50 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex flex-wrap items-center gap-3 text-slate-700">
                        <span className="inline-flex items-center gap-1 font-semibold text-slate-900">
                          <MapPin
                            className="h-3.5 w-3.5 text-rose-500"
                            aria-hidden="true"
                          />
                          {selectedEvent.location}
                        </span>
                        {selectedEvent.startDate && (
                          <span className="inline-flex items-center gap-1 text-slate-600 tabular-nums">
                            <Calendar
                              className="h-3.5 w-3.5 text-slate-400"
                              aria-hidden="true"
                            />
                            Started {selectedEvent.startDate}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedEventId(0)}
                        className="text-xs font-semibold text-blue-700 hover:underline"
                      >
                        Switch to General Fund
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-700">
                      Relief Items
                    </span>
                    <button
                      type="button"
                      onClick={addDraftLine}
                      className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 active:scale-[0.98] px-3 py-1.5 text-xs font-semibold text-slate-700 transition"
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      Add Item
                    </button>
                  </div>

                  {hasDuplicateGoods && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-3.5 py-2 flex items-center justify-between gap-2 text-xs text-amber-900">
                      <span>
                        Same item selected on multiple rows. Quantities will be
                        combined on submit.
                      </span>
                      <button
                        type="button"
                        onClick={combineDuplicateDraftLines}
                        className="font-bold text-amber-800 hover:underline shrink-0"
                      >
                        Combine now
                      </button>
                    </div>
                  )}

                  <div className="space-y-3">
                    {draftItems.map((line, index) => {
                      const selectedGood = goods.find(
                        (g: any) => g.goodId === line.goodId
                      );
                      const invMatch = inventoryByGoodId.get(line.goodId);
                      const stockHealth = invMatch
                        ? getStockHealthStatus(Number(invMatch.currentStock || 0))
                        : null;
                      const isQtyInvalid =
                        !Number.isInteger(line.quantity) ||
                        line.quantity < 1 ||
                        line.quantity > 1000000;
                      const showQtyError =
                        (submitAttempted || touchedQtyRows[line.rowKey]) &&
                        isQtyInvalid;
                      const qtyErrorId = `qty-error-${line.rowKey}`;

                      return (
                        <div
                          key={line.rowKey}
                          className={`rounded-xl border p-3.5 space-y-2.5 transition ${
                            recentlyAddedGoodId === line.goodId
                              ? "border-blue-400 bg-blue-50/40"
                              : "border-slate-200/80 bg-slate-50/70"
                          }`}
                        >
                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
                            <div className="sm:col-span-6 space-y-1">
                              <label
                                htmlFor={`good-${line.rowKey}`}
                                className="block text-[11px] font-semibold text-slate-500"
                              >
                                Item {index + 1}
                              </label>
                              <select
                                id={`good-${line.rowKey}`}
                                name={`item_${index}_goodId`}
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

                            <div className="sm:col-span-5 space-y-1">
                              <label
                                htmlFor={`qty-${line.rowKey}`}
                                className="block text-[11px] font-semibold text-slate-500"
                              >
                                Quantity ({selectedGood?.unitOfMeasure || "Units"})
                              </label>
                              <div className="relative">
                                <input
                                  id={`qty-${line.rowKey}`}
                                  name={`item_${index}_quantity`}
                                  type="number"
                                  inputMode="numeric"
                                  min={1}
                                  max={1000000}
                                  step={1}
                                  value={line.quantity > 0 ? line.quantity : ""}
                                  aria-invalid={showQtyError ? "true" : "false"}
                                  aria-describedby={
                                    showQtyError ? qtyErrorId : undefined
                                  }
                                  onBlur={() =>
                                    setTouchedQtyRows((prev) => ({
                                      ...prev,
                                      [line.rowKey]: true,
                                    }))
                                  }
                                  onChange={(e) =>
                                    updateDraftLine(
                                      line.rowKey,
                                      "quantity",
                                      Number(e.target.value)
                                    )
                                  }
                                  className={`w-full rounded-xl border bg-white px-3 py-2 pr-16 text-sm font-semibold text-slate-900 tabular-nums ${
                                    showQtyError
                                      ? "border-rose-500 bg-rose-50/40"
                                      : "border-slate-300"
                                  }`}
                                  required
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
                                  {selectedGood?.unitOfMeasure || "Units"}
                                </span>
                              </div>
                              {showQtyError && (
                                <p
                                  id={qtyErrorId}
                                  className="text-[11px] font-medium text-rose-700"
                                >
                                  Enter a whole number from 1 to 1,000,000.
                                </p>
                              )}
                            </div>

                            <div className="sm:col-span-1 flex justify-end sm:pt-5">
                              <button
                                type="button"
                                aria-label={`Remove item ${index + 1}`}
                                onClick={() => removeDraftLine(line.rowKey)}
                                disabled={draftItems.length <= 1}
                                className="rounded-lg border border-transparent hover:border-rose-200 hover:bg-rose-50 p-2 text-slate-400 hover:text-rose-600 active:scale-95 disabled:opacity-30 transition"
                              >
                                <Trash2
                                  className="h-4 w-4"
                                  aria-hidden="true"
                                />
                              </button>
                            </div>
                          </div>

                          {/* Row interactive footer: stock context + quick increment chips */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                            <div className="flex items-center gap-2 text-xs">
                              {invMatch && stockHealth && (
                                <>
                                  <StatusBadge status={stockHealth} />
                                  <span className="text-slate-500 tabular-nums">
                                    Warehouse:{" "}
                                    <strong className="text-slate-700">
                                      {Number(
                                        invMatch.currentStock || 0
                                      ).toLocaleString()}
                                    </strong>{" "}
                                    {invMatch.unitOfMeasure}
                                  </span>
                                </>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5">
                              {[10, 50, 100].map((inc) => (
                                <button
                                  key={inc}
                                  type="button"
                                  onClick={() =>
                                    bumpDraftQuantity(line.rowKey, inc)
                                  }
                                  className="rounded-lg border border-slate-200 bg-white hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 active:scale-95 px-2 py-0.5 text-[11px] font-semibold text-slate-600 transition tabular-nums"
                                >
                                  +{inc}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Live Pledge Summary & Submit */}
                <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-xs text-slate-600">
                    <span className="font-semibold text-slate-900 tabular-nums">
                      {draftSummary.itemTypes}
                    </span>{" "}
                    {draftSummary.itemTypes === 1 ? "item type" : "item types"} ·{" "}
                    <span className="font-semibold text-slate-900 tabular-nums">
                      {draftSummary.totalUnits.toLocaleString()}
                    </span>{" "}
                    total units
                    <span className="text-slate-400 mx-1.5">&middot;</span>
                    <span className="font-medium text-slate-700">
                      {selectedEvent
                        ? selectedEvent.eventName
                        : "General Relief Fund"}
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition disabled:opacity-50"
                  >
                    {submitting ? "Submitting..." : "Submit Donation"}
                  </button>
                </div>
              </form>
            </div>

            {/* Right Column: Interactive Most Needed Warehouse Supplies */}
            <aside className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 flex flex-col gap-3 isolated-panel">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  Warehouse Needs
                </h3>
                <div className="flex items-center gap-1">
                  {(["NEEDED", "ALL"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      aria-pressed={needsFilter === mode}
                      onClick={() => setNeedsFilter(mode)}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition active:scale-95 ${
                        needsFilter === mode
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {mode === "NEEDED" ? "Most Needed" : "All"}
                    </button>
                  ))}
                </div>
              </div>

              <search>
                <div className="relative">
                  <Search
                    className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    aria-label="Filter warehouse supplies"
                    value={needsSearch}
                    onChange={(e) => setNeedsSearch(e.target.value)}
                    placeholder="Filter supplies..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white pl-8 pr-3 py-1.5 text-xs text-slate-900"
                  />
                </div>
              </search>

              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {filteredNeededSupplies.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No matching supplies found.
                  </div>
                ) : (
                  filteredNeededSupplies.map((item: any) => {
                    const stock = Number(item.currentStock || 0);
                    const health = getStockHealthStatus(stock);
                    const inDraftQty = draftItems
                      .filter((l) => l.goodId === item.goodId)
                      .reduce((s, l) => s + Number(l.quantity || 0), 0);
                    const justAdded = recentlyAddedGoodId === item.goodId;

                    return (
                      <button
                        key={item.inventoryId || item.goodId}
                        type="button"
                        onClick={() => quickAddSupply(item.goodId, 25)}
                        className={`w-full text-left rounded-xl border p-3 flex items-center justify-between gap-2 transition active:scale-[0.98] ${
                          justAdded
                            ? "border-blue-400 bg-blue-50/70"
                            : "border-slate-200/70 bg-slate-50/50 hover:bg-white hover:border-blue-300 hover:shadow-xs"
                        }`}
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="text-xs font-semibold text-slate-900 truncate">
                            {item.itemName}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <StatusBadge status={health} />
                            <span className="text-[11px] text-slate-500 tabular-nums">
                              {stock.toLocaleString()} {item.unitOfMeasure}
                            </span>
                          </div>
                          <StockLevelBar stock={stock} className="mt-1.5" />
                        </div>

                        <div className="shrink-0 text-right">
                          <span
                            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                              justAdded
                                ? "bg-emerald-600 text-white"
                                : inDraftQty > 0
                                ? "bg-blue-100 text-blue-700"
                                : "bg-blue-600 text-white"
                            }`}
                          >
                            {justAdded ? (
                              <>
                                <Check className="h-3 w-3" aria-hidden="true" />
                                Added
                              </>
                            ) : (
                              <>
                                <Plus className="h-3 w-3" aria-hidden="true" />
                                Add 25
                              </>
                            )}
                          </span>
                          {inDraftQty > 0 && !justAdded && (
                            <span className="block text-[10px] font-medium text-blue-700 mt-0.5 tabular-nums">
                              In draft: {inDraftQty.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </aside>
          </div>
        )}

        {/* TAB 2: MY DONATIONS HISTORY */}
        {activeTab === "history" && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden tab-panel-enter">
            <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { key: "ALL", label: `All (${donations.length})` },
                  {
                    key: "Pending",
                    label: `Pending (${pendingDonationsCount})`,
                  },
                  {
                    key: "Approved",
                    label: `Approved (${approvedDonationsCount})`,
                  },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    aria-pressed={statusFilter === opt.key}
                    onClick={() => setStatusFilter(opt.key)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition active:scale-[0.98] ${
                      statusFilter === opt.key
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <search>
                <div className="relative">
                  <Search
                    className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    aria-label="Search my donations by ID, event, or item"
                    placeholder="Search donations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="rounded-xl border border-slate-300 pl-8 pr-3 py-1.5 text-xs text-slate-900 w-full sm:w-64"
                  />
                </div>
              </search>
            </div>

            <div
              tabIndex={0}
              role="region"
              aria-label="My donations history table"
              className="overflow-x-auto"
            >
              <table className="w-full text-left text-xs sm:text-sm">
                <caption className="sr-only">
                  Donor donation pledges and approval statuses
                </caption>
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                  <tr>
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
                      Donated Items
                    </th>
                    <th scope="col" className="py-3 px-4">
                      Status
                    </th>
                    <th scope="col" className="py-3 px-4 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDonations.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-8 text-center text-xs text-slate-400"
                      >
                        No donations found matching your filter.
                      </td>
                    </tr>
                  ) : (
                    paginatedDonations.map((don: any) => (
                      <tr key={don.donationId} className="hover:bg-slate-50/70">
                        <th
                          scope="row"
                          className="py-3.5 px-4 font-semibold text-slate-700 tabular-nums whitespace-nowrap"
                        >
                          {don.donationId}
                        </th>
                        <td className="py-3.5 px-4 font-semibold text-slate-900">
                          {don.eventName || "General Relief Fund"}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 tabular-nums whitespace-nowrap">
                          {don.donationDate}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-700">
                          {(don.items || []).length === 0 ? (
                            <span className="text-slate-400">—</span>
                          ) : (
                            <ul className="space-y-1">
                              {(don.items || []).map(
                                (it: any, idx: number) => (
                                  <li
                                    key={it.itemId || idx}
                                    className="leading-snug"
                                  >
                                    <span className="font-semibold text-emerald-700 tabular-nums">
                                      +{Number(it.quantity).toLocaleString()}{" "}
                                      {it.unitOfMeasure}
                                    </span>
                                    <span className="text-slate-400 mx-1.5">
                                      &middot;
                                    </span>
                                    <span className="text-slate-700">
                                      {it.itemName}
                                    </span>
                                  </li>
                                )
                              )}
                            </ul>
                          )}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <StatusBadge status={don.status} />
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedCertificateDonation(don)
                              }
                              className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50/80 hover:bg-blue-100 active:scale-[0.98] px-2.5 py-1 text-xs font-semibold text-blue-700 transition"
                            >
                              <Award
                                className="h-3.5 w-3.5 text-blue-600"
                                aria-hidden="true"
                              />
                              <span>Receipt</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDonateAgain(don)}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 active:scale-[0.98] px-2.5 py-1 text-xs font-semibold text-slate-700 transition"
                            >
                              <RotateCcw
                                className="h-3 w-3 text-slate-500"
                                aria-hidden="true"
                              />
                              <span>Donate Again</span>
                            </button>

                            {don.status === "Pending" && (
                              <button
                                type="button"
                                disabled={cancelling}
                                onClick={() => openCancelConfirm(don)}
                                className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white hover:bg-rose-50 active:scale-[0.98] disabled:opacity-50 px-2.5 py-1 text-xs font-semibold text-rose-600 transition"
                              >
                                <Trash2
                                  className="h-3 w-3"
                                  aria-hidden="true"
                                />
                                <span>Cancel</span>
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
              totalItems={filteredDonations.length}
              page={historyPage}
              pageSize={PAGE_SIZE}
              onPageChange={setHistoryPage}
            />
          </div>
        )}

        {/* TAB 3: ACTIVE DISASTERS */}
        {activeTab === "needs" && (
          <div className="space-y-4 tab-panel-enter">
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { key: "Active", label: `Active (${activeEvents.length})` },
                  { key: "ALL", label: `All (${events.length})` },
                  {
                    key: "Resolved",
                    label: `Resolved (${events.length - activeEvents.length})`,
                  },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    aria-pressed={disasterFilter === opt.key}
                    onClick={() =>
                      setDisasterFilter(
                        opt.key as "Active" | "ALL" | "Resolved"
                      )
                    }
                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition active:scale-[0.98] ${
                      disasterFilter === opt.key
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <search>
                <div className="relative">
                  <Search
                    className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    aria-label="Search disaster events or locations"
                    placeholder="Search events or locations..."
                    value={disasterSearch}
                    onChange={(e) => setDisasterSearch(e.target.value)}
                    className="rounded-xl border border-slate-300 pl-8 pr-3 py-1.5 text-xs text-slate-900 w-full sm:w-64"
                  />
                </div>
              </search>
            </div>

            {filteredDisasters.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-10 text-center text-xs text-slate-400">
                No disaster events match your selected filter.
              </div>
            ) : (
              <div
                ref={disastersGridRef}
                className="stagger-grid grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                {filteredDisasters.map((ev: any) => {
                  const isActive =
                    (ev.status || "").toLowerCase() === "active";
                  const myCountForEvent = donations.filter(
                    (d) => d.eventId === ev.eventId
                  ).length;
                  const topNeeds = prioritizedInventory.slice(0, 3);
                  const alertInfo = getDisasterAlertInfo(ev.eventName);

                  return (
                    <div
                      key={ev.eventId}
                      className="interactive-lift bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between gap-4 hover:border-slate-300 hover:shadow-sm"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                            {ev.eventName}
                          </h3>
                          <StatusBadge status={ev.status} />
                        </div>

                        <div
                          aria-hidden="true"
                          className="h-1 w-full rounded-full bg-slate-100 overflow-hidden"
                        >
                          <div
                            style={{
                              width: `${isActive ? alertInfo.progressPct : 100}%`,
                            }}
                            className={`h-full rounded-full transition-[width] duration-300 ${
                              isActive ? alertInfo.dotColor : "bg-slate-300"
                            }`}
                          />
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                          <span className="inline-flex items-center gap-1.5">
                            <MapPin
                              className="h-3.5 w-3.5 text-rose-500 shrink-0"
                              aria-hidden="true"
                            />
                            {ev.location}
                          </span>
                          <span className="inline-flex items-center gap-1.5 tabular-nums text-slate-500">
                            <Calendar
                              className="h-3.5 w-3.5 text-slate-400 shrink-0"
                              aria-hidden="true"
                            />
                            {ev.startDate}
                          </span>
                        </div>

                        {isActive && topNeeds.length > 0 && (
                          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 space-y-2">
                            <div className="text-[11px] font-semibold text-slate-600">
                              Quick-pledge low-stock warehouse supplies:
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {topNeeds.map((item: any) => (
                                <button
                                  key={item.goodId}
                                  type="button"
                                  onClick={() =>
                                    quickAddSupply(
                                      item.goodId,
                                      25,
                                      ev.eventId
                                    )
                                  }
                                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50 active:scale-95 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:text-blue-700 transition"
                                >
                                  <Plus
                                    className="h-3 w-3 text-blue-600"
                                    aria-hidden="true"
                                  />
                                  <span>{item.itemName}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                        <span className="text-xs text-slate-500 tabular-nums">
                          {myCountForEvent > 0
                            ? `Your donations: ${myCountForEvent}`
                            : isActive
                            ? "Accepting relief pledges"
                            : "Operation closed"}
                        </span>
                        {isActive ? (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedEventId(ev.eventId);
                              setActiveTab("pledge");
                            }}
                            className="rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] px-4 py-1.5 text-xs font-semibold text-white shadow-xs transition"
                          >
                            Donate to Event
                          </button>
                        ) : (
                          <span className="text-xs font-semibold text-slate-400">
                            Resolved
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: NOTIFICATIONS */}
        {activeTab === "notifications" && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden tab-panel-enter">
            <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  Notifications
                </h2>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-rose-50 border border-rose-200 px-2.5 py-0.5 text-xs font-bold text-rose-700">
                    {unreadCount} unread
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {(["ALL", "UNREAD"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    aria-pressed={notifFilter === mode}
                    onClick={() => setNotifFilter(mode)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition active:scale-[0.98] ${
                      notifFilter === mode
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {mode === "ALL" ? "All" : "Unread"}
                  </button>
                ))}
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
                    <span>
                      {markingAllRead ? "Updating..." : "Mark All Read"}
                    </span>
                  </button>
                )}
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {filteredNotifications.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  {notifFilter === "UNREAD"
                    ? "You have read all notifications."
                    : "No notifications yet."}
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
                        className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 active:scale-[0.98] px-3 py-1.5 text-xs font-medium text-slate-700 transition shrink-0"
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

        {/* Native modal confirmation for withdrawing a Pending pledge */}
        <dialog
          ref={cancelDialogRef}
          aria-labelledby="cancel-pledge-title"
          aria-describedby="cancel-pledge-desc"
          {...({ closedby: "any" } as any)}
          className="p-0 rounded-2xl border border-slate-200 bg-white shadow-xl max-w-md w-[calc(100%-2rem)] m-auto text-slate-900"
        >
          <div className="p-6 space-y-4">
            <div className="space-y-1.5">
              <h2
                id="cancel-pledge-title"
                className="text-base font-bold text-slate-900"
              >
                Cancel Pending Donation?
              </h2>
              <p id="cancel-pledge-desc" className="text-xs text-slate-600">
                {cancelTarget
                  ? `Are you sure you want to withdraw Donation ${cancelTarget.donationId} (${cancelTarget.eventName || "General Relief Fund"})? This removes the pending pledge before verification.`
                  : "Are you sure you want to cancel this pending donation?"}
              </p>
            </div>
            <form
              method="dialog"
              onSubmit={(e) => handleAnimatedDialogSubmit(e, cancelDialogRef.current)}
              className="flex justify-end gap-2 pt-2"
            >
              <button
                ref={keepBtnRef}
                value="cancel"
                autoFocus
                className="rounded-xl border border-slate-300 bg-white hover:bg-slate-100 active:scale-[0.98] px-4 py-2 text-xs font-semibold text-slate-700 transition"
              >
                Keep Donation
              </button>
              <button
                value="confirm"
                className="rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-[0.98] px-4 py-2 text-xs font-semibold text-white transition"
              >
                Cancel Pledge
              </button>
            </form>
          </div>
        </dialog>
      </div>

      {/* Official Donation Receipt Modal (Printable standalone native <dialog>) */}
      {selectedCertificateDonation && (
        <DonationCertificateModal
          donation={selectedCertificateDonation}
          donorName={session?.user?.fullName}
          onClose={() => setSelectedCertificateDonation(null)}
        />
      )}
    </PortalSidebarLayout>
  );
}
