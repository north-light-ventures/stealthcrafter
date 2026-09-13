"use client";

import { useEffect, useRef, useState } from "react";

/* A number that moves when it changes.
 *
 * The household selector is the conversion mechanism, and a figure that jumps
 * from 24 to 12 tells you nothing about the fact that it HALVED. Counting makes
 * the change legible, which is the whole reason the selector exists.
 *
 * Two rules it never breaks:
 *   - prefers-reduced-motion gets the final value immediately. Motion here is
 *     emphasis, never information that only exists in the animation.
 *   - it counts on CHANGE, not on every render, so it does not re-run when a
 *     sibling updates.
 */
export default function CountUp({
  value,
  decimals = 0,
  duration = 520,
  suffix = "",
}: {
  value: number;
  decimals?: number;
  duration?: number;
  suffix?: string;
}) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    const start = from.current;
    const delta = value - start;
    if (delta === 0) return;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      from.current = value;
      setShown(value);
      return;
    }

    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      // Ease-out: fast at first, settling — reads as the number arriving rather
      // than as a slot machine.
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(start + delta * eased);
      if (p < 1) raf.current = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      from.current = value;
    };
  }, [value, duration]);

  const text =
    decimals > 0
      ? shown.toFixed(decimals)
      : Math.round(shown).toLocaleString("en-GB");

  return (
    <span className="sf-count" style={{ fontVariantNumeric: "tabular-nums" }}>
      {text}
      {suffix}
    </span>
  );
}
