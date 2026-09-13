"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

/* Quantity is how a household scales — one pack per two people — so the control
   is a first-class part of the buy box rather than a stepper hidden next to the
   button. A family of four buys two, and the page should make that obvious
   before anyone has to work it out. */
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
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState(false);

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

  return (
    <div className="sf-pkbuy">
      <div className="sf-pkprice">
        <strong>{price === null ? "€ ——" : money(price * qty)}</strong>
        {qty > 1 && price !== null ? <span className="sf-pkeach">{money(price)} each</span> : null}
      </div>

      <div className="sf-pkqtyrow">
        <span className="sf-pkqtylabel">How many?</span>
        <div className="sf-pkqty">
          <button type="button" aria-label="Fewer" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1}>
            −
          </button>
          <span>{qty}</span>
          <button type="button" aria-label="More" onClick={() => setQty((q) => Math.min(20, q + 1))}>
            +
          </button>
        </div>
        <span className="sf-pkqtyhint">
          One pack covers two people. {qty === 1 ? "Two of you? One is enough." : `That is ${qty * 2} people.`}
        </span>
      </div>

      <button type="button" className="sf-cta full" onClick={add} disabled={busy || price === null}>
        {busy ? "Adding…" : `Add ${qty === 1 ? "the pack" : `${qty} packs`} to basket`}
      </button>

      {msg ? <div className={`sf-pkmsg${err ? " bad" : ""}`}>{msg}</div> : null}

      {isPlaceholder ? (
        <p className="sf-pkdemo">
          <strong>This is a demo price, not the real one.</strong> The number is not set: it waits on
          genuine trade terms across all twenty-one lines. Competitor 72-hour kits retail between
          €80 and €200. Nothing here takes money — checkout completes against a demo payment step.
        </p>
      ) : null}

      <div className="sf-pklinks">
        <Link href="/admin/site/basket">View basket</Link>
        <Link href="/admin/site/kit-builder">Check it against your household →</Link>
      </div>
    </div>
  );
}
