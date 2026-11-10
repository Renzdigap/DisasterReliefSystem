"use client";

import React, { useEffect, useRef, useState } from "react";

/**
 * Feature detection helper per Modern Web Guidance ("Animate Elements To and From Top Layer").
 * Evaluates lazily on the client to distinguish browsers that parse `allow-discrete`
 * without actually keeping `display` visible during transition-to-none (e.g. Firefox).
 */
let supportsDisplayTransition: boolean | undefined;

export function canTransitionDisplay(): boolean {
  if (typeof window === "undefined") return false;
  if (supportsDisplayTransition !== undefined) return supportsDisplayTransition;
  if (
    !window.CSS?.supports?.("transition-behavior", "allow-discrete") ||
    !document.body
  ) {
    return false;
  }
  const probe = document.createElement("div");
  probe.style.cssText =
    "transition: display 1s allow-discrete !important; display: block; position: absolute; visibility: hidden; pointer-events: none;";
  document.body.appendChild(probe);
  getComputedStyle(probe).display;
  probe.style.display = "none";
  supportsDisplayTransition = getComputedStyle(probe).display === "block";
  probe.remove();
  return supportsDisplayTransition;
}

export function supportsTopLayerExit(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(
    window.CSS?.supports?.("overlay", "auto") && canTransitionDisplay()
  );
}

/**
 * Cleanly closes a modal <dialog>, animating exit cleanly on all browsers:
 * Chrome/Edge use native `overlay` + discrete `display`; Firefox/Safari animate via
 * `[data-closing]` and wait for running animations before calling `.close()`.
 */
export async function closeTopLayer(
  element: HTMLDialogElement | null,
  returnValue?: string
): Promise<void> {
  if (!element || !element.open) return;

  if (element.hasAttribute("data-closing")) return;

  if (!supportsTopLayerExit()) {
    element.setAttribute("data-closing", "");
    const animations = element.getAnimations({ subtree: true });
    if (animations.length > 0) {
      await Promise.race([
        Promise.allSettled(animations.map((a) => a.finished)),
        new Promise((r) => setTimeout(r, 400)),
      ]);
    }
    if (!element.hasAttribute("data-closing")) return;
    element.removeAttribute("data-closing");
  }

  if (element.open) {
    element.close(returnValue);
  }
}

/**
 * React `<form method="dialog">` submit interceptor so non-Chrome browsers
 * animate `[data-closing]` cleanly before closing native modal dialogs.
 */
export function handleAnimatedDialogSubmit(
  e: React.FormEvent<HTMLFormElement>,
  dialog: HTMLDialogElement | null
): void {
  if (!dialog || !dialog.open || supportsTopLayerExit()) return;
  const nativeEvent = e.nativeEvent as SubmitEvent | undefined;
  const submitter = nativeEvent?.submitter as
    | HTMLButtonElement
    | HTMLInputElement
    | null;
  const action = submitter?.value || "";
  e.preventDefault();
  void closeTopLayer(dialog, action);
}

/**
 * Progressive-enhancement hook for `animation-delay` stagger on dynamic lists.
 * Falls back to `--sibling-index` CSS property ONLY when native CSS `sibling-index()` is unsupported.
 */
export function useSiblingStagger(
  containerRef: React.RefObject<HTMLElement | null>,
  triggerKey?: unknown
) {
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof window === "undefined") return;
    if (
      window.CSS?.supports?.("animation-delay", "calc(sibling-index() * 0.1s)")
    ) {
      return;
    }
    Array.from(el.children).forEach((child, idx) => {
      if (child instanceof HTMLElement) {
        child.style.setProperty("--sibling-index", String(idx));
      }
    });
  }, [containerRef, triggerKey]);
}

/**
 * Subtle, print-safe animated numeric counter for KPI figures and executive stats.
 * Respects `prefers-reduced-motion: reduce` and snaps to exact target before printing.
 */
interface AnimatedNumberProps {
  value: number;
  prefix?: string;
  suffix?: string;
  durationMs?: number;
  className?: string;
}

export function AnimatedNumber({
  value,
  prefix = "",
  suffix = "",
  durationMs = 360,
  className,
}: AnimatedNumberProps) {
  const numericTarget = Number.isFinite(Number(value)) ? Number(value) : 0;
  const [displayValue, setDisplayValue] = useState<number>(numericTarget);
  const previousRef = useRef<number>(numericTarget);

  useEffect(() => {
    const handleBeforePrint = () => {
      previousRef.current = numericTarget;
      setDisplayValue(numericTarget);
    };
    window.addEventListener("beforeprint", handleBeforePrint);
    return () => window.removeEventListener("beforeprint", handleBeforePrint);
  }, [numericTarget]);

  useEffect(() => {
    const startVal = previousRef.current;
    const endVal = numericTarget;
    if (startVal === endVal) {
      setDisplayValue(endVal);
      return;
    }

    const reducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (reducedMotion || durationMs <= 0) {
      previousRef.current = endVal;
      setDisplayValue(endVal);
      return;
    }

    let rafId = 0;
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / durationMs);
      // Smooth ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startVal + (endVal - startVal) * eased);
      setDisplayValue(current);

      if (progress < 1) {
        rafId = requestAnimationFrame(step);
      } else {
        previousRef.current = endVal;
        setDisplayValue(endVal);
      }
    };

    rafId = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(rafId);
      previousRef.current = endVal;
    };
  }, [numericTarget, durationMs]);

  return (
    <span className={className}>
      {prefix}
      {displayValue.toLocaleString()}
      {suffix}
    </span>
  );
}

/**
 * Clean 4px warehouse stock bar with semantic color thresholds matching DRRMS inventory status.
 */
export function StockLevelBar({
  stock,
  maxRef = 5000,
  className = "",
}: {
  stock: number;
  maxRef?: number;
  className?: string;
}) {
  const qty = Math.max(0, Number(stock) || 0);
  const pct =
    qty === 0
      ? 3
      : Math.min(100, Math.max(8, Math.round((qty / Math.max(1, maxRef)) * 100)));
  const fillClass =
    qty <= 200
      ? "bg-rose-500"
      : qty <= 1000
      ? "bg-amber-500"
      : "bg-emerald-500";

  return (
    <div
      aria-hidden="true"
      className={`h-1.5 w-full rounded-full bg-slate-100 overflow-hidden ${className}`}
    >
      <div
        style={{ width: `${pct}%` }}
        className={`h-full rounded-full ${fillClass} transition-[width] duration-300 ease-out`}
      />
    </div>
  );
}

/**
 * Compact 3-segment shipment progress strip (Pending -> In Transit -> Delivered).
 * Zero circle dots beside labels; pure thin bar visual indicator.
 */
export function DeliveryStepBar({ status }: { status?: string }) {
  const s = (status || "").toLowerCase();
  const stage = s === "delivered" ? 3 : s === "in transit" ? 2 : 1;
  const activeColor =
    stage === 3
      ? "bg-emerald-500"
      : stage === 2
      ? "bg-amber-500"
      : "bg-blue-500";

  return (
    <div
      aria-hidden="true"
      className="mt-1.5 flex items-center gap-1 max-w-[96px]"
      title={`Delivery Stage ${stage} of 3`}
    >
      {[1, 2, 3].map((step) => (
        <span
          key={step}
          className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
            step <= stage ? activeColor : "bg-slate-200"
          }`}
        />
      ))}
    </div>
  );
}
