"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LogOut,
  Bell,
  RefreshCw,
  X,
  Check,
  ChevronRight,
  Inbox,
  Search,
  PhoneCall,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { clearSession, UserSession } from "@/lib/api";
import { PublicAidTrackerModal } from "@/components/DisasterEnhancements";

export interface SidebarNavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number | string;
  badgeTone?: "emerald" | "rose" | "amber" | "slate";
}

export interface NotificationItem {
  notificationId?: number | string;
  id?: number | string;
  message?: string;
  title?: string;
  dateSent?: string;
  sentDate?: string;
  createdAt?: string;
  isRead?: boolean;
}

function formatNotificationTimestamp(item: NotificationItem): string {
  const raw = item.dateSent || item.sentDate || item.createdAt;
  if (!raw) return "Just now";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return String(raw);
  return parsed.toLocaleString();
}

interface PortalSidebarLayoutProps {
  session: UserSession | null;
  portalTitle: string;
  portalSubtitle?: string;
  roleBadge?: string;
  navItems: SidebarNavItem[];
  activeTab: string;
  onSelectTab: (id: any) => void;
  unreadCount?: number;
  onOpenNotifications?: () => void;
  notificationsList?: NotificationItem[];
  onMarkNotificationRead?: (id: any) => void;
  onMarkAllNotificationsRead?: () => void;
  onSync?: () => void;
  syncing?: boolean;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
}

export function PortalSidebarLayout({
  session,
  portalTitle,
  portalSubtitle,
  roleBadge,
  navItems,
  activeTab,
  onSelectTab,
  unreadCount = 0,
  onOpenNotifications,
  notificationsList,
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
  onSync,
  syncing = false,
  headerActions,
  children,
}: PortalSidebarLayoutProps) {
  const router = useRouter();
  const [showNotificationDrawer, setShowNotificationDrawer] = useState(false);
  const [showAidTracker, setShowAidTracker] = useState(false);
  const [pstTime, setPstTime] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        timeZone: "Asia/Manila",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      };
      setPstTime(new Intl.DateTimeFormat("en-PH", options).format(now));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!showNotificationDrawer) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowNotificationDrawer(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showNotificationDrawer]);

  const handleLogout = () => {
    clearSession();
    router.push("/");
  };

  const activeNav = navItems.find((item) => item.id === activeTab);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col text-slate-900 font-sans selection:bg-[#0038A8] selection:text-white">
      {/* =========================================================================
          1. REPUBLIC OF THE PHILIPPINES OFFICIAL GOVERNMENT TOP BAR (GWHS)
          ========================================================================= */}
      <header className="bg-[#0F172A] border-b-2 border-[#D97706] text-white text-[11px] py-1.5 px-4 sm:px-6 shadow-sm no-print">
        <div className="flex flex-wrap items-center justify-between gap-2 max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-2.5 font-medium tracking-wide">
            <img src="/logo_bp.png" alt="Bagong Pilipinas" className="h-4 sm:h-4.5 object-contain" />
            <span className="text-slate-400 hidden sm:inline">REPUBLIKA NG PILIPINAS</span>
            <span className="text-slate-600 hidden sm:inline">•</span>
            <span className="text-amber-400 font-bold">LUNGSOD NG BATAC, ILOCOS NORTE</span>
            <span className="text-slate-600 hidden md:inline">•</span>
            <span className="text-slate-300 font-medium hidden md:inline">CDRRMO OPERATIONS CENTER</span>
          </div>
          <div className="flex items-center gap-3 text-slate-300 font-mono text-[10px] sm:text-[11px]">
            <span className="hidden sm:inline-flex items-center gap-1.5 text-amber-300">
              <Clock className="h-3 w-3" />
              <span>PST: {pstTime || "Philippine Standard Time"}</span>
            </span>
            <span className="hidden sm:inline text-slate-600">|</span>
            <span className="inline-flex items-center gap-1 text-slate-200">
              <PhoneCall className="h-3 w-3 text-rose-400" />
              <span className="hidden md:inline">CDRRMO Desk: </span><strong>(077) 792-3049</strong>
            </span>
          </div>
        </div>
      </header>

      {/* =========================================================================
          2. BODY: INSTITUTIONAL SIDEBAR + MAIN CONTENT AREA
          ========================================================================= */}
      <div className="flex-1 flex flex-col lg:flex-row min-w-0">
        {/* Institutional Government Sidebar */}
        <aside className="w-full lg:w-64 shrink-0 bg-white flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-200 lg:min-h-[calc(100vh-33px)] lg:sticky lg:top-0 lg:h-[calc(100vh-33px)] no-print shadow-xs">
          <div className="flex flex-col flex-1 min-h-0">
            {/* Clustered Insignia & Brand Header */}
            <div className="p-4 border-b border-slate-200 bg-slate-50/70">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex items-center -space-x-1.5 shrink-0">
                    <img
                      src="/logo_mmsu.png"
                      alt="MMSU Seal"
                      className="h-8 w-8 object-contain rounded-full bg-white p-0.5 border border-slate-200 shadow-xs"
                    />
                    <img
                      src="/logo_ccis.png"
                      alt="CCIS Logo"
                      className="h-8 w-8 object-contain rounded-full bg-white p-0.5 border border-slate-200 shadow-xs"
                    />
                    <img
                      src="/ndrrmc-logo.png"
                      alt="Batac CDRRMO"
                      className="h-8 w-8 object-contain rounded-full bg-white p-0.5 border border-slate-200 shadow-xs"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="font-extrabold text-xs text-slate-900 tracking-tight leading-tight truncate">
                      LUNGSOD NG BATAC
                    </div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                      CDRRMO Central Relief
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  aria-label="Sign out"
                  className="lg:hidden inline-flex items-center gap-1 rounded-md bg-slate-200 hover:bg-slate-300 px-2 py-1 text-xs font-medium text-slate-700"
                >
                  <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>

              {/* Stakeholder Role Badge */}
              <div className="mt-2.5 pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px]">
                <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
                  Portal Access
                </span>
                <span className="inline-flex items-center gap-1 font-mono font-bold text-[10px] px-2 py-0.5 rounded border border-[#0038A8]/30 bg-blue-50 text-[#0038A8]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#0038A8]" />
                  {roleBadge || session?.user?.role || "PORTAL"}
                </span>
              </div>
            </div>

            {/* Navigation Links */}
            <div className="p-3 flex-1 overflow-y-auto">
              <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible">
                {navItems.map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-current={isActive ? "page" : undefined}
                      onClick={() => onSelectTab(item.id)}
                      className={`group flex items-center justify-between gap-2.5 rounded-md px-3 py-2 text-xs sm:text-sm font-semibold transition-colors duration-150 shrink-0 lg:w-full text-left ${
                        isActive
                          ? "bg-[#0038A8] text-white font-bold border-l-4 border-amber-400 shadow-xs"
                          : "text-slate-700 hover:bg-slate-100 hover:text-slate-950 font-medium"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`shrink-0 transition-colors ${
                            isActive
                              ? "text-white"
                              : "text-slate-500 group-hover:text-slate-900"
                          }`}
                        >
                          {item.icon}
                        </span>
                        <span className="truncate">{item.label}</span>
                      </div>

                      {item.badge !== undefined && Number(item.badge) > 0 && (
                        <span
                          className={`ml-auto rounded px-1.5 py-0.5 text-[10px] sm:text-[11px] font-mono font-bold tabular-nums border leading-none ${
                            isActive
                              ? "bg-white/20 text-white border-white/30"
                              : "bg-amber-50 text-amber-900 border-amber-300"
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* User Footer: Official Government Personnel ID Card */}
          <div className="hidden lg:block p-3 border-t border-slate-200 bg-slate-50/50">
            {session?.user && (
              <div className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-xs">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-8 w-8 rounded-md bg-[#0038A8] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                      {session.user.fullName
                        ? session.user.fullName.charAt(0).toUpperCase()
                        : "U"}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">
                        {session.user.fullName}
                      </div>
                      <div className="text-[10px] font-medium text-slate-500 truncate">
                        {session.user.role} • Batac LGU
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleLogout}
                    aria-label="Sign out"
                    title="Sign Out of Session"
                    className="rounded-md hover:bg-rose-50 text-slate-400 hover:text-rose-700 p-1.5 transition shrink-0 border border-transparent hover:border-rose-200"
                  >
                    <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
                <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Active Session</span>
                  </span>
                  <span className="font-mono text-[9px] text-slate-400">RA 10173</span>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Institutional Top Breadcrumb Header */}
          <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-5 sm:px-6 py-2.5 flex items-center justify-between gap-4 no-print shadow-xs">
            <div className="min-w-0 space-y-0.5">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                <span>Lungsod ng Batac CDRRMO</span>
                <ChevronRight className="h-3 w-3 text-slate-400" />
                <span className="text-[#0038A8] font-bold">{activeNav ? activeNav.label : portalTitle}</span>
              </div>
              <div className="text-xs text-slate-600 truncate hidden sm:block">
                {portalSubtitle || "Batac Central Relief Depot • Operational Single Source of Truth (3NF)"}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {headerActions}

              {/* Public Relief Delivery Tracker Shortcut */}
              <button
                type="button"
                onClick={() => setShowAidTracker(true)}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 hover:border-slate-400 px-3 py-1.5 text-xs font-bold text-slate-700 transition shadow-xs"
                title="Public Relief Shipment & Donation Tracker"
              >
                <Search className="h-3.5 w-3.5 text-[#0038A8]" aria-hidden="true" />
                <span className="hidden sm:inline">Track Aid</span>
              </button>

              {onSync && (
                <button
                  type="button"
                  onClick={onSync}
                  disabled={syncing}
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 hover:border-slate-400 px-3 py-1.5 text-xs font-semibold text-slate-700 transition shadow-xs disabled:opacity-50"
                  title="Sync RDBMS Records"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 text-slate-600 ${
                      syncing ? "animate-spin text-[#0038A8]" : ""
                    }`}
                    aria-hidden="true"
                  />
                  <span className="hidden sm:inline">Sync</span>
                </button>
              )}

              {/* Notification Bell & Interactive Popover Flyout */}
              {(onOpenNotifications || (notificationsList && notificationsList.length > 0)) && (
                <div className="relative">
                  <button
                    type="button"
                    aria-expanded={showNotificationDrawer}
                    aria-label="Operational notifications"
                    onClick={() => {
                      if (notificationsList && notificationsList.length > 0) {
                        setShowNotificationDrawer(!showNotificationDrawer);
                      } else if (onOpenNotifications) {
                        onOpenNotifications();
                      }
                    }}
                    className="relative rounded-md border border-slate-300 bg-white hover:bg-slate-50 p-2 text-slate-700 transition shadow-xs"
                    title="CDRRMO Incident & Requisition Dispatch Log"
                  >
                    <Bell className="h-4 w-4" aria-hidden="true" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#CE1126] px-1 text-[10px] font-bold text-white shadow-xs">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Dropdown Popover Flyout */}
                  {showNotificationDrawer && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowNotificationDrawer(false)}
                      />
                      <div className="notif-flyout absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-slate-300 bg-white p-3 shadow-xl z-50">
                        <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2 px-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <Bell className="h-4 w-4 text-[#0038A8] shrink-0" aria-hidden="true" />
                            <span className="text-xs font-bold text-slate-900 truncate">
                              CDRRMO Incident &amp; Dispatch Log
                            </span>
                          </div>
                          {unreadCount > 0 && (
                            <div className="flex items-center gap-1.5 shrink-0">
                              {onMarkAllNotificationsRead && (
                                <button
                                  type="button"
                                  onClick={onMarkAllNotificationsRead}
                                  className="rounded border border-blue-200 bg-blue-50 hover:bg-blue-100 active:scale-95 px-2 py-0.5 text-[10px] font-bold text-[#0038A8] transition"
                                >
                                  Mark all
                                </button>
                              )}
                              <span className="rounded bg-rose-50 border border-rose-200 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                                {unreadCount} unread
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 py-1">
                          {!notificationsList || notificationsList.length === 0 ? (
                            <div className="py-6 text-center text-xs text-slate-400">
                              No operational dispatch alerts at this time.
                            </div>
                          ) : (
                            notificationsList.slice(0, 5).map((n) => {
                              const nId = n.notificationId || n.id;
                              const isUnread = !n.isRead;
                              return (
                                <div
                                  key={nId}
                                  className={`p-2.5 rounded-md transition flex flex-col gap-1 text-xs ${
                                    isUnread
                                      ? "bg-blue-50/70 font-semibold border-l-2 border-[#0038A8]"
                                      : "hover:bg-slate-50 text-slate-700"
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <span className="text-slate-900 line-clamp-2">
                                      {n.message || n.title}
                                    </span>
                                    {isUnread && onMarkNotificationRead && (
                                      <button
                                        type="button"
                                        onClick={() => onMarkNotificationRead(nId)}
                                        className="shrink-0 p-1 text-[#0038A8] hover:text-blue-900"
                                        title="Mark read"
                                      >
                                        <Check className="h-3 w-3" />
                                      </button>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-slate-500 font-mono">
                                    {formatNotificationTimestamp(n)}
                                  </span>
                                </div>
                              );
                            })
                          )}
                        </div>

                        <div className="border-t border-slate-200 pt-2 px-1">
                          <button
                            type="button"
                            onClick={() => {
                              setShowNotificationDrawer(false);
                              if (onOpenNotifications) {
                                onOpenNotifications();
                              } else {
                                onSelectTab("notifications");
                              }
                            }}
                            className="w-full rounded-md bg-slate-100 hover:bg-slate-200 py-2 text-center text-xs font-bold text-slate-800 transition flex items-center justify-center gap-1 border border-slate-200"
                          >
                            <span>Open All Operational Logs</span>
                            <ChevronRight className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-6 lg:p-7 max-w-7xl w-full mx-auto space-y-6">
            {children}
          </main>
        </div>
      </div>

      {showAidTracker && (
        <PublicAidTrackerModal onClose={() => setShowAidTracker(false)} />
      )}
    </div>
  );
}

export default PortalSidebarLayout;
