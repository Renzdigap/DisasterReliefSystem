"use client";

import React from "react";

export function StatusBadge({ status }: { status?: string }) {
  const s = status || "Unknown";
  let color = "bg-slate-100 text-slate-700 border-slate-200/90";
  let dotColor = "bg-slate-400";
  let shouldPulse = false;

  if (
    s === "Active" ||
    s === "CRITICAL ALERT" ||
    s === "Rejected" ||
    s === "Cancelled"
  ) {
    color = "bg-rose-50 text-rose-700 border-rose-200/90";
    dotColor = "bg-rose-500";
    shouldPulse = s === "Active" || s === "CRITICAL ALERT";
  } else if (
    s === "Approved" ||
    s === "Delivered" ||
    s === "SUFFICIENT" ||
    s === "Available" ||
    s === "Fulfilled"
  ) {
    color = "bg-emerald-50 text-emerald-700 border-emerald-200/90";
    dotColor = "bg-emerald-500";
  } else if (
    s === "Pending" ||
    s === "In Transit" ||
    s === "LOW STOCK" ||
    s === "On Assignment"
  ) {
    color = "bg-amber-50 text-amber-800 border-amber-200/90";
    dotColor = "bg-amber-500";
    shouldPulse = s === "In Transit";
  } else if (s === "Resolved") {
    color = "bg-slate-100 text-slate-600 border-slate-200/90";
    dotColor = "bg-slate-400";
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold tracking-tight shadow-2xs ${color}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${dotColor} ${
          shouldPulse ? "animate-ping" : ""
        }`}
      />
      <span>{s}</span>
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
          className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="h-3.5 w-28 rounded bg-slate-200 animate-pulse" />
            <div className="h-9 w-9 rounded-xl bg-slate-100 animate-pulse" />
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
    <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-slate-100 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-2">
          <div className="h-5 w-48 rounded bg-slate-200 animate-pulse" />
          <div className="h-3 w-64 rounded bg-slate-100 animate-pulse" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-56 rounded-xl bg-slate-100 animate-pulse" />
          <div className="h-9 w-28 rounded-xl bg-slate-200 animate-pulse" />
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

export function PortalShellSkeleton({
  title = "Loading Operational Portal",
}: {
  title?: string;
}) {
  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Left Vertical Sidebar Skeleton */}
      <aside className="hidden lg:flex w-64 shrink-0 bg-slate-900 text-white flex-col justify-between p-4 border-r border-slate-800">
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/20 animate-pulse" />
            <div className="space-y-1.5">
              <div className="h-4 w-28 rounded bg-slate-700 animate-pulse" />
              <div className="h-2.5 w-20 rounded bg-slate-800 animate-pulse" />
            </div>
          </div>
          <div className="space-y-2 pt-2">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div
                key={idx}
                className="h-10 w-full rounded-xl bg-slate-800/70 animate-pulse"
              />
            ))}
          </div>
        </div>
        <div className="h-16 w-full rounded-xl bg-slate-800/60 animate-pulse" />
      </aside>

      {/* Main Content Area Skeleton */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between">
          <div className="space-y-1.5">
            <div className="h-4 w-56 rounded bg-slate-200 animate-pulse" />
            <div className="h-3 w-40 rounded bg-slate-100 animate-pulse" />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-9 w-32 rounded-xl bg-slate-100 animate-pulse" />
            <div className="h-9 w-9 rounded-xl bg-slate-100 animate-pulse" />
          </div>
        </header>

        <main className="p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
          <span className="sr-only">{title}</span>
          <KpiGridSkeleton count={4} />
          <TableConsoleSkeleton rows={5} cols={5} />
        </main>
      </div>
    </div>
  );
}
