"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useHousehold } from "./household-context";

/* THE ORDER BLOCK.
 *
 * The quantity is not a stepper that happens to sit next to a button — it
 * arrives already correct, seeded by the household selector at the top of the
 * page, and it is the same number that reaches the real basket. Someone who set
 * "6 people" and scrolled here finds three packs waiting, not one.
 */
export default function PackBuy({
  productId,
  price,
  currency,
  isPlaceholder,
}: {
  productId: string;
  price: number | null;
  currency: string;
  isPlaceholder: boolean;
}) {
  const router = useRouter();
  const { qty, setQty, numbers, people, touched, track } = useHousehold();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState(false);
  const box = useRef<HTMLDivElement | null>(null);

  /* Scroll depth to the order block — one of the four things we measure. An
     observer rather than a scroll handler, so it costs nothing while idle. */
  useEffect(() => {
    const el = box.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          track("reached_order");
          io.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [track]);

  const money = (n: number) => `${currency === "GBP" ? "£" : "€"}${n.toFixed(2)}`;

  async function add() {
    setBusy(true);
    setMsg("");
    setErr(false);
    try {
      const r = await fetch("/api/shop/basket", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "add", ref: productId, qty }),
      });
      const b = await r.json();
      if (b?.ok) {
        setMsg(b.message || "Added to your basket.");
        track("add_to_basket");
        router.refresh();
      } else {
        setErr(true);
        setMsg(b?.message || "We could not add that just now.");
      }
    } catch {
      setErr(true);
      setMsg("We could not reach the basket just now. Nothing has been lost.");
    } finally {
      setBusy(false);
    }
  }

  const covers = qty * 2;
  const short = covers < people;

  return (
    <div className="sf-pkbuy" ref={box}>
      <div className="sf-pkprice">
        <strong>{price === null ? "€ ——" : money(price * qty)}</strong>
        {isPlaceholder ? <span className="sf-pktest">Test price</span> : null}
        {qty > 1 && price !== null ? <span className="sf-pkeach">{money(price)} each</span> : null}
      </div>

      <div className="sf-pkqtyrow">
        <span className="sf-pkqtylabel">How many?</span>
        <div className="sf-pkqty">
          <button type="button" aria-label="Fewer" onClick={() => setQty(Math.max(1, qty - 1))} disabled={qty <= 1}>
            −
          </button>
          <span>{qty}</span>
          <button type="button" aria-label="More" onClick={() => setQty(Math.min(20, qty + 1))}>
            +
          </button>
        </div>
        <span className="sf-pkqtyhint">
          {touched ? (
            <>
              Set from your household above — {people} {people === 1 ? "person" : "people"} needs{" "}
              {numbers.packs} {numbers.packs === 1 ? "pack" : "packs"}.
            </>
          ) : (
            <>One pack covers two people for seventy-two hours.</>
          )}
          {short ? (
            <>
              {" "}
              <em>
                At {qty}, this covers {covers} of your {people}.
              </em>
            </>
          ) : null}
        </span>
      </div>

      <button type="button" className="sf-cta full" onClick={add} disabled={busy || price === null}>
        {busy ? "Adding…" : `Add ${qty === 1 ? "the pack" : `${qty} packs`} to basket`}
      </button>

      {msg ? <div className={`sf-pkmsg${err ? " bad" : ""}`}>{msg}</div> : null}

      <ul className="sf-pkassure">
        <li>Five-year shelf life</li>
        <li>Ships as an ordinary parcel</li>
        <li>Every item evidenced</li>
      </ul>

      {isPlaceholder ? (
        <p className="sf-pkdemo">
          <strong>€149 is a test figure, not the price.</strong> The real number is not set: it waits
          on genuine trade terms across all twenty-one lines. Nothing here takes money — checkout
          completes against a demo payment step.
        </p>
      ) : null}

      <div className="sf-pklinks">
        <Link href="/admin/site/basket">View basket</Link>
        <Link href="/admin/site/kit-builder">Check it against your household →</Link>
      </div>
    </div>
  );
}
