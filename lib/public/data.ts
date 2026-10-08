// The public site's reads. Small, cached where it is safe, and separate from
// the gated storefront's data layer so a change there cannot quietly widen what
// the public site shows.

import { supabaseAdmin } from "../supabase";
import { buildCountryRows, registerTotals, type CountryRow, type RegisterTotals } from "./register";

/** Which feeds the DATABASE has switched on — the registry records intent, this
    records fact, and the public pages must describe fact. */
export async function enabledFeedIds(): Promise<Set<string>> {
  const sb = supabaseAdmin();
  if (!sb) return new Set();
  const out = new Set<string>();
  // PostgREST caps a page at 1,000 rows and the register is over 400 today and
  // growing, so this pages rather than assuming one response is the whole set.
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await sb
      .from("feeds")
      .select("id")
      .eq("enabled", true)
      .range(from, from + PAGE - 1);
    if (error || !data || !data.length) break;
    for (const r of data as any[]) out.add(r.id);
    if (data.length < PAGE) break;
  }
  return out;
}

export async function getRegister(): Promise<{ rows: CountryRow[]; totals: RegisterTotals }> {
  const rows = buildCountryRows(await enabledFeedIds());
  return { rows, totals: registerTotals(rows) };
}

/* ---------------- guidance ----------------
   ATTRIBUTED RELAY, NOT OUR ADVICE. Every field here belongs to a named
   authority and is shown as theirs. The `verified` flag is the whole point of
   the type: an unverified row has an authority and a system name and the EU
   baseline figure, and does NOT have that government's own words. The page must
   be able to tell those two apart, so the type keeps them apart. */

export type GuidanceRow = {
  iso2: string;
  country: string;
  authority: string | null;
  system: string | null;
  litresPerPersonDay: number | null;
  /** The authority's own guidance. Empty when we have not captured it yet. */
  guidance: string;
  citation: string | null;
  verified: boolean;
  verifiedAt: string | null;
};

export async function getGuidance(): Promise<GuidanceRow[]> {
  const sb = supabaseAdmin();
  if (!sb) return [];
  const { data } = await sb
    .from("country_guidance")
    .select("iso2, country_name, authority_name, authority_system, litres_per_person_day, guidance, citation, verified, verified_at")
    .order("verified", { ascending: false })
    .order("country_name", { ascending: true });

  return ((data as any[]) || []).map((r) => ({
    iso2: r.iso2,
    country: r.country_name,
    authority: r.authority_name,
    system: r.authority_system,
    litresPerPersonDay: r.litres_per_person_day === null ? null : Number(r.litres_per_person_day),
    guidance: (r.guidance || "").trim(),
    citation: r.citation,
    verified: Boolean(r.verified),
    verifiedAt: r.verified_at,
  }));
}
