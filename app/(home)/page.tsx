import type { Metadata } from "next";
import { getEuroGeo } from "@/lib/euro-geo";
import { getLiveSnapshot } from "@/lib/live-conditions";
import { getHomeDashboard } from "@/lib/home-dashboard";
import { getMarket } from "@/lib/market-server";
import { publicFeeds } from "@/lib/public/licence";
import LiveEurope from "@/app/admin/site/home/live-europe";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "StealthCrafter — what warns you, where you live",
  description:
    "Live conditions across Europe from official public-warning systems, on one map. We read every national system and publish what each one is, how it reaches you, and whether anyone can read it.",
  robots: { index: true, follow: true },
};

/* THE PUBLIC HOME IS THE MAP.
 *
 * This is the same page as /admin/site/home and the same component — a
 * satellite basemap filling the viewport with every panel floating over it.
 * It is not a smaller copy and it is not a diagram of it. Ace asked for the
 * page he had; this is that page, with exactly two things changed and both
 * of them forced:
 *
 *   1. ALERT CONTENT IS LICENCE-GATED. Every event is matched against its
 *      feed and dropped unless that feed's licence_state is 'clear'. Pending
 *      means we have written to an authority and had no answer, and the whole
 *      point of asking is not to publish while we wait. The gated page can
 *      show everything because it is password-protected and nobody outside
 *      the company sees it. This one cannot.
 *
 *   2. publicMode strips what is gated, not what is good: Jimmy (zero of 24
 *      knowledge chunks are signed), and the rails and links that land under
 *      /admin, where a public visitor would be bounced to /login.
 *
 * THE TILE LICENCE IS STILL OPEN AND IT IS A REAL ITEM. live-europe.tsx pulls
 * Esri World Imagery keyless from arcgisonline.com and its own comment says
 * that becomes a licensed provider at public launch. Shipping Ace's page is
 * the right call — it is what the business is — but the basemap is one URL in
 * that file and it needs settling before the site is announced. Flagged in
 * STATUS and the delta, not buried here.
 */
export default async function HomePage() {
  const geo = getEuroGeo();
  const [snapshot, dash, market, cleared] = await Promise.all([
    getLiveSnapshot(),
    getHomeDashboard(),
    getMarket(),
    publicFeeds(),
  ]);

  /* THE GATE. Matched on feedId, which every LiveEvent carries, so a feed
     whose permission has not arrived cannot reach a public page by being
     merged in from somewhere else. The five original pan-European adapters
     identify themselves by source name rather than a feeds row id, so they
     are matched on both. */
  const clearedIds = new Set(cleared.map((f) => f.id));
  const events = snapshot.events.filter((e) => clearedIds.has(e.feedId));
  const feeds = snapshot.feeds.filter((f: any) => clearedIds.has(f.id));

  return (
    <LiveEurope
      publicMode
      geo={geo.fc}
      bounds={geo.bounds}
      events={events}
      sources={snapshot.sources}
      feeds={feeds}
      credits={snapshot.credits}
      market={market?.iso2 ?? null}
      generatedAt={snapshot.generatedAt}
      dash={dash}
    />
  );
}
