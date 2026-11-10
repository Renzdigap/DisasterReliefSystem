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
  FileText,
  ChevronLeft,
  ChevronRight,
  X,
  PackageCheck,
} from "lucide-react";
import { PortalSidebarLayout, SidebarNavItem } from "@/components/PortalHeader";
import { PortalShellSkeleton, StatusBadge } from "@/components/SkeletonUI";
import { DeliveryWaybillModal } from "@/components/DisasterEnhancements";
import {
  AnimatedNumber,
  DeliveryStepBar,
  closeTopLayer,
  handleAnimatedDialogSubmit,
  useSiblingStagger,
} from "@/components/InteractiveMotion";
import {
  apiFetch,
  getSavedSession,
  saveSession,
  getCachedData,
  setCachedData,
  UserSession,
} from "@/lib/api";

type VolunteerTab = "deliveries" | "profile" | "notifications";

const PAGE_SIZE = 7;

const VEHICLE_OPTIONS = [
  { value: "Truck", label: "Relief Truck (Heavy Cargo)" },
  { value: "Van", label: "Logistics Van" },
  { value: "Pickup / 4x4", label: "Pickup / 4x4 (Rough Terrain)" },
  { value: "Motorcycle", label: "Motorcycle (Express Dispatch)" },
  { value: "Boat / Watercraft", label: "Boat / Rescue Watercraft" },
];

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

export default function VolunteerPortalPage() {
  const router = useRouter();
  const [session, setSession] = useState<UserSession | null>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<VolunteerTab>("deliveries");

  const [banner, setBanner] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const bannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Deliveries table filters & pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [delPage, setDelPage] = useState(1);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  // Waybill preview & native <dialog> delivery handover confirmation
  const [selectedWaybill, setSelectedWaybill] = useState<any>(null);
  const [handoverTarget, setHandoverTarget] = useState<any>(null);
  const pendingHandoverRef = useRef<any>(null);
  const handoverDialogRef = useRef<HTMLDialogElement | null>(null);
  const cancelHandoverBtnRef = useRef<HTMLButtonElement | null>(null);

  // Profile & availability state
  const [fullName, setFullName] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [vehicleType, setVehicleType] = useState("Truck");
  const [isAvailable, setIsAvailable] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [togglingAvailability, setTogglingAvailability] = useState(false);
  const [touchedFields, setTouchedFields] = useState<{
    fullName?: boolean;
    contactInfo?: boolean;
  }>({});
  const [profileSubmitAttempted, setProfileSubmitAttempted] = useState(false);

  // Notifications filter
  const [notifFilter, setNotifFilter] = useState<"ALL" | "UNREAD">("ALL");
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const kpiGridRef = useRef<HTMLDivElement | null>(null);

  useSiblingStagger(kpiGridRef, !loading);

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

  const syncSessionWithProfile = useCallback(
    (updates: {
      fullName?: string;
      contactInfo?: string;
      vehicleType?: string;
      isAvailable?: boolean;
    }) => {
      setSession((prev) => {
        if (!prev) return prev;
        const nextSession: UserSession = {
          ...prev,
          user: {
            ...prev.user,
            fullName:
              updates.fullName !== undefined
                ? updates.fullName
                : prev.user.fullName,
            contactInfo:
              updates.contactInfo !== undefined
                ? updates.contactInfo
                : prev.user.contactInfo,
          },
          vehicleType:
            updates.vehicleType !== undefined
              ? updates.vehicleType
              : prev.vehicleType,
          isAvailable:
            updates.isAvailable !== undefined
              ? updates.isAvailable
              : prev.isAvailable,
        };
        saveSession(nextSession);
        return nextSession;
      });
    },
    []
  );

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
        syncSessionWithProfile({
          fullName: fresh.user?.fullName,
          contactInfo: fresh.user?.contactInfo,
          vehicleType: fresh.volunteer?.vehicleType,
          isAvailable: fresh.volunteer?.isAvailable,
        });
      } catch (err: any) {
        showBanner(err.message || "Failed to load volunteer data.", "error");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [showBanner, syncSessionWithProfile]
  );

  useEffect(() => {
    const saved = getSavedSession();
    if (!saved || !saved.user) {
      router.replace("/");
      return;
    }
    const role = (saved.user.role || "").toLowerCase();
    if (role !== "volunteer") {
      router.replace(getPortalRouteForRole(role));
      return;
    }
    setSession(saved);
    setFullName(saved.user.fullName || "");
    setContactInfo(saved.user.contactInfo || "");
    if (saved.vehicleType) setVehicleType(saved.vehicleType);
    if (typeof saved.isAvailable === "boolean") setIsAvailable(saved.isAvailable);
    loadVolunteerPortal(saved.user.userId);
  }, [router, loadVolunteerPortal]);

  useEffect(() => {
    setDelPage(1);
  }, [searchQuery, statusFilter, activeTab]);

  const handleUpdateDeliveryStatus = useCallback(
    async (deliveryId: number, newStatus: "In Transit" | "Delivered") => {
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
        showBanner(
          newStatus === "Delivered"
            ? `Delivery ${deliveryId} confirmed Delivered and request marked Fulfilled.`
            : `Delivery ${deliveryId} is now In Transit.`,
          "success"
        );
        await loadVolunteerPortal(session.user.userId, true);
      } catch (err: any) {
        showBanner(err.message || "Failed to update delivery status.", "error");
      } finally {
        setUpdatingId(null);
      }
    },
    [loadVolunteerPortal, session, showBanner]
  );

  // Hook native <dialog> close, cancel, and light-dismiss fallback for Confirm Handover dialog
  useEffect(() => {
    const dialog = handoverDialogRef.current;
    if (!dialog) return;

    const handleNativeClose = () => {
      const action = dialog.returnValue;
      dialog.returnValue = "";
      const target = pendingHandoverRef.current;
      pendingHandoverRef.current = null;
      setHandoverTarget(null);
      if (action === "confirm" && target?.deliveryId) {
        void handleUpdateDeliveryStatus(target.deliveryId, "Delivered");
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
  }, [handleUpdateDeliveryStatus, loading]);

  const openHandoverConfirm = (del: any) => {
    pendingHandoverRef.current = del;
    setHandoverTarget(del);
    const dialog = handoverDialogRef.current;
    if (dialog) {
      dialog.removeAttribute("data-closing");
      dialog.returnValue = "";
      if (!dialog.open) dialog.showModal();
      cancelHandoverBtnRef.current?.focus();
    }
  };

  const handleQuickToggleAvailability = async (nextChecked: boolean) => {
    if (!session?.user || togglingAvailability || savingProfile) return;
    const prevValue = isAvailable;
    setIsAvailable(nextChecked);
    setTogglingAvailability(true);
    try {
      await apiFetch("/api/volunteer/profile", {
        method: "PUT",
        body: JSON.stringify({
          userId: session.user.userId,
          fullName: (fullName || session.user.fullName || "").trim(),
          contactInfo: (contactInfo || session.user.contactInfo || "").trim(),
          vehicleType,
          isAvailable: nextChecked,
        }),
      });
      syncSessionWithProfile({ isAvailable: nextChecked });
      showBanner(
        nextChecked
          ? "Duty status set to Available for dispatch."
          : "Duty status set to On Assignment.",
        "success"
      );
      await loadVolunteerPortal(session.user.userId, true);
    } catch (err: any) {
      setIsAvailable(prevValue);
      showBanner(err.message || "Failed to update availability.", "error");
    } finally {
      setTogglingAvailability(false);
    }
  };

  const fullNameInvalid = fullName.trim().length < 2;
  const contactInvalid = contactInfo.trim().length < 4;
  const showFullNameError =
    fullNameInvalid && (touchedFields.fullName || profileSubmitAttempted);
  const showContactError =
    contactInvalid && (touchedFields.contactInfo || profileSubmitAttempted);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user) return;
    setProfileSubmitAttempted(true);

    if (fullNameInvalid) {
      document.getElementById("vol-fullname")?.focus();
      return;
    }
    if (contactInvalid) {
      document.getElementById("vol-contact")?.focus();
      return;
    }

    setSavingProfile(true);
    setBanner(null);
    const trimmedName = fullName.trim();
    const trimmedContact = contactInfo.trim();

    try {
      await apiFetch("/api/volunteer/profile", {
        method: "PUT",
        body: JSON.stringify({
          userId: session.user.userId,
          fullName: trimmedName,
          contactInfo: trimmedContact,
          vehicleType,
          isAvailable,
        }),
      });
      syncSessionWithProfile({
        fullName: trimmedName,
        contactInfo: trimmedContact,
        vehicleType,
        isAvailable,
      });
      showBanner("Vehicle profile and duty status saved.", "success");
      await loadVolunteerPortal(session.user.userId, true);
    } catch (err: any) {
      showBanner(err.message || "Failed to save profile.", "error");
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
          .filter((n: any) => !n.isRead && n.notificationId)
          .map((n: any) => n.notificationId);
        await Promise.all(
          unreadIds.map((id: number) =>
            apiFetch("/api/notifications/read", {
              method: "PUT",
              body: JSON.stringify({ notificationId: id }),
            })
          )
        );
      }
      await loadVolunteerPortal(session.user.userId, true);
      showBanner("All notifications marked as read.", "success");
    } catch (err: any) {
      showBanner(err.message || "Failed to mark all read.", "error");
    } finally {
      setMarkingAllRead(false);
    }
  };

  const deliveries: any[] = data?.deliveries || [];
  const notifications: any[] = data?.notifications || [];

  const unreadCount = useMemo(
    () => notifications.filter((n: any) => !n.isRead).length,
    [notifications]
  );

  const pendingCount = useMemo(
    () => deliveries.filter((d) => d.deliveryStatus === "Pending").length,
    [deliveries]
  );

  const inTransitCount = useMemo(
    () => deliveries.filter((d) => d.deliveryStatus === "In Transit").length,
    [deliveries]
  );

  const activeDispatchCount = pendingCount + inTransitCount;

  const deliveredCount = useMemo(
    () => deliveries.filter((d) => d.deliveryStatus === "Delivered").length,
    [deliveries]
  );

  const filteredDeliveries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return deliveries.filter((d: any) => {
      const matchesStatus =
        statusFilter === "ALL" || d.deliveryStatus === statusFilter;
      const cargoStr = (d.items || [])
        .map((i: any) => i.itemName)
        .join(" ")
        .toLowerCase();
      const matchesSearch =
        !q ||
        String(d.deliveryId).includes(q) ||
        String(d.requestId).includes(q) ||
        (d.orgName || "").toLowerCase().includes(q) ||
        (d.location || "").toLowerCase().includes(q) ||
        (d.eventName || "").toLowerCase().includes(q) ||
        cargoStr.includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [deliveries, statusFilter, searchQuery]);

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
      return notifications.filter((n: any) => !n.isRead);
    }
    return notifications;
  }, [notifications, notifFilter]);

  const vehicleSelectOptions = useMemo(() => {
    if (
      vehicleType &&
      !VEHICLE_OPTIONS.some((opt) => opt.value === vehicleType)
    ) {
      return [{ value: vehicleType, label: vehicleType }, ...VEHICLE_OPTIONS];
    }
    return VEHICLE_OPTIONS;
  }, [vehicleType]);

  if (loading && !data) {
    return <PortalShellSkeleton title="Loading Volunteer Logistics Portal" />;
  }

  const displayName = fullName || session?.user?.fullName || "Volunteer";

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
      portalSubtitle={`${displayName} · ${vehicleType}`}
      roleBadge="Volunteer"
      navItems={navItems}
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      unreadCount={unreadCount}
      onOpenNotifications={() => setActiveTab("notifications")}
      notificationsList={notifications}
      onMarkNotificationRead={handleMarkNotificationRead}
      onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
      onSync={() =>
        session?.user && loadVolunteerPortal(session.user.userId, true)
      }
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

        {/* Clickable KPI Cards (Clean, No Subtexts or Dots) */}
        <div
          ref={kpiGridRef}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-grid"
        >
          <button
            type="button"
            onClick={() => {
              setStatusFilter("ALL");
              setActiveTab("deliveries");
            }}
            className="interactive-lift text-left rounded-2xl border border-slate-200/80 bg-white hover:border-blue-300 hover:shadow-sm p-4 shadow-xs"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-600">
                Total Assigned
              </span>
              <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Truck className="h-4 w-4" aria-hidden="true" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-black text-slate-900 tracking-tight tabular-nums">
              <AnimatedNumber value={deliveries.length} />
            </p>
          </button>

          <button
            type="button"
            onClick={() => {
              setStatusFilter(
                inTransitCount > 0
                  ? "In Transit"
                  : pendingCount > 0
                  ? "Pending"
                  : "ALL"
              );
              setActiveTab("deliveries");
            }}
            className="interactive-lift text-left rounded-2xl border border-slate-200/80 bg-white hover:border-amber-300 hover:shadow-sm p-4 shadow-xs"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-600">
                Active Dispatch
              </span>
              <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Navigation className="h-4 w-4" aria-hidden="true" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-black text-amber-600 tracking-tight tabular-nums">
              <AnimatedNumber value={activeDispatchCount} />
            </p>
          </button>

          <button
            type="button"
            onClick={() => {
              setStatusFilter("Delivered");
              setActiveTab("deliveries");
            }}
            className="interactive-lift text-left rounded-2xl border border-slate-200/80 bg-white hover:border-emerald-300 hover:shadow-sm p-4 shadow-xs"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-600">
                Completed
              </span>
              <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-black text-emerald-600 tracking-tight tabular-nums">
              <AnimatedNumber value={deliveredCount} />
            </p>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className="interactive-lift text-left rounded-2xl border border-slate-200/80 bg-white hover:border-indigo-300 hover:shadow-sm p-4 shadow-xs"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-600">
                Duty Status
              </span>
              <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              </div>
            </div>
            <p
              className={`mt-2 text-xl sm:text-2xl font-black tracking-tight transition-colors duration-200 ${
                isAvailable ? "text-emerald-600" : "text-amber-600"
              }`}
            >
              {isAvailable ? "Available" : "On Assignment"}
            </p>
          </button>
        </div>

        {/* Quick Duty Availability Switch Bar */}
        <div
          className={`rounded-2xl border px-4 py-3 shadow-xs flex flex-wrap items-center justify-between gap-3 transition-colors duration-200 ${
            isAvailable
              ? "border-emerald-200/80 bg-emerald-50/30"
              : "border-amber-200/80 bg-amber-50/25"
          }`}
        >
          <div className="flex items-center gap-2.5 text-xs">
            <span className="font-semibold text-slate-700">Assigned Fleet:</span>
            <span className="rounded-lg bg-white/90 border border-slate-200/70 px-2.5 py-1 font-semibold text-slate-800">
              {vehicleType}
            </span>
            <StatusBadge
              status={isAvailable ? "Available" : "On Assignment"}
            />
          </div>

          <label
            htmlFor="quick-duty-switch"
            className="inline-flex items-center gap-2.5 cursor-pointer select-none text-xs font-semibold text-slate-700"
          >
            <span>Available for dispatch</span>
            <input
              id="quick-duty-switch"
              type="checkbox"
              {...({ switch: true } as any)}
              checked={isAvailable}
              disabled={togglingAvailability || savingProfile}
              onChange={(e) => handleQuickToggleAvailability(e.target.checked)}
            />
          </label>
        </div>

        {/* TAB 1: ASSIGNED DELIVERIES */}
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
                  aria-label="Search assigned deliveries"
                  placeholder="Search ID, recipient, or cargo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full sm:w-64 rounded-xl border border-slate-300 pl-9 pr-3 py-1.5 text-xs text-slate-900"
                />
              </div>
            </div>

            <div
              tabIndex={0}
              role="region"
              aria-label="Assigned deliveries table"
              className="overflow-x-auto"
            >
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <caption className="sr-only">Volunteer assigned deliveries</caption>
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                    <th scope="col" className="py-3 px-4">
                      ID
                    </th>
                    <th scope="col" className="py-3 px-4">
                      Request
                    </th>
                    <th scope="col" className="py-3 px-4">
                      Event &amp; Cargo
                    </th>
                    <th scope="col" className="py-3 px-4">
                      Recipient &amp; Location
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
                              <span className="text-[11px] text-slate-400">
                                Relief consignment
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900 text-xs">
                            {del.orgName}
                          </div>
                          <div className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-slate-500">
                            <MapPin
                              className="h-3 w-3 text-rose-500 shrink-0"
                              aria-hidden="true"
                            />
                            <span>{del.location}</span>
                          </div>
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
                            {del.deliveryStatus === "Pending" && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateDeliveryStatus(
                                    del.deliveryId,
                                    "In Transit"
                                  )
                                }
                                disabled={updatingId === del.deliveryId}
                                className="rounded-lg bg-amber-500 hover:bg-amber-600 active:scale-[0.98] px-2.5 py-1.5 text-xs font-semibold text-white transition disabled:opacity-50"
                              >
                                {updatingId === del.deliveryId
                                  ? "Saving..."
                                  : "Start Transit"}
                              </button>
                            )}
                            {del.deliveryStatus !== "Delivered" && (
                              <button
                                type="button"
                                onClick={() => openHandoverConfirm(del)}
                                disabled={updatingId === del.deliveryId}
                                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] px-2.5 py-1.5 text-xs font-semibold text-white transition disabled:opacity-50"
                              >
                                <PackageCheck
                                  className="h-3.5 w-3.5"
                                  aria-hidden="true"
                                />
                                {updatingId === del.deliveryId
                                  ? "Saving..."
                                  : "Mark Delivered"}
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

        {/* TAB 2: VEHICLE PROFILE */}
        {activeTab === "profile" && (
          <div className="max-w-xl bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 tab-panel-enter">
            <h2 className="text-base font-bold text-slate-900 mb-4">
              Vehicle &amp; Duty Profile
            </h2>

            <form
              onSubmit={handleSaveProfile}
              noValidate
              className="space-y-4"
            >
              <div>
                <label
                  htmlFor="vol-fullname"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Full Name{" "}
                  <span className="text-rose-600" aria-hidden="true">
                    *
                  </span>
                </label>
                <input
                  id="vol-fullname"
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  value={fullName}
                  aria-invalid={showFullNameError ? "true" : "false"}
                  aria-describedby={
                    showFullNameError ? "vol-fullname-error" : undefined
                  }
                  onBlur={() =>
                    setTouchedFields((prev) => ({ ...prev, fullName: true }))
                  }
                  onChange={(e) => setFullName(e.target.value)}
                  className={`w-full rounded-xl border px-3.5 py-2 text-sm text-slate-900 ${
                    showFullNameError
                      ? "border-rose-500 bg-rose-50/40"
                      : "border-slate-300 bg-white"
                  }`}
                  required
                />
                {showFullNameError && (
                  <p
                    id="vol-fullname-error"
                    className="mt-1 text-[11px] font-medium text-rose-700"
                  >
                    Error: Enter your full name (at least 2 characters).
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="vol-contact"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Contact Info{" "}
                  <span className="text-rose-600" aria-hidden="true">
                    *
                  </span>
                </label>
                <input
                  id="vol-contact"
                  name="contactInfo"
                  type="text"
                  autoComplete="tel"
                  value={contactInfo}
                  aria-invalid={showContactError ? "true" : "false"}
                  aria-describedby={
                    showContactError ? "vol-contact-error" : undefined
                  }
                  onBlur={() =>
                    setTouchedFields((prev) => ({ ...prev, contactInfo: true }))
                  }
                  onChange={(e) => setContactInfo(e.target.value)}
                  placeholder="e.g. 0917-000-0000"
                  className={`w-full rounded-xl border px-3.5 py-2 text-sm text-slate-900 ${
                    showContactError
                      ? "border-rose-500 bg-rose-50/40"
                      : "border-slate-300 bg-white"
                  }`}
                  required
                />
                {showContactError && (
                  <p
                    id="vol-contact-error"
                    className="mt-1 text-[11px] font-medium text-rose-700"
                  >
                    Error: Enter a valid mobile number or radio contact.
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="vol-vehicle"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Vehicle Type
                </label>
                <select
                  id="vol-vehicle"
                  name="vehicleType"
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900"
                >
                  {vehicleSelectOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-1">
                <label
                  htmlFor="vol-available"
                  className="inline-flex items-center gap-3 cursor-pointer select-none"
                >
                  <input
                    id="vol-available"
                    name="isAvailable"
                    type="checkbox"
                    {...({ switch: true } as any)}
                    checked={isAvailable}
                    onChange={(e) => setIsAvailable(e.target.checked)}
                  />
                  <span className="text-sm font-medium text-slate-700">
                    Available for dispatch
                  </span>
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] px-5 py-2 text-sm font-bold text-white shadow-sm transition disabled:opacity-50"
                >
                  {savingProfile ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 3: NOTIFICATIONS */}
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

      {/* Native <dialog> Confirm Delivery Handover */}
      <dialog
        ref={handoverDialogRef}
        aria-labelledby="confirm-handover-title"
        aria-describedby="confirm-handover-desc"
        {...({ closedby: "any" } as any)}
        className="p-0 rounded-2xl border border-slate-200 bg-white shadow-xl max-w-md w-[calc(100%-2rem)] m-auto text-slate-900 no-print"
      >
        <div className="p-6 space-y-4">
          <div className="space-y-1.5">
            <h2
              id="confirm-handover-title"
              className="text-base font-bold text-slate-900"
            >
              Confirm Delivery Handover
            </h2>
            <p id="confirm-handover-desc" className="text-xs text-slate-600">
              {handoverTarget
                ? `Confirm that Delivery ${handoverTarget.deliveryId} (Request ${handoverTarget.requestId}) has been physically handed over to ${handoverTarget.orgName} at ${handoverTarget.location}? This finalizes the shipment and marks the request Fulfilled.`
                : "Confirm that this relief shipment has been physically handed over at the destination site."}
            </p>
          </div>
          <form
            method="dialog"
            onSubmit={(e) =>
              handleAnimatedDialogSubmit(e, handoverDialogRef.current)
            }
            className="flex justify-end gap-2 pt-2"
          >
            <button
              ref={cancelHandoverBtnRef}
              value="cancel"
              autoFocus
              className="rounded-xl border border-slate-300 bg-white hover:bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              value="confirm"
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-semibold text-white"
            >
              Confirm Delivered
            </button>
          </form>
        </div>
      </dialog>

      {/* Official Cargo Waybill Modal (Outside .no-print so printing prints only the waybill) */}
      {selectedWaybill && (
        <DeliveryWaybillModal
          delivery={selectedWaybill}
          driverName={displayName || selectedWaybill.volunteerName}
          vehicle={vehicleType || selectedWaybill.vehicleType}
          onClose={() => setSelectedWaybill(null)}
        />
      )}
    </PortalSidebarLayout>
  );
}
