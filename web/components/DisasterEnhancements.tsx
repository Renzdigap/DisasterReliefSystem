"use client";

import React from "react";
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
  if (!donation) return null;

  const certNumber = `DRRMS-DON-CERT-${String(
    donation.donationId || "0"
  ).padStart(6, "0")}`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Top Control Bar (Hidden on print) */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-3.5 no-print">
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-blue-600" />
            <span className="text-xs font-bold text-slate-800">
              Official Donation Acknowledgment &bull; {certNumber}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print Certificate</span>
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

        {/* Printable Official Certificate Body */}
        <div className="p-8 sm:p-10 space-y-6 bg-gradient-to-b from-white via-[#FCFDFE] to-slate-50/50">
          {/* Certificate Official Letterhead */}
          <div className="text-center space-y-2 border-b-2 border-[#002060] pb-5">
            <div className="flex items-center justify-center gap-3">
              <div className="h-14 w-14 rounded-2xl bg-white p-1 border border-slate-200 shadow-sm flex items-center justify-center">
                <img
                  src="/ndrrmc-logo.png"
                  alt="NDRRMC Seal"
                  className="h-full w-full object-contain"
                />
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Republic of the Philippines &bull; Office of Civil Defense
              </div>
              <h1 className="text-lg sm:text-xl font-black text-[#002060] tracking-tight uppercase">
                National Disaster Risk Reduction &amp; Management Council
              </h1>
              <p className="text-xs font-bold text-blue-700">
                Disaster Relief &amp; Resource Management System (DRRMS)
              </p>
            </div>
          </div>

          {/* Certificate Title */}
          <div className="text-center space-y-1">
            <div className="inline-block px-3 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-[10px] font-extrabold text-blue-700 uppercase tracking-widest">
              Official Acknowledgment Certificate
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Certificate of Humanitarian Aid Donation
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              Serial Number: <span className="font-bold text-slate-800">{certNumber}</span>
            </p>
          </div>

          {/* Formal Gratitude Statement */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs text-center space-y-2">
            <p className="text-xs text-slate-600 leading-relaxed">
              This certifies that the National Disaster Risk Reduction &amp; Management Council acknowledges the vital humanitarian contribution of:
            </p>
            <div className="text-lg sm:text-xl font-black text-blue-900 tracking-tight py-1">
              {donorName || "Verified Citizen Benefactor"}
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              in support of national emergency relief mobilization for:
            </p>
            <div className="text-sm font-extrabold text-slate-900 bg-slate-50 rounded-xl py-1 px-3 inline-block border border-slate-200">
              {donation.eventName || "NDRRMC Central Calamity Emergency Fund"}
            </div>
          </div>

          {/* Itemized Goods Schedule */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Audited Schedule of Contributed Relief Goods
            </h3>
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
                  <tr>
                    <th className="py-2.5 px-3">Relief Item Description</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3 text-right">Quantity Contributed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(donation.items || []).map((it: any, i: number) => (
                    <tr key={i}>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {it.itemName}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {it.category || "Relief Commodity"}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                        {it.quantity} {it.unitOfMeasure || "Units"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Certification Protocol & Security Footer */}
          <div className="pt-4 border-t border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-4 items-end text-xs">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">
                Pledged On
              </span>
              <span className="font-bold text-slate-800 block">
                {donation.donationDate || new Date().toISOString().slice(0, 10)}
              </span>
              <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Custody Verified
              </span>
            </div>

            <div className="hidden sm:flex flex-col items-center justify-center text-center space-y-1">
              <div className="h-10 w-10 border border-slate-300 rounded-lg p-1 bg-slate-50 flex items-center justify-center text-slate-500">
                <QrCode className="h-full w-full" />
              </div>
              <span className="text-[9px] text-slate-400 font-mono">
                SEC-ID-{donation.donationId}
              </span>
            </div>

            <div className="text-right space-y-1">
              <div className="font-serif italic text-blue-900 text-sm">
                Col. Bernardo R. Ramos
              </div>
              <div className="border-t border-slate-300 pt-1 text-[10px] font-bold text-slate-700 uppercase">
                Director of Logistics
              </div>
              <div className="text-[9px] text-slate-400">
                NDRRMC Central Command
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
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
