"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import {
  Printer,
  X,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Calendar,
  Package,
  Truck,
  ShieldCheck,
  Award,
  QrCode,
  FileText,
  Building2,
  Users,
  Search,
  Radio,
  Send,
  Navigation,
  Compass,
  Clock,
  Smartphone,
  Sparkles,
} from "lucide-react";

// ==========================================
// 1. DISASTER SEVERITY & PAGASA ALERT HELPER
// ==========================================
export function getDisasterAlertInfo(eventName: string = "") {
  const lower = eventName.toLowerCase();
  if (
    lower.includes("carina") ||
    lower.includes("supertyphoon") ||
    lower.includes("pepito")
  ) {
    return {
      severity: "Signal No. 3",
      warningType: "Severe Tropical Cyclone",
      badgeColor: "bg-rose-50 text-rose-700 border-rose-200",
      dotColor: "bg-rose-500",
      familiesAffected: "28,450 Families",
      evacCenters: 42,
      priorityDemand: "Drinking Water, Ready-to-Eat Food, Family Tents",
      urgency: "CRITICAL RESPONSE",
      progressPct: 82,
    };
  }
  if (lower.includes("kristine")) {
    return {
      severity: "Red Rainfall Warning",
      warningType: "Severe Inundation & Landslide Threat",
      badgeColor: "bg-rose-50 text-rose-700 border-rose-200",
      dotColor: "bg-rose-500",
      familiesAffected: "19,200 Families",
      evacCenters: 28,
      priorityDemand: "Hygiene Kits, Thermal Blankets, Water",
      urgency: "HIGH PRIORITY",
      progressPct: 74,
    };
  }
  if (lower.includes("monsoon") || lower.includes("inundation")) {
    return {
      severity: "Orange Rainfall Alert",
      warningType: "Prolonged Inundation Risk",
      badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
      dotColor: "bg-amber-500",
      familiesAffected: "12,800 Families",
      evacCenters: 18,
      priorityDemand: "Food Packs, Rice Sacks, Medicine",
      urgency: "ACTIVE RELIEF",
      progressPct: 65,
    };
  }
  if (lower.includes("mayon") || lower.includes("volcan") || lower.includes("albay")) {
    return {
      severity: "Volcanic Alert Level 2",
      warningType: "Ashfall & Lahar Flow Hazard",
      badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
      dotColor: "bg-amber-500",
      familiesAffected: "8,500 Families",
      evacCenters: 14,
      priorityDemand: "N95 Dust Masks, Bottled Water, Canned Goods",
      urgency: "ACTIVE RELIEF",
      progressPct: 58,
    };
  }
  return {
    severity: "Yellow Rainfall Advisory",
    warningType: "Localized Monsoon Flood Warning",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
    dotColor: "bg-blue-500",
    familiesAffected: "4,600 Families",
    evacCenters: 8,
    priorityDemand: "Drinking Water, Hygiene Kits",
    urgency: "MONITORED",
    progressPct: 45,
  };
}

// ==========================================
// 2. OFFICIAL DONATION CERTIFICATE MODAL
// ==========================================
interface DonationCertificateModalProps {
  donation: any;
  donorName?: string;
  onClose: () => void;
}

export function DonationCertificateModal({
  donation,
  donorName,
  onClose,
}: DonationCertificateModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (!dialog.open) {
      dialog.showModal();
    }

    const handleNativeClose = () => {
      dialog.returnValue = "";
      onCloseRef.current();
    };
    dialog.addEventListener("close", handleNativeClose);

    // Light-dismiss fallback when <dialog closedby="any"> is unsupported
    let pressedOutside = false;
    const isOutsideDialog = (e: PointerEvent) => {
      const rect = dialog.getBoundingClientRect();
      return (
        e.clientX < rect.left ||
        e.clientX > rect.right ||
        e.clientY < rect.top ||
        e.clientY > rect.bottom
      );
    };
    const handlePointerDown = (e: PointerEvent) => {
      pressedOutside = isOutsideDialog(e);
    };
    const handlePointerUp = (e: PointerEvent) => {
      if (pressedOutside && isOutsideDialog(e)) {
        dialog.close();
      }
      pressedOutside = false;
    };

    const needsClosedByFallback = !("closedBy" in HTMLDialogElement.prototype);
    if (needsClosedByFallback) {
      dialog.addEventListener("pointerdown", handlePointerDown);
      dialog.addEventListener("pointerup", handlePointerUp);
    }

    return () => {
      dialog.removeEventListener("close", handleNativeClose);
      if (needsClosedByFallback) {
        dialog.removeEventListener("pointerdown", handlePointerDown);
        dialog.removeEventListener("pointerup", handlePointerUp);
      }
      if (dialog.open) {
        dialog.close();
      }
    };
  }, [donation]);

  if (!donation) return null;

  const requestClose = () => {
    const dialog = dialogRef.current;
    if (dialog && dialog.open) {
      dialog.close();
    } else {
      onClose();
    }
  };

  const certNumber = `DRRMS-DON-CERT-${String(
    donation.donationId || "0"
  ).padStart(6, "0")}`;

  const items: any[] = Array.isArray(donation.items) ? donation.items : [];
  const totalUnits = items.reduce(
    (sum, it) => sum + Number(it.quantity || 0),
    0
  );
  const isApproved =
    (donation.status || "").toLowerCase() === "approved";

  const handlePrint = () => {
    window.print();
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      {...({ closedby: "any" } as any)}
      className="certificate-dialog m-auto w-[min(94vw,42rem)] max-h-[90dvh] overflow-y-auto rounded-3xl bg-white p-0 text-slate-900 shadow-2xl border border-slate-200"
    >
      {/* Top Control Bar (Hidden on print) */}
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-3.5 no-print">
        <div className="flex items-center gap-2 min-w-0">
          <Award className="h-4 w-4 text-blue-600 shrink-0" aria-hidden="true" />
          <span className="text-xs font-bold text-slate-800 truncate">
            Donation Receipt &bull; {certNumber}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition"
          >
            <Printer className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Print</span>
          </button>
          <button
            type="button"
            onClick={requestClose}
            aria-label="Close receipt"
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-200/70 hover:text-slate-700 active:scale-95 transition"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Printable Official Receipt Body */}
      <div className="p-6 sm:p-8 space-y-5 bg-white">
        {/* Letterhead */}
        <div className="text-center space-y-2 border-b-2 border-[#002060] pb-4">
          <div className="flex items-center justify-center">
            <div className="h-12 w-12 rounded-2xl bg-white p-1 border border-slate-200 shadow-xs flex items-center justify-center">
              <img
                src="/ndrrmc-logo.png"
                alt="NDRRMC Seal"
                className="h-full w-full object-contain"
              />
            </div>
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500">
              Republic of the Philippines &bull; Office of Civil Defense
            </div>
            <h2
              id={titleId}
              className="text-base sm:text-lg font-extrabold text-[#002060] tracking-tight"
            >
              National Disaster Risk Reduction &amp; Management Council
            </h2>
            <p className="text-xs font-semibold text-blue-700">
              {isApproved
                ? "Official Donation Acknowledgment Certificate"
                : "Donation Pledge Receipt (Pending Review)"}
            </p>
          </div>
        </div>

        {/* Summary & Benefactor */}
        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 text-center space-y-2">
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
            <span className="font-mono font-semibold text-slate-700">
              {certNumber}
            </span>
            <span className="text-slate-300">&bull;</span>
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold ${
                isApproved
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-amber-50 text-amber-800 border-amber-200"
              }`}
            >
              {isApproved ? (
                <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
              ) : (
                <Clock className="h-3 w-3" aria-hidden="true" />
              )}
              <span>{donation.status || "Pending"}</span>
            </span>
          </div>

          <div className="text-lg font-bold text-slate-900 pt-1">
            {donorName || donation.donorName || "Registered Donor"}
          </div>
          <p className="text-xs text-slate-600">
            Campaign:{" "}
            <span className="font-semibold text-slate-900">
              {donation.eventName || "General Relief Fund"}
            </span>
          </p>
        </div>

        {/* Itemized Goods Schedule */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <h3 className="font-bold text-slate-700">Contributed Relief Items</h3>
            {items.length > 0 && (
              <span className="font-semibold text-slate-600 tabular-nums">
                Total: {totalUnits.toLocaleString()} units
              </span>
            )}
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                <tr>
                  <th scope="col" className="py-2.5 px-3">
                    Relief Item
                  </th>
                  <th scope="col" className="py-2.5 px-3">
                    Category
                  </th>
                  <th scope="col" className="py-2.5 px-3 text-right">
                    Quantity
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="py-4 px-3 text-center text-slate-400"
                    >
                      No itemized relief goods recorded for this entry.
                    </td>
                  </tr>
                ) : (
                  items.map((it: any, i: number) => (
                    <tr key={it.itemId || i}>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {it.itemName}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {it.category || "Relief Commodity"}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-emerald-700 tabular-nums">
                        {Number(it.quantity || 0).toLocaleString()}{" "}
                        {it.unitOfMeasure || "Units"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Verification Footer */}
        <div className="pt-4 border-t border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-4 items-end text-xs">
          <div className="space-y-1">
            <span className="text-[11px] text-slate-500 font-semibold block">
              Pledged Date
            </span>
            <span className="font-bold text-slate-800 block tabular-nums">
              {donation.donationDate || "Recorded"}
            </span>
            <span
              className={`text-[11px] font-semibold inline-flex items-center gap-1 ${
                isApproved ? "text-emerald-700" : "text-amber-700"
              }`}
            >
              {isApproved ? (
                <>
                  <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                  Inventory Credited
                </>
              ) : (
                <>
                  <Clock className="h-3 w-3" aria-hidden="true" />
                  Pending Verification
                </>
              )}
            </span>
          </div>

          <div className="hidden sm:flex flex-col items-center justify-center text-center space-y-1">
            <div className="h-10 w-10 border border-slate-200 rounded-lg p-1 bg-slate-50 flex items-center justify-center text-slate-500">
              <QrCode className="h-full w-full" aria-hidden="true" />
            </div>
            <span className="text-[10px] text-slate-500 font-mono">
              REF-{donation.donationId}
            </span>
          </div>

          <div className="text-right space-y-1">
            <div className="text-xs font-semibold text-slate-900">
              NDRRMC Logistics Desk
            </div>
            <div className="border-t border-slate-200 pt-1 text-[11px] font-medium text-slate-500">
              Central Warehouse Operations
            </div>
          </div>
        </div>
      </div>
    </dialog>
  );
}

// ==========================================
// 3. VOLUNTEER CARGO WAYBILL MODAL
// ==========================================
interface DeliveryWaybillModalProps {
  delivery: any;
  driverName?: string;
  vehicle?: string;
  onClose: () => void;
}

export function DeliveryWaybillModal({
  delivery,
  driverName = "Charlie Driver",
  vehicle = "Relief Truck (Plate: NDL-4921)",
  onClose,
}: DeliveryWaybillModalProps) {
  if (!delivery) return null;

  const waybillNo = `DRRMS-WB-2024-${String(
    delivery.deliveryId || "0"
  ).padStart(5, "0")}`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Top Control Bar */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-3.5 no-print">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-emerald-600" />
            <span className="text-xs font-bold text-slate-800">
              Official Cargo Dispatch Waybill &bull; {waybillNo}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print Waybill</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-200/70 hover:text-slate-700 transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Printable Waybill Manifest Body */}
        <div className="p-8 sm:p-10 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-white p-1 border border-slate-200 shadow-sm flex items-center justify-center">
                <img
                  src="/ndrrmc-logo.png"
                  alt="NDRRMC Seal"
                  className="h-full w-full object-contain"
                />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Republic of the Philippines &bull; DRRMS Logistics
                </div>
                <h1 className="text-base sm:text-lg font-black text-slate-900">
                  Emergency Relief Cargo Waybill
                </h1>
                <p className="text-xs text-blue-700 font-semibold">
                  Field Transport Dispatch &amp; Custody Transfer Manifest
                </p>
              </div>
            </div>
            <div className="text-right text-xs">
              <span className="text-[10px] text-slate-400 font-bold block uppercase">
                Waybill ID
              </span>
              <span className="font-mono font-bold text-slate-900 text-sm">
                {waybillNo}
              </span>
              <span className="inline-block mt-0.5 px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold">
                {delivery.deliveryStatus || "In Transit"}
              </span>
            </div>
          </div>

          {/* Carrier & Destination Coordinates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <Truck className="h-4 w-4 text-blue-600" />
                <span>Carrier Dispatch Information</span>
              </div>
              <div className="text-xs space-y-1">
                <div>
                  <span className="text-slate-400">Assigned Driver: </span>
                  <span className="font-bold text-slate-900">{driverName}</span>
                </div>
                <div>
                  <span className="text-slate-400">Logistics Vehicle: </span>
                  <span className="font-semibold text-slate-800">{vehicle}</span>
                </div>
                <div>
                  <span className="text-slate-400">Dispatch Departure: </span>
                  <span className="font-semibold text-slate-800">
                    {delivery.dispatchDate || "Current Operational Cycle"}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <MapPin className="h-4 w-4 text-rose-500" />
                <span>Drop-off Destination &amp; Recipient</span>
              </div>
              <div className="text-xs space-y-1">
                <div>
                  <span className="text-slate-400">Recipient Organization: </span>
                  <span className="font-bold text-slate-900">
                    {delivery.orgName || "Local Relief Operations"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Evacuation Center Site: </span>
                  <span className="font-semibold text-slate-800">
                    {delivery.location || "Designated Ground Site"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Linked Request ID: </span>
                  <span className="font-semibold text-slate-800">
                    #{delivery.requestId}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Cargo Manifest Checklist */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between">
              <span>Relief Cargo Manifest Inspection</span>
              <span className="text-[10px] text-slate-500 lowercase font-normal">
                check &amp; verify upon arrival
              </span>
            </h3>
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
                  <tr>
                    <th className="py-2.5 px-3">Cargo Spec / Good</th>
                    <th className="py-2.5 px-3">Batch Condition</th>
                    <th className="py-2.5 px-3 text-right">Verification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">
                      Standard Emergency Relief Requisition Pack
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      Sealed &bull; Sanitized &bull; Undamaged
                    </td>
                    <td className="py-2.5 px-3 text-right text-emerald-700 font-bold">
                      [ ✓ Verified ]
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">
                      Disaster Aid Package #{delivery.requestId}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      Central Warehouse Allocated
                    </td>
                    <td className="py-2.5 px-3 text-right text-emerald-700 font-bold">
                      [ ✓ Sealed ]
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Handover & Custody Signature Protocol */}
          <div className="pt-6 border-t-2 border-slate-300 grid grid-cols-2 gap-8 text-xs">
            <div className="space-y-8">
              <p className="font-semibold text-slate-600">
                1. Driver Handover Sign-off:
              </p>
              <div className="border-t border-slate-400 pt-1 font-bold text-slate-900">
                {driverName}
                <span className="block text-[10px] font-normal text-slate-500">
                  Certified Relief Transport Driver
                </span>
              </div>
            </div>

            <div className="space-y-8">
              <p className="font-semibold text-slate-600">
                2. Recipient Officer Receipt Sign-off:
              </p>
              <div className="border-t border-slate-400 pt-1 font-bold text-slate-900">
                Evacuation Center Incident Commander
                <span className="block text-[10px] font-normal text-slate-500">
                  {delivery.orgName} / Local Disaster Committee
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 4. PUBLIC RELIEF DELIVERY TRACKER MODAL
// ==========================================
interface PublicAidTrackerModalProps {
  onClose: () => void;
  initialCode?: string;
}

interface TrackingStage {
  label: string;
  detail: string;
  time: string;
}

interface TrackingRecord {
  code: string;
  shortId: string;
  campaign: string;
  recipient: string;
  destination: string;
  items: string;
  status: "Delivered" | "In Transit" | "Warehouse Allocated";
  currentStage: number;
  steps: TrackingStage[];
}

const SAMPLE_TRACKING_RECORDS: TrackingRecord[] = [
  {
    code: "DRRMS-WB-2024-00001",
    shortId: "#1",
    campaign: "Typhoon Carina Flood Response",
    recipient: "Philippine Red Cross Manila",
    destination: "Port Area Evacuation Complex, Manila",
    items: "500 Bottles Drinking Water (1L), 120 Sacks Rice (25kg)",
    status: "Delivered",
    currentStage: 4,
    steps: [
      {
        label: "Pledge Verified",
        detail: "Central DRRMS Ledger",
        time: "Jul 27, 08:15 AM",
      },
      {
        label: "Warehouse Allocated",
        detail: "Camp Aguinaldo Logistics Base",
        time: "Jul 27, 01:40 PM",
      },
      {
        label: "Dispatched",
        detail: "Charlie Driver • Relief Truck (NDL-4921)",
        time: "Jul 28, 06:10 AM",
      },
      {
        label: "Delivered & Received",
        detail: "Port Area Evacuation Complex, Manila",
        time: "Jul 28, 11:45 AM",
      },
    ],
  },
  {
    code: "DRRMS-WB-2024-00008",
    shortId: "#8",
    campaign: "Tropical Storm Kristine Prep",
    recipient: "LGU Albay Emergency Command",
    destination: "Legazpi City Central Evacuation Dome, Albay",
    items: "600 Bottles Drinking Water (1L), 200 Thermal Blankets",
    status: "In Transit",
    currentStage: 3,
    steps: [
      {
        label: "Pledge Verified",
        detail: "Central DRRMS Ledger",
        time: "Oct 23, 09:30 AM",
      },
      {
        label: "Warehouse Allocated",
        detail: "Camp Aguinaldo Logistics Base",
        time: "Oct 23, 03:15 PM",
      },
      {
        label: "In Transit",
        detail: "Marco Reyes • Heavy Cargo Van (VNR-8820)",
        time: "Oct 24, 05:00 AM",
      },
      {
        label: "Scheduled Delivery",
        detail: "Legazpi City Central Evacuation Dome, Albay",
        time: "Est. 04:30 PM",
      },
    ],
  },
  {
    code: "DRRMS-DON-CERT-000003",
    shortId: "#3",
    campaign: "Central Luzon Monsoon Inundation",
    recipient: "Pampanga Provincial Disaster Office",
    destination: "San Fernando Mega Evacuation Center, Pampanga",
    items: "250 Hygiene Kits, 100 Boxes Paracetamol (500mg)",
    status: "Warehouse Allocated",
    currentStage: 2,
    steps: [
      {
        label: "Pledge Verified",
        detail: "Central DRRMS Ledger",
        time: "Oct 25, 10:05 AM",
      },
      {
        label: "Stocked in Warehouse",
        detail: "Camp Aguinaldo Hub, Bay 4",
        time: "Oct 25, 02:20 PM",
      },
      {
        label: "Fleet Assignment",
        detail: "Awaiting convoy loading",
        time: "Scheduled",
      },
      {
        label: "Final Handover",
        detail: "San Fernando Mega Evacuation Center, Pampanga",
        time: "Pending",
      },
    ],
  },
];

export function PublicAidTrackerModal({
  onClose,
  initialCode = "DRRMS-WB-2024-00001",
}: PublicAidTrackerModalProps) {
  const [query, setQuery] = useState(initialCode);
  const [selectedRecord, setSelectedRecord] = useState<TrackingRecord>(
    () =>
      SAMPLE_TRACKING_RECORDS.find((r) => r.code === initialCode) ||
      SAMPLE_TRACKING_RECORDS[0]
  );
  const [notFoundMsg, setNotFoundMsg] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (!dialog.open) {
      dialog.showModal();
    }

    const handleNativeClose = () => {
      onCloseRef.current();
    };
    dialog.addEventListener("close", handleNativeClose);

    // Light-dismiss fallback when <dialog closedby="any"> is unsupported
    let pressedOutside = false;
    const isOutsideDialog = (e: PointerEvent) => {
      const rect = dialog.getBoundingClientRect();
      return (
        e.clientX < rect.left ||
        e.clientX > rect.right ||
        e.clientY < rect.top ||
        e.clientY > rect.bottom
      );
    };
    const handlePointerDown = (e: PointerEvent) => {
      pressedOutside = isOutsideDialog(e);
    };
    const handlePointerUp = (e: PointerEvent) => {
      if (pressedOutside && isOutsideDialog(e)) {
        dialog.close();
      }
      pressedOutside = false;
    };

    const needsClosedByFallback = !("closedBy" in HTMLDialogElement.prototype);
    if (needsClosedByFallback) {
      dialog.addEventListener("pointerdown", handlePointerDown);
      dialog.addEventListener("pointerup", handlePointerUp);
    }

    return () => {
      dialog.removeEventListener("close", handleNativeClose);
      if (needsClosedByFallback) {
        dialog.removeEventListener("pointerdown", handlePointerDown);
        dialog.removeEventListener("pointerup", handlePointerUp);
      }
      if (dialog.open) {
        dialog.close();
      }
    };
  }, []);

  const requestClose = () => {
    const dialog = dialogRef.current;
    if (dialog && dialog.open) {
      dialog.close();
    } else {
      onClose();
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim().toLowerCase();
    if (!q) {
      setNotFoundMsg("");
      setSelectedRecord(SAMPLE_TRACKING_RECORDS[0]);
      setQuery(SAMPLE_TRACKING_RECORDS[0].code);
      return;
    }

    const match = SAMPLE_TRACKING_RECORDS.find(
      (r) =>
        r.code.toLowerCase().includes(q) ||
        r.shortId.toLowerCase() === q ||
        r.campaign.toLowerCase().includes(q) ||
        r.recipient.toLowerCase().includes(q) ||
        r.destination.toLowerCase().includes(q)
    );

    if (match) {
      setNotFoundMsg("");
      setSelectedRecord(match);
    } else {
      setNotFoundMsg(
        `No shipment matched "${query.trim()}". Select one of the verified tracking IDs below.`
      );
    }
  };

  const statusBadgeClass =
    selectedRecord.status === "Delivered"
      ? "bg-emerald-100 text-emerald-800 border-emerald-200"
      : selectedRecord.status === "In Transit"
      ? "bg-amber-100 text-amber-800 border-amber-200"
      : "bg-blue-100 text-blue-800 border-blue-200";

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      {...({ closedby: "any" } as any)}
      className="tracker-dialog m-auto w-[min(94vw,42rem)] max-h-[90dvh] overflow-y-auto rounded-3xl bg-white p-0 text-slate-900 shadow-2xl border border-slate-200 no-print"
    >
      {/* Clean Modal Header */}
      <div className="bg-gradient-to-r from-[#071936] via-[#0B2956] to-[#123E7C] px-6 py-4 text-white flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-xl bg-white p-1 flex items-center justify-center shrink-0">
            <img
              src="/ndrrmc-logo.png"
              alt="NDRRMC"
              className="h-full w-full object-contain"
            />
          </div>
          <h2
            id={titleId}
            className="text-base sm:text-lg font-bold tracking-tight leading-snug"
          >
            NDRRMC Shipment Tracker
          </h2>
        </div>
        <button
          type="button"
          onClick={requestClose}
          aria-label="Close tracker"
          className="rounded-xl p-2 text-white/80 hover:bg-white/15 hover:text-white active:scale-95 transition shrink-0"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <div className="p-6 space-y-5 leading-normal">
        {/* Search & Quick Sample Selector */}
        <div className="space-y-3">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search
                className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="search"
                autoFocus
                aria-label="Waybill or donation tracking ID"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  if (notFoundMsg) setNotFoundMsg("");
                }}
                placeholder="Enter Tracking ID (e.g. DRRMS-WB-2024-00001)"
                className="w-full min-h-[42px] rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2 text-sm font-medium text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="min-h-[42px] rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] px-5 py-2 text-xs sm:text-sm font-bold text-white shadow-sm transition shrink-0"
            >
              Track Shipment
            </button>
          </form>

          {notFoundMsg && (
            <p role="status" className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              {notFoundMsg}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {SAMPLE_TRACKING_RECORDS.map((rec) => {
              const isSelected = selectedRecord.code === rec.code;
              const dotClass =
                rec.status === "Delivered"
                  ? "bg-emerald-500"
                  : rec.status === "In Transit"
                  ? "bg-amber-500"
                  : "bg-blue-500";

              return (
                <button
                  key={rec.code}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => {
                    setQuery(rec.code);
                    setSelectedRecord(rec);
                    setNotFoundMsg("");
                  }}
                  className={`rounded-xl border px-3 py-2 text-left transition active:scale-[0.98] ${
                    isSelected
                      ? "border-blue-600 bg-blue-50 text-slate-900 shadow-xs ring-1 ring-blue-600"
                      : "border-slate-200 bg-slate-50/70 text-slate-700 hover:bg-slate-100 hover:border-slate-300"
                  }`}
                >
                  <span className="block font-mono text-xs font-bold truncate">
                    {rec.code}
                  </span>
                  <span className="mt-0.5 flex items-center gap-1.5 text-xs font-medium text-slate-600">
                    <span
                      className={`h-2 w-2 rounded-full shrink-0 ${dotClass}`}
                      aria-hidden="true"
                    />
                    <span>{rec.status}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Clean Shipment Overview Card */}
        <section
          aria-label="Shipment summary"
          className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-mono text-xs font-semibold text-blue-700">
                {selectedRecord.code}
              </p>
              <h3 className="text-base font-bold text-slate-900 leading-snug">
                {selectedRecord.campaign}
              </h3>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold border ${statusBadgeClass}`}
            >
              {selectedRecord.status}
            </span>
          </div>

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 pt-3 border-t border-slate-200/80 text-xs">
            <div>
              <dt className="font-semibold text-slate-500">Recipient</dt>
              <dd className="font-semibold text-slate-900 mt-0.5">
                {selectedRecord.recipient}
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-500">Destination</dt>
              <dd className="font-semibold text-slate-900 mt-0.5">
                {selectedRecord.destination}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="font-semibold text-slate-500">Relief Cargo</dt>
              <dd className="font-medium text-slate-800 mt-0.5">
                {selectedRecord.items}
              </dd>
            </div>
          </dl>
        </section>

        {/* Clean 4-Step Delivery Progress Timeline (Zero Redundant Text) */}
        <section aria-label="Delivery progress" className="space-y-3">
          <h4 className="text-sm font-bold text-slate-900">
            Delivery Progress
          </h4>
          <ol className="space-y-2">
            {selectedRecord.steps.map((step, index) => {
              const stepNumber = index + 1;
              const isDone = stepNumber <= selectedRecord.currentStage;
              const isCurrent = stepNumber === selectedRecord.currentStage;

              return (
                <li
                  key={step.label}
                  className={`flex items-start justify-between gap-3 rounded-xl border px-3.5 py-2.5 transition ${
                    isCurrent
                      ? "border-blue-300 bg-blue-50/70"
                      : isDone
                      ? "border-emerald-200/80 bg-emerald-50/35"
                      : "border-slate-200/80 bg-slate-50/50 opacity-70"
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <span
                      aria-hidden="true"
                      className={`mt-0.5 h-6 w-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${
                        isDone
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {isDone ? "✓" : stepNumber}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                        {step.label}
                      </p>
                      <p className="text-xs text-slate-600 mt-0.5">
                        {step.detail}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-slate-500 whitespace-nowrap shrink-0">
                    {step.time}
                  </span>
                </li>
              );
            })}
          </ol>
        </section>
      </div>
    </dialog>
  );
}

// ==========================================
// 5. EMERGENCY FLEET SMS BROADCAST CONSOLE
// ==========================================
interface EmergencyBroadcastModalProps {
  events?: any[];
  onClose: () => void;
  onBroadcastSent?: (summary: string) => void;
}

export function EmergencyBroadcastModal({
  events = [],
  onClose,
  onBroadcastSent,
}: EmergencyBroadcastModalProps) {
  const [selectedZone, setSelectedZone] = useState(
    events[0]?.eventName || "Tropical Storm Kristine Prep (Albay)"
  );
  const [alertTier, setAlertTier] = useState("CRITICAL FLEET MOBILIZATION");
  const [customNote, setCustomNote] = useState(
    "Report to Camp Aguinaldo Loading Bay 2 for immediate relief convoy dispatch. Bring rain-tarpaulin truck covers."
  );
  const [sending, setSending] = useState(false);
  const [sentDone, setSentDone] = useState(false);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setTimeout(() => {
      setSending(false);
      setSentDone(true);
      if (onBroadcastSent) {
        onBroadcastSent(
          `Emergency Telecom Broadcast transmitted to 10 registered Volunteer Fleet Drivers for ${selectedZone}.`
        );
      }
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 p-4 backdrop-blur-xs overflow-y-auto no-print">
      <div className="relative w-full max-w-xl rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-6 text-slate-900">
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-700 via-rose-600 to-amber-600 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Radio className="h-5 w-5 animate-pulse" />
            <div>
              <h2 className="text-base font-extrabold">
                NDRRMC Emergency Fleet SMS Broadcast Console
              </h2>
              <p className="text-[11px] text-rose-100">
                Multi-Channel Telecom &amp; Radio Dispatch Alert Transmitter
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1 text-white/80 hover:bg-white/15 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSend} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Target Calamity Operation
              </label>
              <select
                value={selectedZone}
                onChange={(e) => setSelectedZone(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-900"
              >
                {events.map((ev: any) => (
                  <option key={ev.eventId} value={ev.eventName}>
                    {ev.eventName} ({ev.location})
                  </option>
                ))}
                <option value="All Active Calamity Sectors">
                  All Active Calamity Sectors (National)
                </option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Emergency Broadcast Priority
              </label>
              <select
                value={alertTier}
                onChange={(e) => setAlertTier(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-900"
              >
                <option value="CRITICAL FLEET MOBILIZATION">
                  🚨 CRITICAL FLEET MOBILIZATION
                </option>
                <option value="PRIORITY CONVOY ESCORT">
                  🚚 PRIORITY CONVOY ESCORT
                </option>
                <option value="SEVERE WEATHER ROUTE WARNING">
                  🌧️ SEVERE WEATHER ROUTE WARNING
                </option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Dispatch Directive Message
            </label>
            <textarea
              rows={2}
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-900 font-medium"
              required
            />
          </div>

          {/* Realistic Mobile SMS Preview */}
          <div className="rounded-2xl border border-slate-200 bg-slate-900 p-4 text-white space-y-1.5">
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
              <span className="flex items-center gap-1 text-emerald-400 font-bold">
                <Smartphone className="h-3.5 w-3.5" /> SMS GATEWAY PREVIEW (GOV-PH-NDRRMC)
              </span>
              <span>RECIPIENTS: 10 CERTIFIED DRIVERS</span>
            </div>
            <p className="text-xs font-mono leading-relaxed text-slate-100 bg-slate-800/90 p-3 rounded-xl border border-slate-700">
              [NDRRMC-DRRMS {alertTier}] Operation: {selectedZone}. Directive:{" "}
              {customNote} Acknowledge via Volunteer Portal immediately.
            </p>
          </div>

          {sentDone ? (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 flex items-center justify-between text-xs text-emerald-900 font-bold">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Broadcast transmitted to all active Volunteer Fleet Drivers!
              </span>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg bg-emerald-600 text-white px-3 py-1 text-xs"
              >
                Done
              </button>
            </div>
          ) : (
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={sending}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-700 hover:to-amber-700 px-5 py-2 text-xs font-bold text-white shadow-md transition disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                <span>
                  {sending
                    ? "Transmitting via Telecom Gateway..."
                    : "Transmit Emergency Broadcast"}
                </span>
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

