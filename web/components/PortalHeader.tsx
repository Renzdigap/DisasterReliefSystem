"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  LogOut,
  Database,
  Bell,
  UserCheck,
  RefreshCw,
  ChevronRight,
} from "lucide-react";
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
      {/* Persistent Left Vertical Sidebar (Desktop) */}
      <aside className="w-full lg:w-68 xl:w-72 shrink-0 bg-slate-900 text-slate-100 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-800 lg:min-h-screen lg:sticky lg:top-0 lg:h-screen no-print">
        <div className="flex flex-col flex-1 min-h-0">
          {/* Brand Header */}
          <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-11 w-11 rounded-xl bg-white p-1 border border-slate-700 flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
                <img
                  src="/logo.jpg"
                  alt="DRRMS Official Logo"
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="truncate">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm tracking-tight text-white">
                    DRRMS
                  </span>
                  <span className="rounded-md bg-emerald-500/20 border border-emerald-400/30 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                    {roleBadge || session?.user?.role || "Portal"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate mt-0.5">
                  Relief Operations Console
                </p>
              </div>
            </div>

            {/* Mobile Sign Out */}
            <button
              onClick={handleLogout}
              className="lg:hidden inline-flex items-center gap-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 px-2.5 py-1.5 text-xs font-semibold text-white"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Exit</span>
            </button>
          </div>

          {/* Navigation Links */}
          <div className="px-3 py-4 flex-1 overflow-y-auto">
            <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Workspace Modules
            </div>
            <nav className="flex lg:flex-col gap-1.5 overflow-x-auto lg:overflow-x-visible pb-1 lg:pb-0">
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                let badgeClasses = "bg-slate-800 text-slate-300";
                if (item.badgeTone === "rose") {
                  badgeClasses = "bg-rose-500/20 text-rose-300 border border-rose-500/30";
                } else if (item.badgeTone === "amber") {
                  badgeClasses = "bg-amber-500/20 text-amber-300 border border-amber-500/30";
                } else if (item.badgeTone === "emerald") {
                  badgeClasses =
                    "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30";
                } else if (isActive) {
                  badgeClasses = "bg-white/20 text-white";
                }

                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectTab(item.id)}
                    className={`group flex items-center justify-between gap-2.5 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold transition-all shrink-0 lg:w-full ${
                      isActive
                        ? "bg-emerald-600 text-white shadow-sm shadow-emerald-950/50"
                        : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`shrink-0 transition-colors ${
                          isActive
                            ? "text-white"
                            : "text-slate-400 group-hover:text-emerald-400"
                        }`}
                      >
                        {item.icon}
                      </span>
                      <span className="truncate">{item.label}</span>
                    </div>

                    {item.badge !== undefined && (
                      <span
                        className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-bold leading-none ${badgeClasses}`}
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

        {/* Bottom Database Status & User Profile Card (Desktop) */}
        <div className="hidden lg:block p-4 border-t border-slate-800/80 space-y-3 bg-slate-950/40">
          <div className="flex items-center justify-between rounded-xl bg-slate-900/90 border border-slate-800 px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-medium text-slate-300">
                Supabase 3NF • JDBC
              </span>
            </div>
            <Database className="h-3.5 w-3.5 text-emerald-400" />
          </div>

          {session?.user && (
            <div className="rounded-xl bg-slate-800/60 border border-slate-700/60 p-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-8 w-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-300 font-bold text-xs shrink-0">
                  {session.user.fullName
                    ? session.user.fullName.charAt(0).toUpperCase()
                    : "U"}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">
                    {session.user.fullName}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">
                    @{session.user.username} • {session.user.role}
                  </div>
                </div>
              </div>

              <button
                onClick={handleLogout}
                title="Sign Out of Portal"
                className="rounded-lg bg-rose-500/15 hover:bg-rose-600 text-rose-300 hover:text-white p-2 transition shrink-0"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Right Full-Width Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Workspace Header Bar */}
        <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4 no-print">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
              <span>{portalTitle}</span>
              {activeNav && (
                <>
                  <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
                  <span className="text-emerald-700 font-bold">
                    {activeNav.label}
                  </span>
                </>
              )}
            </div>
            <h1 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight truncate mt-0.5">
              {activeNav ? activeNav.label : portalTitle}
            </h1>
            <p className="text-xs text-slate-500 truncate">{portalSubtitle}</p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {headerActions}

            {onSync && (
              <button
                onClick={onSync}
                disabled={syncing}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 text-emerald-600 ${
                    syncing ? "animate-spin" : ""
                  }`}
                />
                <span>{syncing ? "Syncing..." : "Sync Live DB"}</span>
              </button>
            )}

            {onOpenNotifications && (
              <button
                onClick={onOpenNotifications}
                className="relative rounded-xl border border-slate-200 bg-white hover:bg-slate-50 p-2 text-slate-700 shadow-sm transition"
                title="Notifications"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white shadow">
                    {unreadCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
}

interface PortalHeaderProps {
  session: UserSession | null;
  portalTitle: string;
  portalSubtitle: string;
  unreadCount?: number;
  onOpenNotifications?: () => void;
}

export default function PortalHeader({
  session,
  portalTitle,
  portalSubtitle,
  unreadCount = 0,
  onOpenNotifications,
}: PortalHeaderProps) {
  const router = useRouter();

  const handleLogout = () => {
    clearSession();
    router.push("/");
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white shadow-sm no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center shrink-0">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
          </div>
          <div className="truncate">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm sm:text-base tracking-tight text-white truncate">
                {portalTitle}
              </span>
              <span className="hidden md:inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300">
                <Database className="h-3 w-3" />
                Java JDBC • Supabase 3NF
              </span>
            </div>
            <p className="text-xs text-slate-400 truncate">{portalSubtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          {onOpenNotifications && (
            <button
              onClick={onOpenNotifications}
              className="relative rounded-xl bg-slate-800 hover:bg-slate-700 p-2 text-slate-200 transition"
              title="System Notifications"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </button>
          )}

          {session?.user && (
            <div className="hidden sm:flex items-center gap-2 rounded-xl bg-slate-800/90 border border-slate-700 px-3 py-1.5">
              <UserCheck className="h-4 w-4 text-emerald-400" />
              <div className="text-left leading-tight">
                <div className="text-xs font-semibold text-white">
                  {session.user.fullName}
                </div>
                <div className="text-[10px] text-emerald-300 uppercase tracking-wider">
                  {session.user.role} Portal
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
