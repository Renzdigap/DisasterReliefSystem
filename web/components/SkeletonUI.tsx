"use client";

import React from "react";

export function StatusBadge({ status }: { status?: string }) {
  const s = status || "Unknown";
  let color = "bg-slate-100 text-slate-700 border-slate-300";
  let dotColor = "bg-slate-500";

  if (
    s === "Active" ||
    s === "CRITICAL ALERT" ||
    s === "Rejected" ||
    s === "Cancelled"
  ) {
    color = "bg-rose-50 text-rose-800 border-rose-300";
    dotColor = "bg-[#CE1126]";
  } else if (
    s === "Approved" ||
    s === "Delivered" ||
    s === "SUFFICIENT" ||
    s === "Available" ||
    s === "Fulfilled"
  ) {
    color = "bg-emerald-50 text-emerald-800 border-emerald-300";
    dotColor = "bg-emerald-600";
  } else if (
    s === "Pending" ||
    s === "In Transit" ||
    s === "LOW STOCK" ||
    s === "On Assignment"
  ) {
    color = "bg-amber-50 text-amber-900 border-amber-300";
    dotColor = "bg-[#D97706]";
  } else if (s === "Resolved") {
    color = "bg-slate-100 text-slate-700 border-slate-300";
    dotColor = "bg-slate-500";
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-[11px] font-mono font-bold tracking-wide uppercase shadow-2xs ${color}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
      <span>{s}</span>
    </span>
  );
}

export function StatusBadgeSkeleton() {
  return (
    <span className="inline-flex items-center rounded border border-slate-200 bg-slate-100 px-2.5 py-1">
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
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="h-3.5 w-28 rounded bg-slate-200 animate-pulse" />
            <div className="h-8 w-8 rounded bg-slate-100 animate-pulse" />
          </div>
          <div className="h-8 w-20 rounded bg-slate-200 animate-pulse mb-2" />
          <div className="h-3 w-36 rounded bg-slate-100 animate-pulse" />
        </div>
      ))}
    </div>
  );
}

export function TableConsoleSkeleton({
  rows = 5,
  cols = 5,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
      <div className="border-b border-slate-100 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-2">
          <div className="h-5 w-48 rounded bg-slate-200 animate-pulse" />
          <div className="h-3 w-64 rounded bg-slate-100 animate-pulse" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-56 rounded bg-slate-100 animate-pulse" />
          <div className="h-8 w-28 rounded bg-slate-200 animate-pulse" />
        </div>
      </div>
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, rIdx) => (
          <div key={rIdx} className="p-3.5 grid grid-cols-5 gap-4 items-center">
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

export function PortalShellSkeleton({
  title = "Loading Operational Portal",
}: {
  title?: string;
}) {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
      {/* GovPH Header Skeleton */}
      <header className="h-8 bg-[#0F172A] border-b-2 border-[#D97706] px-6 flex items-center justify-between">
        <div className="h-3 w-64 rounded bg-slate-700 animate-pulse" />
        <div className="h-3 w-36 rounded bg-slate-700 animate-pulse" />
      </header>

      <div className="flex-1 flex">
        {/* Left Vertical Sidebar Skeleton */}
        <aside className="hidden lg:flex w-64 shrink-0 bg-white flex-col justify-between p-4 border-r border-slate-200">
          <div className="space-y-6">
            <div className="flex items-center gap-3 px-2 py-2 border-b border-slate-100 pb-3">
              <div className="h-9 w-9 rounded-md bg-blue-100 animate-pulse" />
              <div className="space-y-1.5">
                <div className="h-4 w-28 rounded bg-slate-200 animate-pulse" />
                <div className="h-2.5 w-20 rounded bg-slate-100 animate-pulse" />
              </div>
            </div>
            <div className="space-y-2 pt-2">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div
                  key={idx}
                  className="h-9 w-full rounded-md bg-slate-100 animate-pulse"
                />
              ))}
            </div>
          </div>
          <div className="h-14 w-full rounded-md bg-slate-100 animate-pulse" />
        </aside>

        {/* Main Content Area Skeleton */}
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between">
            <div className="space-y-1">
              <div className="h-4 w-48 rounded bg-slate-200 animate-pulse" />
              <div className="h-3 w-32 rounded bg-slate-100 animate-pulse" />
            </div>
            <div className="flex items-center gap-3">
              <div className="h-8 w-28 rounded bg-slate-100 animate-pulse" />
              <div className="h-8 w-8 rounded bg-slate-100 animate-pulse" />
            </div>
          </header>

          <main className="p-6 lg:p-7 space-y-6 max-w-7xl w-full mx-auto">
            <span className="sr-only">{title}</span>
            <KpiGridSkeleton count={4} />
            <TableConsoleSkeleton rows={5} cols={5} />
          </main>
        </div>
      </div>
    </div>
  );
}
