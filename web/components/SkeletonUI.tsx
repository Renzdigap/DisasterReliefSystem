"use client";

import React from "react";

export function StatusBadge({ status }: { status: string }) {
  let colorStyle =
    "bg-slate-100 text-slate-700 border-slate-200";

  switch (status) {
    case "Active":
      colorStyle = "bg-rose-50 text-rose-700 border-rose-200";
      break;
    case "Pending":
      colorStyle = "bg-amber-50 text-amber-700 border-amber-200";
      break;
    case "Approved":
      colorStyle = "bg-blue-50 text-blue-700 border-blue-200";
      break;
    case "Fulfilled":
    case "Delivered":
      colorStyle = "bg-emerald-50 text-emerald-700 border-emerald-200";
      break;
    case "In Transit":
      colorStyle = "bg-indigo-50 text-indigo-700 border-indigo-200";
      break;
    case "Resolved":
      colorStyle = "bg-slate-100 text-slate-600 border-slate-200";
      break;
    default:
      colorStyle = "bg-slate-100 text-slate-700 border-slate-200";
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${colorStyle}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {status}
    </span>
  );
}

export function StatusBadgeSkeleton() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1">
      <span className="h-2 w-2 rounded-full bg-slate-300 animate-pulse" />
      <span className="h-2.5 w-14 rounded bg-slate-200 animate-pulse" />
    </span>
  );
}

export function KpiGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="h-3.5 w-28 rounded bg-slate-200 animate-pulse" />
            <div className="h-9 w-9 rounded-lg bg-slate-100 animate-pulse" />
          </div>
          <div className="h-8 w-20 rounded bg-slate-200 animate-pulse mb-2" />
          <div className="h-3 w-36 rounded bg-slate-100 animate-pulse" />
        </div>
      ))}
    </div>
  );
}

export function TableConsoleSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-2">
          <div className="h-5 w-48 rounded bg-slate-200 animate-pulse" />
          <div className="h-3 w-64 rounded bg-slate-100 animate-pulse" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-56 rounded-lg bg-slate-100 animate-pulse" />
          <div className="h-9 w-28 rounded-lg bg-slate-200 animate-pulse" />
        </div>
      </div>
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, rIdx) => (
          <div key={rIdx} className="p-4 grid grid-cols-5 gap-4 items-center">
            {Array.from({ length: cols }).map((__, cIdx) => (
              <div key={cIdx} className="flex items-center">
                {cIdx === cols - 1 ? (
                  <StatusBadgeSkeleton />
                ) : (
                  <div
                    className={`h-3.5 rounded bg-slate-200 animate-pulse ${
                      cIdx === 0 ? "w-24" : "w-32"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function PortalShellSkeleton({ title = "Loading Operational Portal" }: { title?: string }) {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Institutional Header Skeleton */}
      <header className="bg-[#002060] border-b-4 border-amber-400 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-white/15 animate-pulse" />
            <div className="space-y-1.5">
              <div className="h-4 w-48 rounded bg-white/25 animate-pulse" />
              <div className="h-2.5 w-32 rounded bg-white/15 animate-pulse" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-8 w-32 rounded-full bg-white/15 animate-pulse" />
            <div className="h-8 w-20 rounded-lg bg-white/20 animate-pulse" />
          </div>
        </div>
      </header>

      {/* Main Content Skeleton */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Welcome Banner Skeleton */}
        <div className="rounded-xl bg-gradient-to-r from-[#002060] to-[#1F4E79] border-t-4 border-amber-400 p-6 text-white shadow-md">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="h-3 w-40 rounded bg-amber-300/40 animate-pulse" />
              <div className="h-6 w-72 rounded bg-white/30 animate-pulse" />
              <div className="h-3.5 w-96 max-w-full rounded bg-white/20 animate-pulse" />
            </div>
            <div className="h-9 w-44 rounded-lg bg-white/15 animate-pulse" />
          </div>
          <span className="sr-only">{title}</span>
        </div>

        <KpiGridSkeleton count={4} />
        <TableConsoleSkeleton rows={5} cols={5} />
      </main>
    </div>
  );
}
