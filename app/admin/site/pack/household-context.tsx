"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import {
  DEFAULT_ISO2,
  DEFAULT_PEOPLE,
  EU_BASELINE_LITRES,
  computeNumbers,
  type CountryGuidance,
  type FunnelNumbers,
} from "@/lib/pack-funnel";

/* The household choice is shared state because it has to reach three places
   that sit far apart on the page: the selector at the top, the country block
   under it, and the order block much further down. Lifting it into a context
   is what makes "it pre-sets the basket quantity" true of the REAL basket
   rather than only of the number on screen. */

type Ctx = {
  people: number;
  iso2: string;
  country: CountryGuidance | null;
  countries: CountryGuidance[];
  numbers: FunnelNumbers;
  /** the buy box's own quantity — seeded from the household, overridable */
  qty: number;
  setPeople: (n: number) => void;
  setIso2: (s: string) => void;
  setQty: (n: number) => void;
  /** whether the customer has touched the selector at all */
  touched: boolean;
  track: (event: "selector" | "reached_order" | "add_to_basket" | "lead") => void;
};

const HouseholdCtx = createContext<Ctx | null>(null);

export function useHousehold(): Ctx {
  const c = useContext(HouseholdCtx);
  if (!c) throw new Error("useHousehold outside HouseholdProvider");
  return c;
}

export function HouseholdProvider({
  countries,
  children,
}: {
  countries: CountryGuidance[];
  children: React.ReactNode;
}) {
  const [people, setPeopleRaw] = useState(DEFAULT_PEOPLE);
  const [iso2, setIso2Raw] = useState(DEFAULT_ISO2);
  const [touched, setTouched] = useState(false);
  // Seeded from the default household so the order block is already right for
  // someone who never touches the selector.
  const [qty, setQty] = useState(Math.ceil(DEFAULT_PEOPLE / 2));

  const country = useMemo(
    () => countries.find((c) => c.iso2 === iso2) ?? countries[0] ?? null,
    [countries, iso2]
  );
  const numbers = useMemo(
    () => computeNumbers(people, country?.litresPerPersonDay ?? EU_BASELINE_LITRES),
    [people, country]
  );

  /* Four events, fired once each per session where that makes sense. Failures
     are swallowed: instrumentation must never be able to break a sales page. */
  const sent = useRef<Record<string, boolean>>({});
  const track = useCallback(
    (event: Ctx["track"] extends (e: infer E) => void ? E : never) => {
      if (event === "reached_order") {
        if (sent.current.reached_order) return;
        sent.current.reached_order = true;
      }
      try {
        void fetch("/api/shop/funnel", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ event, country: iso2, people, packs: qty }),
          keepalive: true,
        }).catch(() => {});
      } catch {
        /* never breaks the page */
      }
    },
    [iso2, people, qty]
  );

  const setPeople = useCallback((n: number) => {
    setPeopleRaw(n);
    setTouched(true);
    // The whole point of the selector: the quantity follows the household into
    // the real basket, not just onto the screen.
    setQty(Math.ceil(n / 2));
  }, []);

  const setIso2 = useCallback((s: string) => {
    setIso2Raw(s);
    setTouched(true);
  }, []);

  const value: Ctx = {
    people, iso2, country, countries, numbers, qty,
    setPeople, setIso2, setQty, touched, track,
  };

  return <HouseholdCtx.Provider value={value}>{children}</HouseholdCtx.Provider>;
}
