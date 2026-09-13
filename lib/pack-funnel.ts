// THE PACK FUNNEL — per-country guidance, live conditions, household arithmetic.
//
// Two rules shape this file.
//
// COUNTRY IS CHOSEN, NEVER INFERRED. Standing decision, 2026-08-25. Nothing here
// reads an IP, a CDN header or Accept-Language. The chooser asks, and the
// default is a stated default rather than a guess dressed as helpfulness.
//
// URGENCY IS REAL OR IT IS NOTHING. The alert counts are the true number of
// currently-active warnings from our own spine. There is no countdown, no
// "only N left", no viewer count, and there never will be on any StealthCrafter
// surface — a fake timer would cost more trust than it could earn in orders.

import { supabaseAdmin } from "./supabase";

export const EU_BASELINE_LITRES = 2;
export const KCAL_PER_PERSON_DAY = 2000;
export const DAYS = 3;
export const PEOPLE_PER_PACK = 2;

/** What a normal kitchen cupboard actually holds, and the basis of the
 *  "you run dry at" figure. Stated on the page, never implied. */
export const CUPBOARD_LITRES = 3;

export const PEOPLE_OPTIONS = [1, 2, 4, 6];
export const DEFAULT_ISO2 = "ES";
export const DEFAULT_PEOPLE = 2;

export type CountryGuidance = {
  iso2: string;
  name: string;
  litresPerPersonDay: number;
  authorityName: string | null;
  authoritySystem: string | null;
  guidance: string | null;
  citation: string | null;
  verified: boolean;
  /** live count of currently-active warnings in this country */
  activeAlerts: number;
  alertKinds: string[];
};

export type FunnelNumbers = {
  people: number;
  packs: number;
  litresPerPersonDay: number;
  waterLitres: number;
  foodKcal: number;
  dryHours: number;
};

/** All of it, on the client, with the arithmetic visible. No round-trip. */
export function computeNumbers(people: number, litresPerPersonDay: number): FunnelNumbers {
  const perDay = people * litresPerPersonDay;
  return {
    people,
    packs: Math.ceil(people / PEOPLE_PER_PACK),
    litresPerPersonDay,
    waterLitres: Math.round(perDay * DAYS * 10) / 10,
    foodKcal: people * KCAL_PER_PERSON_DAY * DAYS,
    // Hours before the cupboard runs out, assuming no way to treat more.
    dryHours: Math.max(1, Math.round((CUPBOARD_LITRES / perDay) * 24)),
  };
}

/* ---------------- live conditions ---------------- */

/* Cached in module memory. The alert spine sweeps on its own schedule and a
   count that is four minutes stale is still true enough for a sentence on a
   sales page — whereas a query per render is a query per visitor. The alerts
   table itself is NEVER shipped to the client; only these counts are. */
type Cache = { at: number; rows: Record<string, { count: number; kinds: string[] }>; total: number; countries: number };
let cache: Cache | null = null;
const TTL_MS = 4 * 60_000;

async function liveAlerts(): Promise<Cache> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache;
  const empty: Cache = { at: Date.now(), rows: {}, total: 0, countries: 0 };
  const sb = supabaseAdmin();
  if (!sb) return empty;
  try {
    const nowIso = new Date().toISOString();
    const rows: Record<string, { count: number; kinds: string[] }> = {};
    let total = 0;
    // Paged: PostgREST caps a page at 1,000 and there are more active than that.
    for (let from = 0; ; from += 1000) {
      const { data, error } = await sb
        .from("alerts")
        .select("country_iso2,kind,expires")
        .or(`expires.is.null,expires.gt.${nowIso}`)
        .range(from, from + 999);
      if (error) break;
      const batch = (data as any[]) || [];
      for (const a of batch) {
        const k = a.country_iso2;
        if (!k) continue;
        const r = (rows[k] ||= { count: 0, kinds: [] });
        r.count += 1;
        if (a.kind && !r.kinds.includes(a.kind)) r.kinds.push(a.kind);
        total += 1;
      }
      if (batch.length < 1000) break;
    }
    for (const k of Object.keys(rows)) rows[k].kinds.sort();
    cache = { at: Date.now(), rows, total, countries: Object.keys(rows).length };
    return cache;
  } catch {
    return empty;
  }
}

export type FunnelData = {
  countries: CountryGuidance[];
  totalActive: number;
  countriesWithAlerts: number;
  feedCount: number;
};

export async function getFunnelData(): Promise<FunnelData> {
  const sb = supabaseAdmin();
  const alerts = await liveAlerts();

  let feedCount = 0;
  let countries: CountryGuidance[] = [];
  if (sb) {
    try {
      const { count } = await sb
        .from("feeds")
        .select("id", { count: "exact", head: true })
        .eq("enabled", true);
      feedCount = count ?? 0;
    } catch {
      feedCount = 0;
    }
    try {
      const { data } = await sb
        .from("country_guidance")
        .select("*")
        .order("country_name", { ascending: true });
      countries = ((data as any[]) || []).map((c) => ({
        iso2: c.iso2,
        name: c.country_name,
        litresPerPersonDay: Number(c.litres_per_person_day ?? EU_BASELINE_LITRES),
        authorityName: c.authority_name ?? null,
        authoritySystem: c.authority_system ?? null,
        guidance: c.guidance ?? null,
        citation: c.citation ?? null,
        verified: Boolean(c.verified),
        activeAlerts: alerts.rows[c.iso2]?.count ?? 0,
        alertKinds: alerts.rows[c.iso2]?.kinds ?? [],
      }));
    } catch {
      countries = [];
    }
  }

  return {
    countries,
    totalActive: alerts.total,
    countriesWithAlerts: alerts.countries,
    feedCount,
  };
}

/** Readable list: "heat, storm, rain and snow". */
export function kindList(kinds: string[]): string {
  if (!kinds.length) return "";
  if (kinds.length === 1) return kinds[0];
  return kinds.slice(0, -1).join(", ") + " and " + kinds[kinds.length - 1];
}
