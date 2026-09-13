"use client";

import { useEffect, useRef, useState } from "react";

/* THE DEPLETION ARC.
 *
 * The emotional centre of the page is one number: how long a normal home lasts
 * before the cupboard runs dry. A figure in a box states it; an arc that sweeps
 * to a fraction of a 72-hour ring SHOWS it, and the gap between the sweep and
 * the full circle is the argument.
 *
 * The geometry is the data — the arc length IS hours ÷ 72 — so this is not
 * decoration standing in for a fact. Under reduced motion it simply renders at
 * its final length.
 */
export default function DryGauge({ hours, target = 72 }: { hours: number; target?: number }) {
  const R = 52;
  const C = 2 * Math.PI * R;
  const frac = Math.max(0.02, Math.min(1, hours / target));

  const [drawn, setDrawn] = useState(0);
  const ref = useRef<SVGSVGElement | null>(null);
  const seen = useRef(false);

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced || typeof IntersectionObserver === "undefined") {
      setDrawn(frac);
      return;
    }
    // Draw once it is actually on screen, then follow the value on every change.
    if (seen.current) {
      setDrawn(frac);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (e) => {
        if (e.some((x) => x.isIntersecting)) {
          seen.current = true;
          setDrawn(frac);
          io.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [frac]);

  return (
    <svg ref={ref} className="sf-gauge" viewBox="0 0 128 128" role="img"
         aria-label={`${hours} hours of water against a ${target}-hour target`}>
      <circle className="sf-gaugetrack" cx="64" cy="64" r={R} />
      {/* The 72-hour target, marked so the shortfall is visible rather than implied */}
      <circle
        className="sf-gaugearc"
        cx="64" cy="64" r={R}
        strokeDasharray={`${C}`}
        strokeDashoffset={C * (1 - drawn)}
      />
      <text className="sf-gaugenum" x="64" y="62" textAnchor="middle">{hours}</text>
      <text className="sf-gaugelab" x="64" y="80" textAnchor="middle">hours</text>
    </svg>
  );
}
