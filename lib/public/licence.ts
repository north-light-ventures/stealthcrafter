// THE LICENCE GATE.
//
// One rule, in one place, because it is the rule the public site cannot get
// wrong: alert CONTENT renders publicly only from a feed whose licence_state is
// 'clear'. Not 'pending' — pending means we have asked an authority for
// permission and they have not answered, and publishing while we wait is the
// thing we would be asking permission for. Not 'unknown', not 'blocked'.
//
// Note the distinction this file keeps and the rest of the site must keep too:
//
//   * ALERT CONTENT — what an authority is currently saying — is gated.
//   * THE REGISTER — that an authority exists, what its system is called,
//     whether it is machine-readable, whether we carry it — is OUR research in
//     OUR words, and is not licensed from anyone. /countries is built from the
//     register and is therefore publishable in full.
//
// Confusing those two would either strip the country pages to nothing or leak
// unlicensed content onto them. They are different things.

import { supabaseAdmin } from "../supabase";

/** The only licence state whose CONTENT may appear on a public page. */
export const PUBLIC_LICENCE_STATES = ["clear"] as const;

export type PublicFeed = {
  id: string;
  countryIso2: string | null;
  kind: string;
  authority: string;
  attribution: string | null;
  licence: string | null;
  lastStatus: string | null;
  lastSuccessAt: string | null;
};

/** Every feed cleared for public rendering. Deliberately the only way the
    public pages are allowed to learn which feeds exist for content purposes. */
export async function publicFeeds(): Promise<PublicFeed[]> {
  const sb = supabaseAdmin();
  if (!sb) return [];
  const { data } = await sb
    .from("feeds")
    .select("id, country_iso2, kind, authority, attribution, licence, licence_state, enabled, last_status, last_success_at")
    .eq("enabled", true)
    .in("licence_state", PUBLIC_LICENCE_STATES as unknown as string[])
    .order("country_iso2", { ascending: true });

  return ((data as any[]) || []).map((f) => ({
    id: f.id,
    countryIso2: f.country_iso2,
    kind: f.kind,
    authority: f.authority,
    attribution: f.attribution,
    licence: f.licence,
    lastStatus: f.last_status,
    lastSuccessAt: f.last_success_at,
  }));
}

/** The same gate applied to a set of feed ids already in hand. */
export function isPublicFeedId(id: string, cleared: PublicFeed[]): boolean {
  return cleared.some((f) => f.id === id);
}

/* ---------------- Meteoalarm ----------------
   EUMETNET's terms attach five conditions the moment anything of theirs is
   public. They are not advisory and they are not "credit us somewhere": each
   one is a condition of the licence, so the honest implementation is a gate
   that refuses to render rather than a template we hope someone filled in.

   Nothing of Meteoalarm's is cleared today, so this does not fire. It is built
   now because the failure mode — their licence lands, the feed flips to clear,
   and the page starts rendering without the block — is silent. */

export type MeteoalarmContext = {
  /** The national meteorological service, required on a single-country surface. */
  nationalService?: string | null;
  /** The issue time carried from the alert itself, not our fetch time. */
  issuedAt?: string | null;
  /** True when the surface shows more than one country. */
  multiCountry: boolean;
};

export const METEOALARM_DISCLAIMER =
  "Please note that the information displayed here may be delayed. " +
  "For the most up-to-date information, always consult the website of the " +
  "national meteorological service.";

export const METEOALARM_CREDIT = "EUMETNET – MeteoAlarm";
export const METEOALARM_HREF = "https://www.meteoalarm.org";

/** Every condition that must hold before a Meteoalarm alert may be shown.
    Returns the reasons it may NOT be shown; an empty array means it may. */
export function meteoalarmBlockers(ctx: MeteoalarmContext): string[] {
  const missing: string[] = [];
  if (!ctx.multiCountry && !ctx.nationalService) {
    missing.push("the national meteorological service is not named");
  }
  if (!ctx.issuedAt) {
    missing.push("the time of issue is not carried");
  }
  return missing;
}

export function canRenderMeteoalarm(ctx: MeteoalarmContext): boolean {
  return meteoalarmBlockers(ctx).length === 0;
}

/** True when this feed is Meteoalarm's and therefore subject to the above. */
export function isMeteoalarm(f: { id: string; authority: string }): boolean {
  return /meteoalarm|eumetnet/i.test(f.id) || /meteoalarm|eumetnet/i.test(f.authority);
}
