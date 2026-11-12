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
import { closeTopLayer, useSiblingStagger } from "@/components/InteractiveMotion";

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
    const handleNativeCancel = (e: Event) => {
      e.preventDefault();
      void closeTopLayer(dialog, "");
    };
    dialog.addEventListener("close", handleNativeClose);
    dialog.addEventListener("cancel", handleNativeCancel);

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
        void closeTopLayer(dialog, "");
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
      dialog.removeEventListener("cancel", handleNativeCancel);
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
      void closeTopLayer(dialog, "");
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
  driverName,
  vehicle,
  onClose,
}: DeliveryWaybillModalProps) {
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
    const handleNativeCancel = (e: Event) => {
      e.preventDefault();
      void closeTopLayer(dialog, "");
    };
    dialog.addEventListener("close", handleNativeClose);
    dialog.addEventListener("cancel", handleNativeCancel);

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
        void closeTopLayer(dialog, "");
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
      dialog.removeEventListener("cancel", handleNativeCancel);
      if (needsClosedByFallback) {
        dialog.removeEventListener("pointerdown", handlePointerDown);
        dialog.removeEventListener("pointerup", handlePointerUp);
      }
      if (dialog.open) {
        dialog.close();
      }
    };
  }, [delivery]);

  if (!delivery) return null;

  const requestClose = () => {
    const dialog = dialogRef.current;
    if (dialog && dialog.open) {
      void closeTopLayer(dialog, "");
    } else {
      onClose();
    }
  };

  const dispatchYear =
    delivery.dispatchDate && /^\d{4}/.test(String(delivery.dispatchDate))
      ? String(delivery.dispatchDate).slice(0, 4)
      : String(new Date().getFullYear());

  const waybillNo = `DRRMS-WB-${dispatchYear}-${String(
    delivery.deliveryId || "0"
  ).padStart(5, "0")}`;

  const resolvedDriver =
    driverName || delivery.volunteerName || "Unassigned Driver";
  const resolvedVehicle =
    vehicle || delivery.vehicleType || "Registered Relief Vehicle";
  const items: any[] = Array.isArray(delivery.items) ? delivery.items : [];
  const totalUnits = items.reduce(
    (sum, it) => sum + Number(it.quantity || 0),
    0
  );
  const statusLower = (delivery.deliveryStatus || "").toLowerCase();
  const statusPillClass =
    statusLower === "delivered"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : statusLower === "in transit"
      ? "bg-amber-50 text-amber-800 border-amber-200"
      : "bg-slate-100 text-slate-700 border-slate-200";

  const handlePrint = () => {
    window.print();
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      {...({ closedby: "any" } as any)}
      className="certificate-dialog m-auto w-[min(94vw,44rem)] max-h-[90dvh] overflow-y-auto rounded-3xl bg-white p-0 text-slate-900 shadow-2xl border border-slate-200"
    >
      {/* Top Control Bar (Hidden on print) */}
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-3.5 no-print">
        <div className="flex items-center gap-2 min-w-0">
          <FileText
            className="h-4 w-4 text-emerald-600 shrink-0"
            aria-hidden="true"
          />
          <span className="text-xs font-bold text-slate-800 truncate">
            Cargo Waybill &bull; {waybillNo}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] px-3 py-1.5 text-xs font-bold text-white shadow-sm transition"
          >
            <Printer className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Print Waybill</span>
          </button>
          <button
            type="button"
            onClick={requestClose}
            aria-label="Close waybill"
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-200/70 hover:text-slate-700 active:scale-95 transition"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Printable Waybill Manifest Body */}
      <div className="p-6 sm:p-8 space-y-6 bg-white">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-[#002060] pb-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-white p-1 border border-slate-200 shadow-xs flex items-center justify-center shrink-0">
              <img
                src="/ndrrmc-logo.png"
                alt="NDRRMC Seal"
                className="h-full w-full object-contain"
              />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-500">
                Republic of the Philippines &bull; DRRMS Logistics
              </div>
              <h2
                id={titleId}
                className="text-base sm:text-lg font-extrabold text-[#002060] tracking-tight"
              >
                Emergency Relief Cargo Waybill
              </h2>
              <p className="text-xs text-blue-700 font-semibold">
                Dispatch &amp; Custody Transfer Manifest
              </p>
            </div>
          </div>
          <div className="text-right text-xs">
            <span className="text-[11px] text-slate-500 font-semibold block">
              Waybill ID
            </span>
            <span className="font-mono font-bold text-slate-900 text-sm block">
              {waybillNo}
            </span>
            <span
              className={`inline-block mt-1 px-2.5 py-0.5 rounded-full border text-xs font-bold ${statusPillClass}`}
            >
              {delivery.deliveryStatus || "In Transit"}
            </span>
          </div>
        </div>

        {/* Carrier & Destination Coordinates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <Truck className="h-4 w-4 text-blue-600" aria-hidden="true" />
              <span>Carrier Dispatch Information</span>
            </div>
            <dl className="text-xs space-y-1.5">
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Assigned Driver:</dt>
                <dd className="font-bold text-slate-900 text-right">
                  {resolvedDriver}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Vehicle Type:</dt>
                <dd className="font-semibold text-slate-800 text-right">
                  {resolvedVehicle}
                </dd>
              </div>
              {delivery.volunteerContact && (
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Driver Contact:</dt>
                  <dd className="font-medium text-slate-800 text-right">
                    {delivery.volunteerContact}
                  </dd>
                </div>
              )}
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Dispatch Date:</dt>
                <dd className="font-semibold text-slate-800 tabular-nums text-right">
                  {delivery.dispatchDate || "Recorded"}
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <MapPin className="h-4 w-4 text-rose-500" aria-hidden="true" />
              <span>Recipient &amp; Destination</span>
            </div>
            <dl className="text-xs space-y-1.5">
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Organization:</dt>
                <dd className="font-bold text-slate-900 text-right">
                  {delivery.orgName || "Local Relief Operations"}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Location:</dt>
                <dd className="font-semibold text-slate-800 text-right">
                  {delivery.location || "Designated Site"}
                </dd>
              </div>
              {delivery.eventName && (
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Disaster Event:</dt>
                  <dd className="font-semibold text-slate-800 text-right">
                    {delivery.eventName}
                  </dd>
                </div>
              )}
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Request ID:</dt>
                <dd className="font-semibold text-slate-800 tabular-nums text-right">
                  {delivery.requestId}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Cargo Manifest Checklist */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <h3 className="font-bold text-slate-700">Dispatched Cargo Items</h3>
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
                  <th scope="col" className="py-2.5 px-3 text-right">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.length > 0 ? (
                  items.map((it: any, i: number) => (
                    <tr key={it.requestItemId || it.goodId || i}>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {it.itemName}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {it.category || "Relief Commodity"}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-slate-900 tabular-nums">
                        {Number(it.quantity || 0).toLocaleString()}{" "}
                        {it.unitOfMeasure || "Units"}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-emerald-700">
                        {statusLower === "delivered"
                          ? "Handed Over"
                          : "Allocated"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">
                      Relief Requisition {delivery.requestId} Cargo
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      Central Warehouse Allocation
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-slate-700">
                      See Request {delivery.requestId}
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-emerald-700">
                      {statusLower === "delivered"
                        ? "Handed Over"
                        : "Allocated"}
                    </td>
                  </tr>
                )}
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
              {resolvedDriver}
              <span className="block text-[11px] font-normal text-slate-500">
                Volunteer Transport Driver
              </span>
            </div>
          </div>

          <div className="space-y-8">
            <p className="font-semibold text-slate-600">
              2. Receiving Officer Sign-off:
            </p>
            <div className="border-t border-slate-400 pt-1 font-bold text-slate-900">
              {delivery.orgName || "Receiving LGU Officer"}
              <span className="block text-[11px] font-normal text-slate-500">
                {delivery.location || "Authorized LGU Representative"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </dialog>
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
    campaign: "Typhoon Carina - Quiaoit River Flash Flood",
    recipient: "Brgy. 1-N Ricarte (Nalasin) Council",
    destination: "Brgy. 1-N Ricarte Evacuation Staging Area, City of Batac",
    items: "400 Bottles Drinking Water (1L), 30 Sacks Rice (25kg)",
    status: "Delivered",
    currentStage: 4,
    steps: [
      {
        label: "Pledge Verified",
        detail: "Batac CDRRMO Central Ledger",
        time: "Jul 27, 08:15 AM",
      },
      {
        label: "Warehouse Allocated",
        detail: "Batac City Central Relief Depot (Quiling Sur)",
        time: "Jul 27, 01:40 PM",
      },
      {
        label: "Dispatched",
        detail: "Charlie Driver (Batac Unit) • Pickup Truck",
        time: "Jul 28, 06:10 AM",
      },
      {
        label: "Delivered & Received",
        detail: "Brgy. 1-N Ricarte Evacuation Staging Area, Batac City",
        time: "Jul 28, 11:45 AM",
      },
    ],
  },
  {
    code: "DRRMS-WB-2024-00008",
    shortId: "#8",
    campaign: "Localized Flash Flood Incident - Quiling & Bil-loca",
    recipient: "Brgy. 30-W Baoa West Council",
    destination: "Brgy. 30-W Baoa West Hall, City of Batac, Ilocos Norte",
    items: "35 Sacks Rice (25kg), Hygiene Kits",
    status: "In Transit",
    currentStage: 3,
    steps: [
      {
        label: "Pledge Verified",
        detail: "Batac CDRRMO Central Ledger",
        time: "Aug 18, 09:30 AM",
      },
      {
        label: "Warehouse Allocated",
        detail: "Batac City Central Relief Depot (Quiling Sur)",
        time: "Aug 18, 03:15 PM",
      },
      {
        label: "In Transit",
        detail: "Karen Joy Cortez (Batac Youth Desk) • Multicab",
        time: "Aug 19, 05:00 AM",
      },
      {
        label: "Scheduled Delivery",
        detail: "Brgy. 30-W Baoa West Hall, City of Batac",
        time: "Est. 04:30 PM",
      },
    ],
  },
  {
    code: "DRRMS-DON-CERT-000003",
    shortId: "#3",
    campaign: "Typhoon Egay - City-Wide Agricultural Recovery",
    recipient: "Brgy. 16-S Quiling Sur Council (MMSU)",
    destination: "Batac City Evacuation Center, Quiling Sur",
    items: "300 Thermal Blankets & Mats",
    status: "Warehouse Allocated",
    currentStage: 2,
    steps: [
      {
        label: "Pledge Verified",
        detail: "Batac CDRRMO Central Ledger",
        time: "Jul 27, 10:05 AM",
      },
      {
        label: "Stocked in Warehouse",
        detail: "Batac City Central Relief Depot, Bay 2",
        time: "Jul 27, 02:20 PM",
      },
      {
        label: "Fleet Assignment",
        detail: "Awaiting convoy loading",
        time: "Scheduled",
      },
      {
        label: "Final Handover",
        detail: "Batac City Evacuation Center, Quiling Sur",
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
  const [selectedStepIdx, setSelectedStepIdx] = useState<number>(
    () =>
      (SAMPLE_TRACKING_RECORDS.find((r) => r.code === initialCode) ||
        SAMPLE_TRACKING_RECORDS[0]).currentStage - 1
  );
  const [notFoundMsg, setNotFoundMsg] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const timelineRef = useRef<HTMLOListElement>(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();

  useSiblingStagger(timelineRef, selectedRecord.code);

  useEffect(() => {
    setSelectedStepIdx(Math.max(0, selectedRecord.currentStage - 1));
  }, [selectedRecord.code, selectedRecord.currentStage]);

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
    const handleNativeCancel = (e: Event) => {
      e.preventDefault();
      void closeTopLayer(dialog, "");
    };
    dialog.addEventListener("close", handleNativeClose);
    dialog.addEventListener("cancel", handleNativeCancel);

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
        void closeTopLayer(dialog, "");
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
      dialog.removeEventListener("cancel", handleNativeCancel);
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
      void closeTopLayer(dialog, "");
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
  const progressPct = Math.round((selectedRecord.currentStage / 4) * 100);
  const progressFillClass =
    selectedRecord.status === "Delivered"
      ? "bg-emerald-500"
      : selectedRecord.status === "In Transit"
      ? "bg-amber-500"
      : "bg-blue-600";

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
                className="w-full min-h-[42px] rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2 text-sm font-medium text-slate-900 focus:bg-white focus:border-blue-600 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-1"
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
              const statusTextClass =
                rec.status === "Delivered"
                  ? "text-emerald-700"
                  : rec.status === "In Transit"
                  ? "text-amber-700"
                  : "text-blue-700";

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
                  className={`interactive-lift rounded-xl border px-3 py-2 text-left transition ${
                    isSelected
                      ? "border-blue-600 bg-blue-50 text-slate-900 shadow-xs ring-1 ring-blue-600"
                      : "border-slate-200 bg-slate-50/70 text-slate-700 hover:bg-slate-100 hover:border-slate-300"
                  }`}
                >
                  <span className="block font-mono text-xs font-bold truncate">
                    {rec.code}
                  </span>
                  <span className={`mt-0.5 block text-xs font-semibold ${statusTextClass}`}>
                    {rec.status}
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

          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
              <span>Stage {selectedRecord.currentStage} of 4</span>
              <span className="tabular-nums">{progressPct}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-200/80 overflow-hidden">
              <div
                style={{ width: `${progressPct}%` }}
                className={`h-full rounded-full ${progressFillClass} transition-[width] duration-300 ease-out`}
              />
            </div>
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

        {/* Interactive 4-Step Delivery Progress Timeline */}
        <section aria-label="Delivery progress" className="space-y-3">
          <h4 className="text-sm font-bold text-slate-900">
            Delivery Progress
          </h4>
          <ol key={selectedRecord.code} ref={timelineRef} className="space-y-2 stagger-grid">
            {selectedRecord.steps.map((step, index) => {
              const stepNumber = index + 1;
              const isDone = stepNumber <= selectedRecord.currentStage;
              const isCurrent = stepNumber === selectedRecord.currentStage;
              const isExpanded = selectedStepIdx === index;

              return (
                <li
                  key={step.label}
                  className={`rounded-xl border transition ${
                    isExpanded
                      ? "border-blue-400 bg-blue-50/75 shadow-xs"
                      : isCurrent
                      ? "border-blue-300 bg-blue-50/60"
                      : isDone
                      ? "border-emerald-200/80 bg-emerald-50/35"
                      : "border-slate-200/80 bg-slate-50/50 opacity-75"
                  }`}
                >
                  <button
                    type="button"
                    aria-expanded={isExpanded}
                    onClick={() =>
                      setSelectedStepIdx((prev) => (prev === index ? -1 : index))
                    }
                    className="w-full text-left px-3.5 py-2.5 flex items-start justify-between gap-3 rounded-xl"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <span
                        aria-hidden="true"
                        className={`mt-0.5 h-6 w-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0 transition-colors ${
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
                  </button>
                  <div
                    aria-hidden={!isExpanded}
                    className={`expandable-panel ${isExpanded ? "is-open" : ""}`}
                  >
                    <div className="px-3.5 pb-2.5 pl-12 text-[11px] font-medium text-slate-600 border-t border-slate-200/60 pt-2">
                      Checkpoint {stepNumber}:{" "}
                      <span className="font-semibold text-slate-800">
                        {isDone ? "Verified" : "Scheduled"}
                      </span>
                      {" · "}
                      <span>{step.time}</span>
                    </div>
                  </div>
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
    events[0]?.eventName || "Typhoon Carina - Quiaoit River Flash Flood"
  );
  const [alertTier, setAlertTier] = useState("CRITICAL FLEET MOBILIZATION");
  const [customNote, setCustomNote] = useState(
    "Report to Batac CDRRMO Central Logistics Depot (Quiling Sur) Loading Bay for immediate relief convoy dispatch. Bring rain-tarpaulin truck covers."
  );
  const [sending, setSending] = useState(false);
  const [sentDone, setSentDone] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();
  const zoneId = useId();
  const tierId = useId();
  const noteId = useId();

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
    const handleNativeCancel = (e: Event) => {
      e.preventDefault();
      void closeTopLayer(dialog, "");
    };
    dialog.addEventListener("close", handleNativeClose);
    dialog.addEventListener("cancel", handleNativeCancel);

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
        void closeTopLayer(dialog, "");
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
      dialog.removeEventListener("cancel", handleNativeCancel);
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
      void closeTopLayer(dialog, "");
    } else {
      onClose();
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setTimeout(() => {
      setSending(false);
      setSentDone(true);
      if (onBroadcastSent) {
        onBroadcastSent(
          `Fleet SMS broadcast sent to registered volunteer drivers for ${selectedZone}.`
        );
      }
    }, 600);
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      {...({ closedby: "any" } as any)}
      className="m-auto w-[min(94vw,38rem)] max-h-[90dvh] overflow-y-auto rounded-3xl bg-white p-0 text-slate-900 shadow-2xl border border-slate-200 no-print"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-rose-700 via-rose-600 to-amber-600 px-6 py-4 text-white flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <Radio className="h-5 w-5 shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-extrabold truncate">
              Fleet Alert Broadcast
            </h2>
            <p className="text-xs text-rose-100">
              SMS &amp; Radio Dispatch Alert
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={requestClose}
          aria-label="Close fleet broadcast dialog"
          className="rounded-xl p-1.5 text-white/80 hover:bg-white/15 hover:text-white transition shrink-0"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <form onSubmit={handleSend} className="p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label
              htmlFor={zoneId}
              className="block text-xs font-bold text-slate-700 mb-1"
            >
              Target Operation
            </label>
            <select
              id={zoneId}
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
            <label
              htmlFor={tierId}
              className="block text-xs font-bold text-slate-700 mb-1"
            >
              Broadcast Priority
            </label>
            <select
              id={tierId}
              value={alertTier}
              onChange={(e) => setAlertTier(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-900"
            >
              <option value="CRITICAL FLEET MOBILIZATION">
                CRITICAL FLEET MOBILIZATION
              </option>
              <option value="PRIORITY CONVOY ESCORT">
                PRIORITY CONVOY ESCORT
              </option>
              <option value="SEVERE WEATHER ROUTE WARNING">
                SEVERE WEATHER ROUTE WARNING
              </option>
            </select>
          </div>
        </div>

        <div>
          <label
            htmlFor={noteId}
            className="block text-xs font-bold text-slate-700 mb-1"
          >
            Dispatch Directive
          </label>
          <textarea
            id={noteId}
            rows={2}
            value={customNote}
            onChange={(e) => setCustomNote(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-900 font-medium"
            required
          />
        </div>

        {/* Realistic Mobile SMS Preview */}
        <div className="rounded-2xl border border-slate-200 bg-slate-900 p-4 text-white space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span className="flex items-center gap-1 text-emerald-400 font-bold">
              <Smartphone className="h-3.5 w-3.5" aria-hidden="true" />
              <span>SMS Preview (GOV-PH-NDRRMC)</span>
            </span>
          </div>
          <p className="text-xs font-mono leading-relaxed text-slate-100 bg-slate-800/90 p-3 rounded-xl border border-slate-700">
            [NDRRMC-DRRMS {alertTier}] Operation: {selectedZone}. Directive:{" "}
            {customNote} Acknowledge via Volunteer Portal immediately.
          </p>
        </div>

        {sentDone ? (
          <div
            role="status"
            className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 flex items-center justify-between text-xs text-emerald-900 font-bold"
          >
            <span className="flex items-center gap-2">
              <CheckCircle2
                className="h-4 w-4 text-emerald-600 shrink-0"
                aria-hidden="true"
              />
              Broadcast transmitted to all active Volunteer Fleet Drivers.
            </span>
            <button
              type="button"
              onClick={requestClose}
              className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 text-xs"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={requestClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sending}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-700 hover:to-amber-700 px-5 py-2 text-xs font-bold text-white shadow-md transition disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" aria-hidden="true" />
              <span>
                {sending ? "Transmitting..." : "Transmit Broadcast"}
              </span>
            </button>
          </div>
        )}
      </form>
    </dialog>
  );
}

