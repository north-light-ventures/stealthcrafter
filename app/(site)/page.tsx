import type { Metadata } from "next";
import Link from "next/link";
import { getRegister } from "@/lib/public/data";
import { getPublicMap, STATE_FILL } from "@/lib/public/map";
import { COVERAGE_GLYPH, COVERAGE_WORD, type CoverageState } from "@/lib/public/register";
import { publicFeeds } from "@/lib/public/licence";
import CountryPicker from "./country-picker";
import CoverageMap from "./coverage-map";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "StealthCrafter — what warns you, where you live",
  description:
    "We read Europe's official public-warning systems and tell households what theirs actually is: the name of the system, the channel it reaches you on, and whether anyone can read it.",
  robots: { index: true, follow: true },
};

/* HOME — what StealthCrafter is, in one screen.
 *
 * No basket, no price, no email capture. The job of this page is to get someone
 * to their own country's row and to let them check us on the way.
 *
 * The one number that matters is COMPUTED, not written. The brief that
 * commissioned this page quoted a figure the register no longer agrees with,
 * which is the argument for computing it.
 */
export default async function HomePage() {
  const [{ rows, totals }, cleared, mapData] = await Promise.all([
    getRegister(),
    publicFeeds(),
    getPublicMap(),
  ]);
  const countries = rows.map((r) => ({ iso2: r.iso2, name: r.name }));

  /* Counted on the server so the legend and the map cannot disagree, and so
     the client is handed numbers rather than the job of deriving them. */
  const ORDER: CoverageState[] = ["reporting", "built-not-on", "not-machine-readable", "nothing-found"];
  const legend = ORDER.map((state) => ({
    state,
    glyph: COVERAGE_GLYPH[state],
    word: COVERAGE_WORD[state],
    count: rows.filter((r) => r.state === state).length,
  }));

  return (
    <div className="pb-page pb-home">
      <section className="pb-hero">
        <div className="pb-heroin">
          <div className="pb-herocopy">
            <span className="pb-kicker">Public warnings across Europe</span>
            <h1>
              If something happened tonight, do you know how your government would reach you?
            </h1>
            <p className="pb-lede">
              Almost every European state has a way to warn you, and almost none of them will send an
              email. Most push a message straight to your handset — which only works if that setting
              is on. We read every official public-warning system in Europe and publish what each one
              is, how it reaches you, and whether anyone outside that government can read it at all.
            </p>
            <CountryPicker countries={countries} />
          </div>

          <aside className="pb-herofig" aria-label="The headline figure">
            <b>{totals.noMachineReadable}</b>
            <span>
              of {totals.countries} countries have no machine-readable civil-protection feed at all
            </span>
            <p>
              Their warnings exist. They go straight to the phone in your pocket and nowhere else.
              That is not a gap in our coverage — it is the thing you most need to know, because it
              means the channel is yours to switch on.
            </p>
          </aside>
        </div>
      </section>

      {/* THE MAP IS THE ARGUMENT, DRAWN — and it gets the width to make it.
          Every country in the register, filled by whether anyone outside that
          government can read its civil-protection feed, from our own outlines
          and our own research. There is no third-party tile request on this
          page: see lib/public/map.ts for why the gated home's satellite
          basemap does not come with us. */}
      <section className="pb-mapsec" aria-label="Coverage across Europe">
        <CoverageMap fc={mapData.fc} fill={STATE_FILL} legend={legend} />
      </section>

      <section className="pb-three">
        <article>
          <h2>We name the system</h2>
          <p>
            Not &ldquo;alerts for your area&rdquo; — the actual name of the thing that will warn you,
            the authority behind it, and a link to their own page. {totals.countries} countries,
            researched one at a time.
          </p>
          <Link href="/countries">See every country →</Link>
        </article>
        <article>
          <h2>We relay, we don&rsquo;t advise</h2>
          <p>
            Where a government publishes guidance on what households should keep, we relay it as
            theirs, with the citation. We are pointing at the authority, not trying to be one.
          </p>
          <Link href="/guides">What your government says →</Link>
        </article>
        <article>
          <h2>We publish what we can&rsquo;t show</h2>
          <p>
            {cleared.length} feeds are cleared and carried. Many more are registered and waiting on
            an authority&rsquo;s permission, and we will not carry those until it arrives. Every one
            is listed either way.
          </p>
          <Link href="/sources">Every source and licence →</Link>
        </article>
      </section>

      <section className="pb-honest">
        <h2>What this site is not</h2>
        <ul>
          <li>
            <strong>It is not an alerting service.</strong> If your government warns you, they will
            do it directly and far faster than any website. Turn emergency alerts on.
          </li>
          <li>
            <strong>It is not official.</strong> Our reading of a published figure is ours. The
            authority&rsquo;s own words are shown as theirs and always win.
          </li>
          <li>
            <strong>It is not finished.</strong> Most of the register is researched and not yet
            carried, and the reason is published against each row rather than hidden behind a
            friendlier number.
          </li>
        </ul>
      </section>
    </div>
  );
}
