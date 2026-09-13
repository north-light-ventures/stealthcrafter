"use client";

import { useEffect, useRef } from "react";
import CountUp from "./count-up";
import DryGauge from "./dry-gauge";
import { CUPBOARD_LITRES, DAYS, KCAL_PER_PERSON_DAY, PEOPLE_OPTIONS } from "@/lib/pack-funnel";
import { useHousehold } from "./household-context";

/* THE CONVERSION MECHANISM, not decoration.
 *
 * It costs the visitor nothing, it is the first micro-commitment, and every
 * number below it changes when they touch it. It sits above the fold, it works
 * with no account and no round-trip, and it renders fully on load so nothing
 * waits on interaction.
 *
 * Country is CHOSEN. We do not geolocate — no IP lookup, no Accept-Language,
 * no CDN header. Standing decision, and the honest version of "helpful".
 */
export default function HouseholdSelector() {
  const { people, iso2, countries, country, numbers, setPeople, setIso2, track } = useHousehold();
  const first = useRef(true);

  useEffect(() => {
    // Do not count the initial render as an interaction.
    if (first.current) {
      first.current = true;
      return;
    }
  }, []);

  function choosePeople(n: number) {
    if (n === people) return;
    setPeople(n);
    track("selector");
  }
  function chooseCountry(v: string) {
    if (v === iso2) return;
    setIso2(v);
    track("selector");
  }

  return (
    <section className="sf-hhsel" aria-label="Your household">
      <div className="sf-hhinputs">
        <div className="sf-hhfield">
          <span className="sf-hhlabel">People at home</span>
          <div className="sf-hhchips" role="group" aria-label="People at home">
            {PEOPLE_OPTIONS.map((n) => (
              <button
                key={n}
                type="button"
                className={n === people ? "on" : ""}
                aria-pressed={n === people}
                onClick={() => choosePeople(n)}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className="sf-hhfield">
          <span className="sf-hhlabel">Where you live</span>
          <select value={iso2} onChange={(e) => chooseCountry(e.target.value)} aria-label="Where you live">
            {countries.map((c) => (
              <option key={c.iso2} value={c.iso2}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="sf-hhout">
        {/* The arc is the argument: its length IS hours ÷ 72, so the gap between
            the sweep and the full ring is the shortfall drawn to scale. */}
        <div className="sf-hhcard alarm gauge">
          <span className="sf-hhk">Without this, you run dry at</span>
          <DryGauge hours={numbers.dryHours} target={DAYS * 24} />
          <span className="sf-hhsub">
            Against the {DAYS * 24} your government asks for — the unfilled part of that ring is the
            gap.
          </span>
        </div>
        <div className="sf-hhcard">
          <span className="sf-hhk">Water you need</span>
          <strong>
            <CountUp value={numbers.waterLitres} decimals={numbers.waterLitres % 1 ? 1 : 0} /> litres
          </strong>
          <span className="sf-hhsub">
            {numbers.litresPerPersonDay} L per person per day, for {DAYS} days.
          </span>
        </div>
        <div className="sf-hhcard">
          <span className="sf-hhk">Food you need</span>
          <strong>
            <CountUp value={numbers.foodKcal} /> kcal
          </strong>
          <span className="sf-hhsub">
            {KCAL_PER_PERSON_DAY.toLocaleString("en-GB")} kcal per person per day. No cooking, because
            there may be no power.
          </span>
        </div>
        <div className="sf-hhcard packs">
          <span className="sf-hhk">Packs for your household</span>
          <strong>
            <CountUp value={numbers.packs} />
          </strong>
          {/* One box per two people, drawn. Four boxes is more immediate than
              the numeral 2 and it is the same fact. */}
          <div className="sf-hhboxes" aria-hidden="true">
            {Array.from({ length: Math.min(numbers.packs, 10) }).map((_, i) => (
              <span key={i} style={{ animationDelay: `${i * 70}ms` }} />
            ))}
          </div>
          <span className="sf-hhsub">Each pack covers two people for the full three days.</span>
        </div>
      </div>

      <p className="sf-hhassume">
        The countdown assumes what a normal home actually has: roughly {CUPBOARD_LITRES} litres of
        bottled water in a cupboard, and no way to make more drinkable — {CUPBOARD_LITRES} L ÷ (
        {people} × {numbers.litresPerPersonDay} L a day) × 24. It is an estimate, and we show you the
        arithmetic rather than a scary number with nothing behind it.
        {country && !country.verified ? (
          <>
            {" "}
            {country.name} uses the EU baseline of {numbers.litresPerPersonDay} L a day because we
            have not yet verified its national figure — see below.
          </>
        ) : null}
      </p>
    </section>
  );
}
