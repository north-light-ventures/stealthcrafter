"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export type CarouselItem = {
  key: string;
  name: string;
  qty: number;
  image: string | null;
  slug: string | null;
  status: string | null;
  filled: boolean;
};

/* WHAT IS ACTUALLY IN THE BOX, before any of the argument.
 *
 * A retail page earns its attention with the things, not with prose about the
 * things. This runs straight under the masthead so the first thing anyone sees
 * is seventeen real photographs of real products.
 *
 * The five unfilled slots ride along at the end rather than being quietly
 * dropped. That is the same call the manifest makes, and it is the brand: a
 * list of what is missing is worth more than a photograph of what is not. They
 * are drawn as deliberately empty tiles so they read as a decision rather than
 * as images that failed to load.
 *
 * No carousel library. Native scroll-snap does the whole job, which means it
 * swipes correctly on a phone, respects reduced-motion, and keeps working if
 * the JavaScript never arrives — the arrows are an enhancement over a strip
 * that is already usable.
 */
export default function PackCarousel({ items }: { items: CarouselItem[] }) {
  const rail = useRef<HTMLDivElement | null>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  function measure() {
    const el = rail.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 2);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 2);
  }

  useEffect(() => {
    measure();
    const el = rail.current;
    if (!el) return;
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  function nudge(dir: 1 | -1) {
    const el = rail.current;
    if (!el) return;
    // Move by whole tiles rather than a fixed pixel count, so the snap points
    // stay aligned at every breakpoint.
    const tile = el.querySelector<HTMLElement>("[data-tile]");
    const step = tile ? tile.offsetWidth + 14 : Math.round(el.clientWidth * 0.8);
    el.scrollBy({ left: dir * step * 2, behavior: "smooth" });
  }

  if (!items.length) return null;
  const filled = items.filter((i) => i.filled).length;

  return (
    <section className="sf-pkcar" aria-label="What is in the pack">
      <div className="sf-pkcarhead">
        <h2>What is in the box</h2>
        <div className="sf-pkcarnav">
          <span className="sf-pkcarcount">
            {filled} items{items.length > filled ? ` · ${items.length - filled} slots still empty` : ""}
          </span>
          <button type="button" aria-label="Scroll left" onClick={() => nudge(-1)} disabled={atStart}>
            ‹
          </button>
          <button type="button" aria-label="Scroll right" onClick={() => nudge(1)} disabled={atEnd}>
            ›
          </button>
        </div>
      </div>

      <div className="sf-pkcarrail" ref={rail} onScroll={measure} tabIndex={0}>
        {items.map((it) => {
          const inner = (
            <>
              <div className="sf-pkcarimg">
                {it.image ? (
                  <img src={it.image} alt="" loading="lazy" />
                ) : (
                  <span className="sf-pkcarempty" aria-hidden="true">
                    {it.filled ? "—" : "□"}
                  </span>
                )}
                {it.qty > 1 ? <span className="sf-pkcarqty">{it.qty}&times;</span> : null}
              </div>
              <div className="sf-pkcarname">{it.name}</div>
              {!it.filled ? <div className="sf-pkcarslot">Not sourced yet</div> : null}
            </>
          );
          return it.slug ? (
            <Link className="sf-pkcartile" data-tile key={it.key} href={`/admin/site/catalogue/${it.slug}`}>
              {inner}
            </Link>
          ) : (
            <div className={`sf-pkcartile${it.filled ? "" : " empty"}`} data-tile key={it.key}>
              {inner}
            </div>
          );
        })}
      </div>
    </section>
  );
}
