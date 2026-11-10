"use client";

import React from "react";
import {
  TrendingUp,
  PackageCheck,
  AlertTriangle,
  HeartHandshake,
  Truck,
  CheckCircle2,
  PieChart,
  BarChart3,
  Award,
  Layers,
} from "lucide-react";

// ==========================================
// 1. DISASTER OPERATIONAL SUMMARY CHARTS
// ==========================================
export function OperationalSummaryCharts({ rows }: { rows: any[] }) {
  if (!rows || rows.length === 0) return null;

  const totalEvents = rows.length;
  const totalDonations = rows.reduce(
    (sum, r) => sum + Number(r.totalDonations || 0),
    0
  );
  const totalRequests = rows.reduce(
    (sum, r) => sum + Number(r.totalRequests || 0),
    0
  );
  const totalDeliveries = rows.reduce(
    (sum, r) => sum + Number(r.totalDeliveries || 0),
    0
  );
  const fulfillmentRate =
    totalRequests > 0
      ? Math.min(100, Math.round((totalDeliveries / totalRequests) * 100))
      : 0;

  // Find max value across all metrics to scale SVG bars properly
  const maxValue = Math.max(
    1,
    ...rows.map((r) =>
      Math.max(
        Number(r.totalDonations || 0),
        Number(r.totalRequests || 0),
        Number(r.totalDeliveries || 0)
      )
    )
  );

  // SVG Chart Dimensions
  const chartHeight = 240;
  const chartWidth = 720;
  const paddingLeft = 45;
  const paddingRight = 20;
  const paddingTop = 25;
  const paddingBottom = 45;
  const availableWidth = chartWidth - paddingLeft - paddingRight;
  const availableHeight = chartHeight - paddingTop - paddingBottom;

  const groupWidth = availableWidth / rows.length;
  const barWidth = Math.max(8, Math.min(22, (groupWidth - 24) / 3));

  return (
    <div className="space-y-4 mb-6">
      {/* Executive Statistical KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="rounded-xl border border-blue-100 bg-gradient-to-br from-white to-blue-50/60 p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold uppercase tracking-wider">
            <span>Calamities</span>
            <AlertTriangle className="h-4 w-4 text-blue-600" />
          </div>
          <div className="mt-1.5 text-2xl font-black text-slate-900">
            {totalEvents}
          </div>
          <div className="mt-1 text-[11px] font-medium text-blue-700">
            Tracked Disaster Zones
          </div>
        </div>

        <div className="rounded-xl border border-blue-100 bg-gradient-to-br from-white to-blue-50/60 p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold uppercase tracking-wider">
            <span>Donations</span>
            <HeartHandshake className="h-4 w-4 text-blue-600" />
          </div>
          <div className="mt-1.5 text-2xl font-black text-blue-700">
            {totalDonations}
          </div>
          <div className="mt-1 text-[11px] font-medium text-blue-600">
            Total Pledges Logged
          </div>
        </div>

        <div className="rounded-xl border border-amber-100 bg-gradient-to-br from-white to-amber-50/60 p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold uppercase tracking-wider">
            <span>Requisitions</span>
            <TrendingUp className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-1.5 text-2xl font-black text-amber-700">
            {totalRequests}
          </div>
          <div className="mt-1 text-[11px] font-medium text-amber-600">
            LGU Relief Demands
          </div>
        </div>

        <div className="rounded-xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/60 p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold uppercase tracking-wider">
            <span>Dispatched</span>
            <Truck className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-1.5 text-2xl font-black text-emerald-700">
            {totalDeliveries}
          </div>
          <div className="mt-1 text-[11px] font-medium text-emerald-600">
            Fulfilled Missions
          </div>
        </div>

        <div className="col-span-2 lg:col-span-1 rounded-xl border border-indigo-100 bg-gradient-to-br from-white to-indigo-50/60 p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold uppercase tracking-wider">
            <span>Fulfillment</span>
            <CheckCircle2 className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="mt-1.5 text-2xl font-black text-indigo-700">
            {fulfillmentRate}%
          </div>
          <div className="mt-1 text-[11px] font-medium text-indigo-600">
            Demand-to-Delivery Ratio
          </div>
        </div>
      </div>

      {/* Main Comparative Bar Chart */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-700">
              <BarChart3 className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Disaster Event Resource Distribution (Comparison Analysis)
              </h3>
              <p className="text-[11px] text-slate-500">
                Side-by-side volume comparison of Pledges vs Demands vs Field Deliveries
              </p>
            </div>
          </div>

          {/* Chart Legend */}
          <div className="flex items-center gap-4 text-xs font-semibold">
            <span className="inline-flex items-center gap-1.5 text-slate-700">
              <span className="h-3 w-3 rounded bg-blue-600" />
              Donations
            </span>
            <span className="inline-flex items-center gap-1.5 text-slate-700">
              <span className="h-3 w-3 rounded bg-amber-500" />
              Requests
            </span>
            <span className="inline-flex items-center gap-1.5 text-slate-700">
              <span className="h-3 w-3 rounded bg-emerald-600" />
              Deliveries
            </span>
          </div>
        </div>

        {/* Scalable Vector SVG Bar Chart (100% vector, crisp on print) */}
        <div className="w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full h-auto min-w-[580px] max-h-[300px]"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Background grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
              const y = paddingTop + availableHeight * (1 - pct);
              const val = Math.round(maxValue * pct);
              return (
                <g key={i}>
                  <line
                    x1={paddingLeft}
                    y1={y}
                    x2={chartWidth - paddingRight}
                    y2={y}
                    stroke="#E2E8F0"
                    strokeDasharray={pct === 0 ? "none" : "3,3"}
                    strokeWidth={pct === 0 ? "1.5" : "1"}
                  />
                  <text
                    x={paddingLeft - 8}
                    y={y + 3.5}
                    textAnchor="end"
                    fontSize="10"
                    fill="#64748B"
                    fontWeight="600"
                  >
                    {val}
                  </text>
                </g>
              );
            })}

            {/* Bars for each Disaster Event */}
            {rows.map((r, idx) => {
              const groupCenterX =
                paddingLeft + idx * groupWidth + groupWidth / 2;
              const dVal = Number(r.totalDonations || 0);
              const rVal = Number(r.totalRequests || 0);
              const delVal = Number(r.totalDeliveries || 0);

              const dHeight = Math.max(
                2,
                (dVal / maxValue) * availableHeight
              );
              const rHeight = Math.max(
                2,
                (rVal / maxValue) * availableHeight
              );
              const delHeight = Math.max(
                2,
                (delVal / maxValue) * availableHeight
              );

              const baseY = paddingTop + availableHeight;

              // Truncate name for axis label
              const shortLabel =
                r.eventName.length > 14
                  ? r.eventName.slice(0, 12) + "…"
                  : r.eventName;

              return (
                <g key={r.eventId || idx} className="cursor-pointer">
                  {/* Donations Bar (Blue) */}
                  <rect
                    x={groupCenterX - barWidth * 1.6}
                    y={baseY - dHeight}
                    width={barWidth}
                    height={dHeight}
                    rx="3"
                    fill="#2563EB"
                  />
                  {dVal > 0 && (
                    <text
                      x={groupCenterX - barWidth * 1.1}
                      y={baseY - dHeight - 4}
                      textAnchor="middle"
                      fontSize="9"
                      fill="#1E40AF"
                      fontWeight="bold"
                    >
                      {dVal}
                    </text>
                  )}

                  {/* Requests Bar (Amber) */}
                  <rect
                    x={groupCenterX - barWidth * 0.5}
                    y={baseY - rHeight}
                    width={barWidth}
                    height={rHeight}
                    rx="3"
                    fill="#F59E0B"
                  />
                  {rVal > 0 && (
                    <text
                      x={groupCenterX}
                      y={baseY - rHeight - 4}
                      textAnchor="middle"
                      fontSize="9"
                      fill="#B45309"
                      fontWeight="bold"
                    >
                      {rVal}
                    </text>
                  )}

                  {/* Deliveries Bar (Emerald) */}
                  <rect
                    x={groupCenterX + barWidth * 0.6}
                    y={baseY - delHeight}
                    width={barWidth}
                    height={delHeight}
                    rx="3"
                    fill="#059669"
                  />
                  {delVal > 0 && (
                    <text
                      x={groupCenterX + barWidth * 1.1}
                      y={baseY - delHeight - 4}
                      textAnchor="middle"
                      fontSize="9"
                      fill="#047857"
                      fontWeight="bold"
                    >
                      {delVal}
                    </text>
                  )}

                  {/* Event Name Label on X-axis */}
                  <text
                    x={groupCenterX}
                    y={baseY + 18}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#334155"
                    fontWeight="600"
                  >
                    {shortLabel}
                  </text>
                  <text
                    x={groupCenterX}
                    y={baseY + 30}
                    textAnchor="middle"
                    fontSize="9"
                    fill="#94A3B8"
                  >
                    #{r.eventId}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 2. INVENTORY HEALTH & STOCK CHARTS
// ==========================================
export function InventoryHealthCharts({ rows }: { rows: any[] }) {
  if (!rows || rows.length === 0) return null;

  // Aggregate Category Data
  const categoryMap: Record<
    string,
    { count: number; stock: number; donated: number; requested: number }
  > = {};

  let totalStockCount = 0;
  let totalDonatedCount = 0;
  let totalRequestedCount = 0;
  let criticalCount = 0;
  let lowCount = 0;

  rows.forEach((r) => {
    const cat = r.category || "General";
    const stock = Number(
      String(r.currentStockFormatted || r.currentStock || "0").replace(/,/g, "")
    ) || 0;
    const donated = Number(r.totalDonatedQty || 0);
    const requested = Number(r.totalRequestedQty || 0);

    totalStockCount += stock;
    totalDonatedCount += donated;
    totalRequestedCount += requested;

    const health = (r.stockHealth || "").toLowerCase();
    if (health === "critical") criticalCount++;
    if (health === "low stock") lowCount++;

    if (!categoryMap[cat]) {
      categoryMap[cat] = { count: 0, stock: 0, donated: 0, requested: 0 };
    }
    categoryMap[cat].count += 1;
    categoryMap[cat].stock += stock;
    categoryMap[cat].donated += donated;
    categoryMap[cat].requested += requested;
  });

  const categories = Object.entries(categoryMap).map(([name, stats]) => ({
    name,
    ...stats,
    pct:
      totalStockCount > 0
        ? Math.round((stats.stock / totalStockCount) * 100)
        : 0,
  }));

  const categoryColors: Record<string, string> = {
    Food: "#F59E0B",
    Water: "#0284C7",
    Medicine: "#DC2626",
    "Non-Food": "#6366F1",
    Hygiene: "#059669",
    Care: "#EC4899",
    General: "#64748B",
  };

  return (
    <div className="space-y-4 mb-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="rounded-xl border border-blue-100 bg-gradient-to-br from-white to-blue-50/60 p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold uppercase tracking-wider">
            <span>Tracked SKUs</span>
            <Layers className="h-4 w-4 text-blue-600" />
          </div>
          <div className="mt-1.5 text-2xl font-black text-slate-900">
            {rows.length}
          </div>
          <div className="mt-1 text-[11px] font-medium text-blue-700">
            Relief Commodity Types
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/60 p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold uppercase tracking-wider">
            <span>Total Units</span>
            <PackageCheck className="h-4 w-4 text-slate-700" />
          </div>
          <div className="mt-1.5 text-2xl font-black text-slate-900">
            {totalStockCount.toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] font-medium text-slate-600">
            Central Warehouse Stock
          </div>
        </div>

        <div className="rounded-xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/60 p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold uppercase tracking-wider">
            <span>Cumulative Inflow</span>
            <HeartHandshake className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-1.5 text-2xl font-black text-emerald-700">
            +{totalDonatedCount.toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] font-medium text-emerald-600">
            Donated Inflow Units
          </div>
        </div>

        <div className="rounded-xl border border-amber-100 bg-gradient-to-br from-white to-amber-50/60 p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold uppercase tracking-wider">
            <span>Cumulative Outflow</span>
            <Truck className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-1.5 text-2xl font-black text-amber-700">
            -{totalRequestedCount.toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] font-medium text-amber-600">
            Requested Outflow Units
          </div>
        </div>

        <div className="col-span-2 lg:col-span-1 rounded-xl border border-rose-100 bg-gradient-to-br from-white to-rose-50/60 p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold uppercase tracking-wider">
            <span>Stock Alerts</span>
            <AlertTriangle className="h-4 w-4 text-rose-600" />
          </div>
          <div className="mt-1.5 text-2xl font-black text-rose-700">
            {criticalCount + lowCount}
          </div>
          <div className="mt-1 text-[11px] font-medium text-rose-600">
            {criticalCount} Critical &bull; {lowCount} Low Stock
          </div>
        </div>
      </div>

      {/* Visual Category Distribution and Inflow/Outflow Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Category Breakdown Card */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-700">
              <PieChart className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Warehouse Stock Distribution by Commodity Class
              </h3>
              <p className="text-[11px] text-slate-500">
                Proportion of units stockpiled across essential relief categories
              </p>
            </div>
          </div>

          {/* Segmented Volume Progress Bar */}
          <div className="space-y-2">
            <div className="h-4 w-full rounded-full overflow-hidden flex bg-slate-100 p-0.5">
              {categories.map((c) => {
                const color = categoryColors[c.name] || "#64748B";
                return (
                  <div
                    key={c.name}
                    style={{ width: `${Math.max(c.pct, 4)}%`, backgroundColor: color }}
                    className="h-full first:rounded-l-full last:rounded-r-full transition-all"
                    title={`${c.name}: ${c.stock.toLocaleString()} units (${c.pct}%)`}
                  />
                );
              })}
            </div>

            {/* Category breakdown pills */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2">
              {categories.map((c) => {
                const color = categoryColors[c.name] || "#64748B";
                return (
                  <div
                    key={c.name}
                    className="rounded-xl border border-slate-100 bg-slate-50/70 p-2 text-xs flex items-center justify-between"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span className="font-semibold text-slate-800 truncate">
                        {c.name}
                      </span>
                    </div>
                    <span className="font-extrabold text-slate-900 ml-1">
                      {c.pct}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Top Stocked Items Balance Comparison */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700">
              <BarChart3 className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Top Stock Commodities &amp; Net Inflow Balance
              </h3>
              <p className="text-[11px] text-slate-500">
                Current inventory levels vs cumulative distributed demand
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {rows.slice(0, 4).map((r) => {
              const stock = Number(
                String(r.currentStockFormatted || r.currentStock || "0").replace(/,/g, "")
              ) || 0;
              const maxStockRow = Math.max(
                ...rows.map((item) =>
                  Number(
                    String(item.currentStockFormatted || item.currentStock || "0").replace(/,/g, "")
                  ) || 1
                )
              );
              const barPercent = Math.min(100, Math.round((stock / maxStockRow) * 100));

              return (
                <div key={r.goodId} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-800 truncate max-w-[200px]">
                      {r.itemName}
                    </span>
                    <span className="text-slate-900 font-extrabold">
                      {stock.toLocaleString()} units
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      style={{ width: `${barPercent}%` }}
                      className={`h-full rounded-full ${
                        (r.stockHealth || "").toLowerCase() === "critical"
                          ? "bg-rose-500"
                          : (r.stockHealth || "").toLowerCase() === "low stock"
                          ? "bg-amber-500"
                          : "bg-blue-600"
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 3. DONOR CONTRIBUTION & IMPACT CHARTS
// ==========================================
export function DonorImpactCharts({ rows }: { rows: any[] }) {
  if (!rows || rows.length === 0) return null;

  const totalDonors = rows.length;
  const totalDonations = rows.reduce(
    (sum, r) => sum + Number(r.totalDonations || 0),
    0
  );
  const totalItemsDonated = rows.reduce(
    (sum, r) => sum + Number(r.totalItemsDonated || 0),
    0
  );
  const avgItemsPerDonor =
    totalDonors > 0 ? Math.round(totalItemsDonated / totalDonors) : 0;

  // Donor Types Breakdown
  const typeMap: Record<string, { count: number; items: number }> = {};
  rows.forEach((r) => {
    const type = r.donorType || "Individual";
    if (!typeMap[type]) typeMap[type] = { count: 0, items: 0 };
    typeMap[type].count += 1;
    typeMap[type].items += Number(r.totalItemsDonated || 0);
  });

  const donorTypes = Object.entries(typeMap).map(([type, stats]) => ({
    type,
    ...stats,
    pct:
      totalItemsDonated > 0
        ? Math.round((stats.items / totalItemsDonated) * 100)
        : 0,
  }));

  // Top 5 Donors by volume
  const topDonors = [...rows]
    .sort(
      (a, b) =>
        Number(b.totalItemsDonated || 0) - Number(a.totalItemsDonated || 0)
    )
    .slice(0, 5);

  const maxDonated = Math.max(
    1,
    ...topDonors.map((d) => Number(d.totalItemsDonated || 0))
  );

  return (
    <div className="space-y-4 mb-6">
      {/* Metric Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-blue-100 bg-gradient-to-br from-white to-blue-50/60 p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold uppercase tracking-wider">
            <span>Benefactors</span>
            <HeartHandshake className="h-4 w-4 text-blue-600" />
          </div>
          <div className="mt-1.5 text-2xl font-black text-slate-900">
            {totalDonors}
          </div>
          <div className="mt-1 text-[11px] font-medium text-blue-700">
            Registered Active Donors
          </div>
        </div>

        <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-white to-indigo-50/60 p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold uppercase tracking-wider">
            <span>Pledges</span>
            <TrendingUp className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="mt-1.5 text-2xl font-black text-indigo-700">
            {totalDonations}
          </div>
          <div className="mt-1 text-[11px] font-medium text-indigo-600">
            Verified Submissions
          </div>
        </div>

        <div className="rounded-xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/60 p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold uppercase tracking-wider">
            <span>Volume</span>
            <PackageCheck className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-1.5 text-2xl font-black text-emerald-700">
            {totalItemsDonated.toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] font-medium text-emerald-600">
            Relief Units Contributed
          </div>
        </div>

        <div className="rounded-xl border border-amber-100 bg-gradient-to-br from-white to-amber-50/60 p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold uppercase tracking-wider">
            <span>Average / Donor</span>
            <Award className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-1.5 text-2xl font-black text-amber-700">
            {avgItemsPerDonor.toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] font-medium text-amber-600">
            Avg Units Per Benefactor
          </div>
        </div>
      </div>

      {/* Visual Leaderboard & Classification Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Donors Leaderboard */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-700">
              <Award className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Top Humanitarian Benefactors (Volume Ranking)
              </h3>
              <p className="text-[11px] text-slate-500">
                Leaderboard of contributors by total relief goods pledged
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {topDonors.map((d, rank) => {
              const donated = Number(d.totalItemsDonated || 0);
              const barPercent = Math.min(100, Math.round((donated / maxDonated) * 100));
              const medal =
                rank === 0
                  ? "🥇"
                  : rank === 1
                  ? "🥈"
                  : rank === 2
                  ? "🥉"
                  : `#${rank + 1}`;

              return (
                <div key={d.donorId} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-bold w-5 shrink-0 text-slate-500">
                        {medal}
                      </span>
                      <span className="text-slate-900 font-bold truncate">
                        {d.donorName}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 shrink-0">
                        {d.donorType}
                      </span>
                    </div>
                    <span className="text-emerald-700 font-extrabold shrink-0 ml-2">
                      {donated.toLocaleString()} units
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      style={{ width: `${barPercent}%` }}
                      className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-600"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Classification Breakdown */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-700">
              <PieChart className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Contribution Share by Donor Classification
              </h3>
              <p className="text-[11px] text-slate-500">
                Comparison of Individual, Corporate, and Organization support
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            {donorTypes.map((dt) => {
              return (
                <div
                  key={dt.type}
                  className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 flex items-center justify-between"
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="text-xs font-bold text-slate-900">
                      {dt.type} Sector
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {dt.count} Benefactors &bull; {dt.items.toLocaleString()} units
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-black text-indigo-700">
                      {dt.pct}%
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium">
                      of total aid
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
