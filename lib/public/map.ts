// THE PUBLIC MAP'S DATA.
//
// WHY THERE IS NO SATELLITE BASEMAP HERE.
//
// The gated home at /admin/site/home draws live conditions over Esri World
// Imagery, pulled keyless from services.arcgisonline.com. That was the right
// call for a password-gated demo and the file that does it says so in its own
// comment: "At public launch this one entry becomes a licensed provider."
// We do not have that licence, and this is now a public commercial site, so
// those tiles do not come with us. That is not a downgrade forced on us — see
// below.
//
// WHAT THIS MAP IS INSTEAD.
//
// The public home's subject is not "what is happening right now". It is "what
// warns you, where you live". The right picture of that is a choropleth of the
// REGISTER: every country in Europe filled by whether anyone can read its
// civil-protection feed. Satellite imagery would be decoration behind that
// question; this answers it at a glance, and it answers it from geometry we
// ship ourselves.
//
// So: our own 110m outlines, our own research, no external request, no key, no
// account, nothing to licence. It also means the map works on day one rather
// than waiting on a procurement decision.

import { getEuroGeo } from "../euro-geo";
import { buildCountryRows, COVERAGE_GLYPH, COVERAGE_WORD, type CoverageState } from "./register";
import { enabledFeedIds } from "./data";
import { OI } from "../palette";

/* Okabe-Ito, and the standing rule with it: colour is NEVER the only signal.
   Every country also carries its state GLYPH as a map label, the word in its
   tooltip, and a row in the table below with both. A reader who sees no colour
   at all still gets the full answer. The ramp also moves in lightness, so it
   survives being seen as a single hue. */
export const STATE_FILL: Record<CoverageState, string> = {
  reporting: OI.bluishGreen,
  "built-not-on": OI.orange,
  "not-machine-readable": "#51657c",
  "nothing-found": "#2b3a4c",
};

export type MapFeatureProps = {
  iso2: string;
  name: string;
  state: CoverageState;
  glyph: string;
  word: string;
  system: string | null;
  why: string;
};

export type PublicMap = {
  fc: GeoJSON.FeatureCollection;
  bounds: Record<string, [number, number, number, number]>;
  /** Countries drawn but outside the register — neighbours that share the
      frame. They are rendered as context, never as a coverage state, because
      we have not researched them and a grey country that looks like "nothing
      found" would be a claim we have not earned. */
  unresearched: string[];
};

export async function getPublicMap(): Promise<PublicMap> {
  const geo = getEuroGeo();
  const rows = buildCountryRows(await enabledFeedIds());
  const byIso = new Map(rows.map((r) => [r.iso2, r]));

  const features: GeoJSON.Feature[] = [];
  const unresearched: string[] = [];

  for (const f of geo.fc.features) {
    const iso2 = (f.properties as any)?.iso2 as string;
    const row = byIso.get(iso2);
    if (!row) {
      unresearched.push(iso2);
      features.push({
        ...f,
        properties: { ...(f.properties as any), researched: false },
      });
      continue;
    }
    const props: MapFeatureProps & { researched: true } = {
      researched: true,
      iso2,
      name: row.name,
      state: row.state,
      glyph: COVERAGE_GLYPH[row.state],
      word: COVERAGE_WORD[row.state],
      system: row.system,
      why: row.why,
    };
    features.push({ ...f, properties: props as any });
  }

  return {
    fc: { type: "FeatureCollection", features },
    bounds: geo.bounds,
    unresearched: unresearched.sort(),
  };
}
