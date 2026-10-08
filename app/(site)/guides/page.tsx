import type { Metadata } from "next";
import Link from "next/link";
import { getGuidance } from "@/lib/public/data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "What your government tells you to keep · StealthCrafter",
  description:
    "Per country, in plain English: what that government tells households to keep and do, with the authority named and a link to their own page. We are pointing at the authority, not being one.",
  robots: { index: true, follow: true },
};

/* GUIDES — ATTRIBUTED RELAY, NOT OUR ADVICE.
 *
 * Every word of guidance on this page belongs to a named national authority and
 * is shown as theirs, with a citation and a link to the page it came from.
 * Nothing here is StealthCrafter's advice, and the page says so at the top
 * rather than in small print at the bottom.
 *
 * The `guides` table holds seven DRAFT, unsigned rows. They are not on this
 * page and this file does not read that table.
 *
 * ONE COUNTRY HAS CONTENT. Spain is verified and shows the shape. Six rows have
 * an authority, a system name and the EU baseline figure and no captured
 * guidance at all, and they say exactly that. A page listing six countries as
 * though each had advice behind it, when five fields of six are empty, would be
 * the precise failure this business exists to not commit.
 */
export default async function GuidesPage() {
  const rows = await getGuidance();
  const withText = rows.filter((r) => r.guidance.length > 0);
  const withoutText = rows.filter((r) => r.guidance.length === 0);

  return (
    <div className="pb-page">
      <header className="pb-head">
        <span className="pb-kicker">Attributed relay</span>
        <h1>What your own government tells you to keep</h1>
        <p className="pb-lede">
          None of this is our advice. Every line below belongs to a named national authority, is
          shown in their terms, and links to the page we took it from. Where we have not yet captured
          what a government says, the entry says so and names them anyway — because knowing who
          speaks for you in an emergency is itself worth knowing.
        </p>
      </header>

      {withText.length === 0 ? (
        <p className="pb-empty">
          We have not yet captured any national guidance in a form we are willing to publish. The
          authorities are named below.
        </p>
      ) : (
        <section className="pb-glist" aria-label="Captured guidance">
          {withText.map((r) => (
            <article className="pb-gcard" key={r.iso2}>
              <header>
                <span className="pb-giso" aria-hidden="true">
                  {r.iso2}
                </span>
                <h2>{r.country}</h2>
                {r.verified ? (
                  <span className="pb-gverified">
                    <span aria-hidden="true">●</span> Verified against the source
                  </span>
                ) : (
                  <span className="pb-gunver">
                    <span aria-hidden="true">◐</span> Not yet verified
                  </span>
                )}
              </header>

              <p className="pb-gauth">
                {r.authority}
                {r.system ? <span className="pb-gsys">{r.system}</span> : null}
              </p>

              <blockquote className="pb-gtext">{r.guidance}</blockquote>

              <dl className="pb-gfacts">
                <div>
                  <dt>Water, per person per day</dt>
                  <dd>
                    {r.litresPerPersonDay === null ? "—" : `${r.litresPerPersonDay} litres`}
                    {r.verified ? null : <em> EU baseline, not their figure</em>}
                  </dd>
                </div>
              </dl>

              {r.citation ? (
                <p className="pb-gcite">
                  {/^https?:\/\//i.test(r.citation) ? (
                    <a href={r.citation} target="_blank" rel="noreferrer noopener">
                      {r.citation}
                    </a>
                  ) : (
                    r.citation
                  )}
                </p>
              ) : null}
            </article>
          ))}
        </section>
      )}

      {withoutText.length ? (
        <section className="pb-gpending" aria-label="Authorities named, guidance not yet captured">
          <h2>Named, but not yet captured</h2>
          <p className="pb-note">
            For these countries we know who warns you and what the system is called. We have not yet
            read their household guidance carefully enough to relay it, so we are not going to
            paraphrase it. Each figure below is the EU baseline, not that country&rsquo;s own
            number, and is labelled as such.
          </p>
          <div className="pb-ggrid">
            {withoutText.map((r) => (
              <article className="pb-gstub" key={r.iso2}>
                <h3>
                  <span className="pb-giso" aria-hidden="true">
                    {r.iso2}
                  </span>
                  {r.country}
                </h3>
                <p className="pb-gauth">{r.authority}</p>
                {r.system ? <p className="pb-gsys">{r.system}</p> : null}
                <p className="pb-gbase">
                  {r.litresPerPersonDay === null ? "—" : `${r.litresPerPersonDay} L`} per person per
                  day <em>— EU baseline, not {r.country}&rsquo;s own figure</em>
                </p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <p className="pb-prov">
        Looking for what your country&rsquo;s warning system actually is, and whether anyone can read
        it? That is on <Link href="/countries">By country</Link>. Every source we use is listed on{" "}
        <Link href="/sources">Sources</Link>.
      </p>
    </div>
  );
}
