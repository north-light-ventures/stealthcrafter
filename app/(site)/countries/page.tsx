import type { Metadata } from "next";
import { getRegister } from "@/lib/public/data";
import { COVERAGE_GLYPH, COVERAGE_WORD, type CoverageState } from "@/lib/public/register";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Every public-warning system in Europe · StealthCrafter",
  description:
    "For each of Europe's countries: the name of its public-warning system, the channel it reaches people on, whether it is machine-readable, and whether we carry it.",
  robots: { index: true, follow: true },
};

/* BY COUNTRY — the strongest page we have, and it is already researched.
 *
 * This is our own register in our own words, so none of it is licence-gated.
 * That distinction matters: the alerts an authority is currently issuing are
 * their content and are gated; the fact that the authority exists, what its
 * system is called and whether it is readable is our research. Gating the
 * second because the first is gated would strip this page to nothing for no
 * reason.
 *
 * The counts are computed from the register on every request. The brief that
 * commissioned the page quoted a figure that the register no longer agrees
 * with; a number typed into a page is a number that goes stale in silence.
 */
export default async function CountriesPage() {
  const { rows, totals } = await getRegister();

  const byState = (s: CoverageState) => rows.filter((r) => r.state === s);
  const order: CoverageState[] = ["reporting", "built-not-on", "not-machine-readable", "nothing-found"];

  return (
    <div className="pb-page">
      <header className="pb-head">
        <span className="pb-kicker">The register</span>
        <h1>What warns you, where you live</h1>
        <p className="pb-lede">
          Most European states warn their citizens by cell broadcast — the government pushes a
          message straight to every handset in an area, and there is nothing for anyone to subscribe
          to. That is not a hole in our coverage to be papered over. It is the single most useful
          thing we can tell you, because it means the channel your government will actually use is
          the emergency-alerts setting on your own phone.
        </p>
      </header>

      <section className="pb-figs" aria-label="Coverage in figures">
        <div className="pb-fig">
          <b>{totals.countries}</b>
          <span>countries researched</span>
        </div>
        <div className="pb-fig">
          <b>{totals.noMachineReadable}</b>
          <span>with no machine-readable civil-protection feed at all</span>
        </div>
        <div className="pb-fig">
          <b>{totals.machineReadable}</b>
          <span>where one exists</span>
        </div>
        <div className="pb-fig">
          <b>{totals.carried}</b>
          <span>we carry today</span>
        </div>
      </section>

      <p className="pb-note">
        Four states, and we publish all four. &ldquo;Built, not switched on&rdquo; names its own
        reason — usually that we have asked an authority for permission to carry their data and are
        waiting for an answer. We would rather show you an empty row with a reason than a full one
        without.
      </p>

      <div className="pb-key" role="list" aria-label="Key">
        {order.map((s) => (
          <span className={`pb-keyitem st-${s}`} role="listitem" key={s}>
            <span aria-hidden="true">{COVERAGE_GLYPH[s]}</span>
            {COVERAGE_WORD[s]}
            <em>{byState(s).length}</em>
          </span>
        ))}
      </div>

      <div className="pb-ctable">
        <div className="pb-crow pb-chead" aria-hidden="true">
          <span>Country</span>
          <span>Public-warning system</span>
          <span>How it reaches you</span>
          <span>Us</span>
        </div>

        {rows.map((r) => (
          <article className={`pb-crow st-${r.state}`} key={r.iso2} id={r.iso2}>
            <h2 className="pb-cname">
              <span className="pb-ciso" aria-hidden="true">
                {r.iso2}
              </span>
              {r.name}
            </h2>

            <div className="pb-csys">
              {r.system ? (
                r.href ? (
                  <a href={r.href} target="_blank" rel="noreferrer noopener">
                    {r.system}
                  </a>
                ) : (
                  r.system
                )
              ) : (
                <em>No national civil-protection authority identified</em>
              )}
            </div>

            <div className="pb-cchan">
              {r.channel}
              {r.machineReadable ? null : (
                <span className="pb-cchansub">nothing to subscribe to — turn on emergency alerts</span>
              )}
            </div>

            <div className="pb-cstate">
              <span className="pb-cglyph" aria-hidden="true">
                {COVERAGE_GLYPH[r.state]}
              </span>
              <span className="pb-cword">{COVERAGE_WORD[r.state]}</span>
              {r.why ? <span className="pb-cwhy">{r.why}</span> : null}
            </div>
          </article>
        ))}
      </div>

      <p className="pb-prov">
        Compiled from {totals.feeds} registered feeds across {totals.countries} countries. Every row
        is our own research and our own wording; where we link out, that is the authority&rsquo;s own
        page and it is the one to trust in an emergency.
      </p>
    </div>
  );
}
