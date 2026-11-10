"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { LogOut, Bell, RefreshCw } from "lucide-react";
import { clearSession, UserSession } from "@/lib/api";

export interface SidebarNavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number | string;
  badgeTone?: "emerald" | "rose" | "amber" | "slate";
}

interface PortalSidebarLayoutProps {
  session: UserSession | null;
  portalTitle: string;
  portalSubtitle: string;
  roleBadge?: string;
  navItems: SidebarNavItem[];
  activeTab: string;
  onSelectTab: (id: any) => void;
  unreadCount?: number;
  onOpenNotifications?: () => void;
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
  onSync,
  syncing = false,
  headerActions,
  children,
}: PortalSidebarLayoutProps) {
  const router = useRouter();

  const handleLogout = () => {
    clearSession();
    router.push("/");
  };

  const activeNav = navItems.find((item) => item.id === activeTab);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col lg:flex-row text-slate-900">
      {/* Clean Light Sidebar */}
      <aside className="w-full lg:w-60 shrink-0 bg-white flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-200/90 lg:min-h-screen lg:sticky lg:top-0 lg:h-screen no-print">
        <div className="flex flex-col flex-1 min-h-0">
          {/* Official NDRRMC & DRRMS Brand Header */}
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 rounded-xl bg-white p-1 border border-slate-200/90 shadow-sm flex items-center justify-center shrink-0 overflow-hidden">
                <img
                  src="/ndrrmc-logo.png"
                  alt="NDRRMC DRRMS"
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="truncate">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-sm text-slate-900 block leading-tight">
                    DRRMS
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-bold text-[9px] uppercase tracking-wider border border-blue-200">
                    Gov
                  </span>
                </div>
                <span className="text-[11px] font-semibold text-blue-600 block truncate">
                  {roleBadge || session?.user?.role || "Portal"}
                </span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="lg:hidden inline-flex items-center gap-1 rounded-lg bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Navigation Links */}
          <div className="p-3 flex-1 overflow-y-auto">
            <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible">
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectTab(item.id)}
                    className={`group flex items-center justify-between gap-2.5 rounded-xl px-3 py-2.5 text-xs sm:text-sm font-semibold transition-all shrink-0 lg:w-full ${
                      isActive
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25"
                        : "text-slate-600 hover:bg-slate-100/90 hover:text-slate-900"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`shrink-0 transition-colors ${
                          isActive
                            ? "text-white"
                            : "text-slate-400 group-hover:text-slate-700"
                        }`}
                      >
                        {item.icon}
                      </span>
                      <span className="truncate">{item.label}</span>
                    </div>

                    {item.badge !== undefined && Number(item.badge) > 0 && (
                      <span
                        className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-bold leading-none shadow-xs ${
                          isActive
                            ? "bg-white/25 text-white"
                            : "bg-blue-50 text-blue-700 border border-blue-200"
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

        {/* User Footer with Verified Stakeholder Badge */}
        <div className="hidden lg:block p-3 border-t border-slate-100">
          {session?.user && (
            <div className="rounded-2xl bg-gradient-to-b from-slate-50 to-slate-100/70 border border-slate-200/80 p-2.5 flex items-center justify-between gap-2 shadow-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative shrink-0">
                  <div
                    className={`h-8 w-8 rounded-xl ${
                      (session.user.role || "").toLowerCase() === "donor"
                        ? "bg-rose-600 shadow-rose-500/25"
                        : (session.user.role || "").toLowerCase() === "organization"
                        ? "bg-amber-600 shadow-amber-500/25"
                        : (session.user.role || "").toLowerCase() === "volunteer"
                        ? "bg-emerald-600 shadow-emerald-500/25"
                        : "bg-blue-600 shadow-blue-500/25"
                    } text-white flex items-center justify-center font-bold text-xs shadow-sm`}
                  >
                    {session.user.fullName
                      ? session.user.fullName.charAt(0).toUpperCase()
                      : "U"}
                  </div>
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white absolute -bottom-0.5 -right-0.5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 truncate">
                    {session.user.fullName}
                  </div>
                  <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide truncate">
                    {session.user.role} &bull; Verified
                  </div>
                </div>
              </div>

              <button
                onClick={handleLogout}
                title="Sign Out"
                className="rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600 p-2 transition shrink-0"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-6 py-3 flex items-center justify-between gap-4 no-print shadow-xs">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight truncate">
                {activeNav ? activeNav.label : portalTitle}
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-[10px] font-bold text-blue-700">
                DRRMS Central
              </span>
            </div>
            <p className="text-xs text-slate-500 truncate">{portalSubtitle}</p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {/* System Live Connection Status */}
            <div className="hidden md:inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/90 text-[11px] font-semibold text-slate-700 shadow-xs">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>NDRRMC Central Operations Live</span>
            </div>

            {headerActions}

            {onSync && (
              <button
                onClick={onSync}
                disabled={syncing}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition shadow-xs disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 text-slate-500 ${
                    syncing ? "animate-spin" : ""
                  }`}
                />
                <span>Sync</span>
              </button>
            )}

            {onOpenNotifications && (
              <button
                onClick={onOpenNotifications}
                className="relative rounded-xl border border-slate-200 bg-white hover:bg-slate-50 p-2 text-slate-600 transition shadow-xs"
                title="Notifications"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-sm">
                    {unreadCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 p-5 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
}

export default PortalSidebarLayout;
