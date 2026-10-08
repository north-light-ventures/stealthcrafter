import type { Metadata } from "next";
import Link from "next/link";
import { publicFeeds, isMeteoalarm, METEOALARM_CREDIT, METEOALARM_HREF, METEOALARM_DISCLAIMER } from "@/lib/public/licence";
import { supabaseAdmin } from "@/lib/supabase";
import { countryName } from "@/lib/iso-ids";
import { registryStats } from "@/lib/feeds/registry";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Where this comes from · StealthCrafter",
  description:
    "Every feed, authority and licence behind this site, with the state of each permission. Several of these licences require attribution as a condition of use.",
  robots: { index: true, follow: true },
};

/* SOURCES — the proof page, and a licence condition.
 *
 * Two jobs, and the first is not optional: CC BY 4.0, OGL and the Meteoalarm
 * terms all require attribution as a condition of use. For a period this site
 * displayed EMSC, GDACS and EFFIS data with no credit visible anywhere. That
 * was a defect, not a style choice, and this page is the fix.
 *
 * The second job is the argument for the whole business. Nobody else selling
 * preparedness equipment can publish this page, because publishing it means
 * publishing what you have NOT got permission for.
 */
export default async function SourcesPage() {
  const cleared = await publicFeeds();
  const stats = registryStats();

  // The pending set is named but NOT rendered as content — the distinction the
  // page is making. Counting them is honest; quoting them would not be.
  const sb = supabaseAdmin();
  let pendingCount = 0;
  let blockedCount = 0;
  if (sb) {
    const [{ count: p }, { count: b }] = await Promise.all([
      sb.from("feeds").select("id", { count: "exact", head: true }).eq("licence_state", "pending"),
      sb.from("feeds").select("id", { count: "exact", head: true }).eq("licence_state", "blocked"),
    ]);
    pendingCount = p || 0;
    blockedCount = b || 0;
  }

  const byCountry = new Map<string, typeof cleared>();
  for (const f of cleared) {
    const k = f.countryIso2 || "EU";
    if (!byCountry.has(k)) byCountry.set(k, []);
    byCountry.get(k)!.push(f);
  }
  const meteo = cleared.filter(isMeteoalarm);

  return (
    <div className="pb-page">
      <header className="pb-head">
        <span className="pb-kicker">Provenance</span>
        <h1>Where this comes from</h1>
        <p className="pb-lede">
          Everything this site shows about current conditions is a record published by a named public
          authority, carried under a licence we can point at. We classify how much a household should
          care; we never restate our reading as theirs, and we never fill a gap with an estimate.
        </p>
      </header>

      <section className="pb-figs" aria-label="Permissions in figures">
        <div className="pb-fig">
          <b>{cleared.length}</b>
          <span>feeds cleared and carried</span>
        </div>
        <div className="pb-fig">
          <b>{pendingCount}</b>
          <span>awaiting an authority&rsquo;s answer</span>
        </div>
        <div className="pb-fig">
          <b>{blockedCount}</b>
          <span>whose terms refuse us</span>
        </div>
        <div className="pb-fig">
          <b>{stats.total}</b>
          <span>registered and researched</span>
        </div>
      </section>

      <p className="pb-note">
        Only the first column appears anywhere on this site. A feed whose licence is{" "}
        <strong>pending</strong> is one where we have written to the authority and not yet had an
        answer — so we are not carrying it, because publishing while we wait is the very thing we
        asked permission for. A feed whose terms <strong>refuse</strong> us is not ingested at all.
      </p>

      {cleared.length === 0 ? (
        <p className="pb-empty">No feed is currently cleared for public display.</p>
      ) : (
        [...byCountry.entries()].map(([iso2, rows]) => (
          <section className="pb-ssec" key={iso2}>
            <h2>{iso2 === "EU" ? "Pan-European" : countryName(iso2) || iso2}</h2>
            <div className="pb-sgrid">
              {rows.map((f) => (
                <article className="pb-scard" key={f.id}>
                  <div className="pb-stop">
                    <strong>{f.authority}</strong>
                    <span className="pb-skind">{f.kind.replace(/-/g, " ")}</span>
                  </div>
                  {f.attribution ? <p className="pb-scredit">{f.attribution}</p> : null}
                  {f.licence ? <p className="pb-slic">{f.licence.slice(0, 400)}</p> : null}
                  <span className="pb-smeta">
                    {f.lastSuccessAt
                      ? `Last read ${new Date(f.lastSuccessAt).toLocaleString("en-GB")}`
                      : "Not yet read"}
                  </span>
                </article>
              ))}
            </div>
          </section>
        ))
      )}

      {/* EUMETNET's conditions attach the moment anything of theirs is public.
          Nothing of Meteoalarm's is cleared today, so this does not render —
          but it renders automatically the moment one is, rather than waiting
          for somebody to remember. */}
      {meteo.length ? (
        <section className="pb-ssec pb-meteo">
          <h2>{METEOALARM_CREDIT}</h2>
          <p className="pb-scredit">
            Severe-weather warnings relayed via {METEOALARM_CREDIT}.{" "}
            <a href={METEOALARM_HREF} target="_blank" rel="noreferrer noopener">
              meteoalarm.org
            </a>
          </p>
          <p className="pb-slic">{METEOALARM_DISCLAIMER}</p>
        </section>
      ) : null}

      <footer className="pb-sfoot">
        <p>
          Severity levels on this site are StealthCrafter&rsquo;s reading of published figures, not
          an official alert. Where an authority states its own level or advice, we show that too, in
          their words. In an emergency, follow them, not us.
        </p>
        <p>
          <Link href="/countries">See what each country&rsquo;s system is →</Link>
        </p>
      </footer>
    </div>
  );
}
