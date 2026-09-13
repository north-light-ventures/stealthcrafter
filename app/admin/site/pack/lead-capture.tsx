"use client";

import { useState } from "react";
import { useHousehold } from "./household-context";

/* CATCHING THE ONES WHO DO NOT BUY.
 *
 * A readiness plan, not a discount code. Most people will not buy a deferrable
 * purchase on a first visit, and pretending otherwise loses the traffic.
 *
 * THIS IS PERSONAL DATA. The consent wording shown here is stored verbatim with
 * the row and its timestamp, so what someone agreed to is evidence rather than
 * a boolean. And it cannot send yet — transactional email is still a logged
 * stub — so the page says that in as many words instead of faking a send.
 */
export const CONSENT_TEXT =
  "I agree to StealthCrafter emailing me a readiness plan for my household, and warnings for my region. No marketing sequence. I can unsubscribe at any time.";

export default function LeadCapture() {
  const { people, iso2, country, track } = useHousehold();
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!consent) {
      setErr("Please tick the box so we have your consent on record.");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const r = await fetch("/api/shop/lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, people, country: iso2, consentText: CONSENT_TEXT, source: "pack-funnel" }),
      });
      const b = await r.json();
      if (b?.ok) {
        setDone(true);
        track("lead");
      } else setErr(b?.message || "We could not save that just now.");
    } catch {
      setErr("We could not reach us just now. Nothing has been lost.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="sf-lead">
      <div className="sf-leadbody">
        <span className="sf-leadkick">Not ready to buy</span>
        <h2>Then take the plan instead.</h2>
        <p>
          We will build a readiness plan for your exact household{country ? ` in ${country.name}` : ""} —
          free, no box required — and tell you when something is happening where you live.
        </p>

        {done ? (
          <div className="sf-leaddone">
            <strong>Saved.</strong> Your details are on file against{" "}
            {people} {people === 1 ? "person" : "people"}
            {country ? ` in ${country.name}` : ""}.
            <br />
            <span>
              And here is the honest part: <strong>we cannot email you yet.</strong> StealthCrafter has
              no transactional email provider connected — the send is still a stub in our own code. We
              have stored your consent and the date, nothing has been sent, and nothing will be until
              that is built properly. We would rather tell you that than show you a tick and do
              nothing.
            </span>
          </div>
        ) : (
          <form onSubmit={submit} className="sf-leadform">
            <label className="sf-cofield">
              <span>Email address</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </label>
            <label className="sf-leadconsent">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              <span>{CONSENT_TEXT}</span>
            </label>
            {err ? <div className="sf-coerr">{err}</div> : null}
            <button type="submit" className="sf-cta full" disabled={busy}>
              {busy ? "Saving…" : "Send my plan"}
            </button>
            <p className="sf-leadlawful">
              Lawful basis: consent (GDPR Art. 6(1)(a)). We store your email, household size, country
              and the words you just agreed to, with the date. Nothing can be sent yet — email is not
              connected — and every row carries an unsubscribe token from the moment it is created.
            </p>
          </form>
        )}
      </div>

      <ul className="sf-leadwhat">
        <li>Your household&rsquo;s real numbers — litres, calories, hours — on one page you can print.</li>
        <li>What your own government recommends, with the source.</li>
        <li>A warning when something official fires in your region. Nothing else.</li>
        <li>No sales sequence. If you buy later it will be because something changed, not because we nagged.</li>
      </ul>
    </section>
  );
}
