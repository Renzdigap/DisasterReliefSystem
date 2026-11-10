"use client";

import React, { useState } from "react";
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

// ==========================================
// 4. PUBLIC RELIEF DELIVERY TRACKER MODAL
// ==========================================
interface PublicAidTrackerModalProps {
  onClose: () => void;
  initialCode?: string;
}

const SAMPLE_TRACKING_RECORDS = [
  {
    code: "DRRMS-WB-2024-00001",
    shortId: "#1",
    type: "Waybill Dispatch",
    campaign: "Typhoon Carina Flood Response",
    benefactor: "Robert Tan (Citizen Donor)",
    recipient: "Philippine Red Cross Manila",
    destination: "Port Area Evacuation Complex, Manila",
    driver: "Charlie Driver • Relief Truck (NDL-4921)",
    items: "500 Bottles Drinking Water 1L, 120 Sacks Rice 25kg",
    status: "Delivered",
    currentStage: 4,
    auditHash: "SHA256-9F8A-44C1-B72E-NDRRMC",
    timestamps: [
      "Jul 27, 08:15 AM • Pledge Audited",
      "Jul 27, 01:40 PM • Camp Aguinaldo Warehouse Allocated",
      "Jul 28, 06:10 AM • Dispatched via Fleet Truck NDL-4921",
      "Jul 28, 11:45 AM • Signed & Handed Over at Port Area Manila",
    ],
  },
  {
    code: "DRRMS-WB-2024-00008",
    shortId: "#8",
    type: "Waybill Dispatch",
    campaign: "Tropical Storm Kristine Prep",
    benefactor: "Metro Pacific Relief Foundation",
    recipient: "LGU Albay Emergency Command",
    destination: "Legazpi City Central Evacuation Dome, Albay",
    driver: "Marco Reyes • Heavy Cargo Van (VNR-8820)",
    items: "600 Bottles Drinking Water 1L, 200 Thermal Blankets",
    status: "In Transit",
    currentStage: 3,
    auditHash: "SHA256-3E12-90D4-A19C-NDRRMC",
    timestamps: [
      "Oct 23, 09:30 AM • Pledge Audited",
      "Oct 23, 03:15 PM • Regional Hub Stock Allocated",
      "Oct 24, 05:00 AM • En Route via Maharlika Highway Convoy",
      "Pending • Estimated Arrival 04:30 PM at Legazpi Dome",
    ],
  },
  {
    code: "DRRMS-DON-CERT-000003",
    shortId: "#3",
    type: "Donation Pledge",
    campaign: "Central Luzon Monsoon Inundation",
    benefactor: "Robert Tan (Citizen Donor)",
    recipient: "Pampanga Provincial Disaster Office",
    destination: "San Fernando Mega Evacuation Center, Pampanga",
    driver: "Fleet Assignment Queue • Camp Aguinaldo Hub",
    items: "250 Hygiene Kits, 100 Boxes Paracetamol 500mg",
    status: "Warehouse Allocated",
    currentStage: 2,
    auditHash: "SHA256-7B41-66F9-E08A-NDRRMC",
    timestamps: [
      "Oct 25, 10:05 AM • Donor Pledge Verified",
      "Oct 25, 02:20 PM • Quality Inspected & Stocked in Bay 4",
      "Scheduled • Awaiting Convoy Loading",
      "Pending • Final LGU Handover",
    ],
  },
];

export function PublicAidTrackerModal({
  onClose,
  initialCode = "DRRMS-WB-2024-00001",
}: PublicAidTrackerModalProps) {
  const [query, setQuery] = useState(initialCode);
  const [selectedRecord, setSelectedRecord] = useState(
    SAMPLE_TRACKING_RECORDS[0]
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim().toLowerCase();
    const match =
      SAMPLE_TRACKING_RECORDS.find(
        (r) =>
          r.code.toLowerCase().includes(q) ||
          r.shortId.toLowerCase() === q ||
          r.campaign.toLowerCase().includes(q) ||
          r.recipient.toLowerCase().includes(q)
      ) || SAMPLE_TRACKING_RECORDS[0];
    setSelectedRecord(match);
  };

  const stages = [
    {
      step: 1,
      title: "Pledge Audited & Logged",
      subtitle: "Central DRRMS Ledger",
      time: selectedRecord.timestamps[0],
    },
    {
      step: 2,
      title: "Warehouse Stock Allocated",
      subtitle: "Camp Aguinaldo Logistics Base",
      time: selectedRecord.timestamps[1],
    },
    {
      step: 3,
      title: "Dispatched via Certified Fleet",
      subtitle: selectedRecord.driver,
      time: selectedRecord.timestamps[2],
    },
    {
      step: 4,
      title: "Verified Evacuation Handover",
      subtitle: selectedRecord.destination,
      time: selectedRecord.timestamps[3],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 p-4 backdrop-blur-xs overflow-y-auto no-print">
      <div className="relative w-full max-w-2xl rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-6 text-slate-900">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#071936] via-[#0B2956] to-[#123E7C] px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white p-1 flex items-center justify-center shrink-0">
              <img
                src="/ndrrmc-logo.png"
                alt="NDRRMC"
                className="h-full w-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Public Transparency Audit
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-extrabold tracking-tight mt-0.5">
                NDRRMC Real-Time Relief Shipment Tracker
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-white/70 hover:bg-white/10 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Search Input & Quick Sample Pills */}
          <div className="space-y-2.5">
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Enter Waybill ID (e.g. DRRMS-WB-2024-00001) or Donation ID..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="rounded-xl bg-blue-600 hover:bg-blue-700 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition shrink-0"
              >
                Track Shipment
              </button>
            </form>

            <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
              <span className="text-slate-400 font-semibold">
                Verified Shipments:
              </span>
              {SAMPLE_TRACKING_RECORDS.map((rec) => (
                <button
                  key={rec.code}
                  type="button"
                  onClick={() => {
                    setQuery(rec.code);
                    setSelectedRecord(rec);
                  }}
                  className={`px-2.5 py-1 rounded-lg font-mono font-bold transition ${
                    selectedRecord.code === rec.code
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {rec.code} ({rec.status})
                </button>
              ))}
            </div>
          </div>

          {/* Shipment Summary Banner */}
          <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/70 to-indigo-50/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-extrabold text-blue-700">
                  {selectedRecord.code}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    selectedRecord.currentStage === 4
                      ? "bg-emerald-100 text-emerald-800"
                      : selectedRecord.currentStage === 3
                      ? "bg-amber-100 text-amber-800"
                      : "bg-blue-100 text-blue-800"
                  }`}
                >
                  {selectedRecord.status}
                </span>
              </div>
              <h3 className="text-sm font-extrabold text-slate-900">
                {selectedRecord.campaign} &rarr; {selectedRecord.recipient}
              </h3>
              <p className="text-xs text-slate-600">
                <span className="font-semibold">Cargo Manifest:</span>{" "}
                {selectedRecord.items}
              </p>
            </div>
            <div className="text-left sm:text-right shrink-0 space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Audit Verification Hash
              </span>
              <span className="font-mono text-[11px] font-bold text-emerald-700 bg-white px-2 py-1 rounded-lg border border-emerald-200 inline-block">
                ✓ {selectedRecord.auditHash}
              </span>
            </div>
          </div>

          {/* 4-Stage Chain-of-Custody Stepper */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              End-to-End Chain of Custody Audit Trail
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {stages.map((s) => {
                const isDone = s.step <= selectedRecord.currentStage;
                const isCurrent = s.step === selectedRecord.currentStage;
                return (
                  <div
                    key={s.step}
                    className={`rounded-2xl border p-3.5 flex flex-col justify-between gap-2 transition ${
                      isCurrent
                        ? "border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/20"
                        : isDone
                        ? "border-emerald-200 bg-emerald-50/30"
                        : "border-slate-200 bg-slate-50/60 opacity-60"
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span
                          className={`h-6 w-6 rounded-full text-xs font-extrabold flex items-center justify-center ${
                            isDone
                              ? "bg-emerald-600 text-white"
                              : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {isDone ? "✓" : s.step}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Step 0{s.step}
                        </span>
                      </div>
                      <div className="text-xs font-extrabold text-slate-900 leading-snug">
                        {s.title}
                      </div>
                      <div className="text-[11px] font-medium text-slate-600">
                        {s.subtitle}
                      </div>
                    </div>
                    <div className="pt-2 border-t border-slate-200/70 text-[10px] font-semibold text-slate-500">
                      {s.time}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
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

