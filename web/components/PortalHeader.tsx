"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  LogOut,
  Database,
  Bell,
  UserCheck,
} from "lucide-react";
import { clearSession, UserSession } from "@/lib/api";

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
    <header className="bg-[#002060] border-b-4 border-amber-400 text-white shadow-md no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 rounded-lg bg-amber-400/20 border border-amber-300/40 flex items-center justify-center shrink-0">
            <ShieldCheck className="h-6 w-6 text-amber-300" />
          </div>
          <div className="truncate">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm sm:text-base tracking-tight text-white truncate">
                {portalTitle}
              </span>
              <span className="hidden md:inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 px-2.5 py-0.5 text-[11px] font-medium text-emerald-200">
                <Database className="h-3 w-3" />
                Java JDBC • Supabase 3NF
              </span>
            </div>
            <p className="text-xs text-blue-200 truncate">{portalSubtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          {onOpenNotifications && (
            <button
              onClick={onOpenNotifications}
              className="relative rounded-lg bg-white/10 hover:bg-white/20 p-2 text-blue-100 transition"
              title="System Notifications"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-bold text-slate-950">
                  {unreadCount}
                </span>
              )}
            </button>
          )}

          {session?.user && (
            <div className="hidden sm:flex items-center gap-2 rounded-lg bg-white/10 border border-white/15 px-3 py-1.5">
              <UserCheck className="h-4 w-4 text-amber-300" />
              <div className="text-left leading-tight">
                <div className="text-xs font-semibold text-white">
                  {session.user.fullName}
                </div>
                <div className="text-[10px] text-amber-200 uppercase tracking-wider">
                  {session.user.role} Portal
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
