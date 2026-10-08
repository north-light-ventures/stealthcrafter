"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/* The picker is a CHOICE, not a guess.
 *
 * We do not geolocate: no IP lookup, no Accept-Language, no CDN header. That is
 * a standing decision on this project and it is the honest version of
 * "helpful" — a site about what your own government will do is a bad place to
 * tell someone where they live.
 *
 * It degrades to a plain form that works with no JavaScript, because the first
 * thing a visitor does here is the one thing that must not depend on a bundle.
 */
export default function CountryPicker({
  countries,
}: {
  countries: { iso2: string; name: string }[];
}) {
  const router = useRouter();
  const [iso2, setIso2] = useState("");

  return (
    <form
      className="pb-picker"
      action="/countries"
      onSubmit={(e) => {
        e.preventDefault();
        router.push(iso2 ? `/countries#${iso2}` : "/countries");
      }}
    >
      <label htmlFor="pb-country">Where do you live?</label>
      <div className="pb-pickrow">
        <select
          id="pb-country"
          name="iso2"
          value={iso2}
          onChange={(e) => setIso2(e.target.value)}
        >
          <option value="">Choose a country…</option>
          {countries.map((c) => (
            <option key={c.iso2} value={c.iso2}>
              {c.name}
            </option>
          ))}
        </select>
        <button type="submit">Show me</button>
      </div>
      <p className="pb-pickhint">
        We never guess this from your connection. Nothing you choose here is stored or sent anywhere.
      </p>
    </form>
  );
}
