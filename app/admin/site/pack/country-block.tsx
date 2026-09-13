"use client";

import { kindList } from "@/lib/pack-funnel";
import { useHousehold } from "./household-context";

/* WHAT YOUR OWN GOVERNMENT ASKS, and what is actually happening there today.
 *
 * This is the country difference carried by the PAGE rather than by a second
 * SKU — the box does not change, the argument does.
 *
 * The quiet case gets the stronger argument, deliberately. A country with no
 * active warnings is not a country with nothing to say: it is the only kind of
 * day on which anybody has ever successfully prepared for the other kind. */
export default function CountryBlock({ feedCount }: { feedCount: number }) {
  const { country } = useHousehold();
  if (!country) return null;

  const n = country.activeAlerts;

  return (
    <section className="sf-cbl">
      <div className="sf-cblguide">
        <h2>What {country.name} tells you to keep</h2>
        <p className="sf-cbllede">
          We are not the ones asking you to do this. Your own civil-protection agency already is — we
          just make it one box instead of eleven errands.
        </p>

        {country.verified && country.guidance ? (
          <>
            <blockquote>{country.guidance}</blockquote>
            <p className="sf-cblcite">
              {country.authorityName}
              {country.authoritySystem ? ` · ${country.authoritySystem}` : ""}
              {country.citation ? ` — ${country.citation}` : ""}
            </p>
          </>
        ) : (
          <>
            <p className="sf-cblunver">
              {country.name}&rsquo;s own household figure is not something we have verified yet, so
              this page uses the EU baseline of two litres per person per day rather than quoting a
              number at you that nobody here has checked.{" "}
              {country.authorityName ? (
                <>
                  The authority to read is <strong>{country.authorityName}</strong>
                  {country.authoritySystem ? ` (${country.authoritySystem})` : ""} — we carry their
                  warnings on this site already.
                </>
              ) : null}
            </p>
            <p className="sf-cblcite">
              Unverified — EU baseline in use. We would rather say that than invent a quotation.
            </p>
          </>
        )}
      </div>

      <div className={`sf-cbllive${n === 0 ? " quiet" : ""}`}>
        {n > 0 ? (
          <>
            <strong>{n.toLocaleString("en-GB")}</strong>
            <p>
              public-safety warnings are active in {country.name} as you read this
              {country.alertKinds.length ? <> — {kindList(country.alertKinds)} among them</> : null}. We
              watch {feedCount} official feeds across Europe so you do not have to.
            </p>
          </>
        ) : (
          <>
            <strong>Nothing</strong>
            <p>
              is happening in {country.name} right now. No warnings are active, the shops are full and
              nothing is urgent — which is the only kind of day on which anyone has ever successfully
              prepared for the other kind. Nobody assembles this on the day they need it, because on
              that day the shelves are already empty. We watch {feedCount} official feeds and we will
              tell you when that changes.
            </p>
          </>
        )}
      </div>
    </section>
  );
}
