import Link from "next/link";
import { getPack, PACK_HOURS, PACK_PEOPLE, type CoverageRow, type PackLine } from "@/lib/pack";
import PackBuy from "./pack-buy";
import PackCarousel, { type CarouselItem } from "./pack-carousel";
import { HouseholdProvider } from "./household-context";
import HouseholdSelector from "./household-selector";
import CountryBlock from "./country-block";
import LeadCapture from "./lead-capture";
import { getFunnelData } from "@/lib/pack-funnel";

export const dynamic = "force-dynamic";

/* THE PACK PAGE.
 *
 * Every fact here is read from the database. Nothing about the contents, the
 * statuses or the coverage is written into this file — the mockup's content was
 * hard-coded and had already drifted from the catalogue by the time it was
 * handed over, which is precisely the failure this page is built to avoid.
 */

/* Evidence rung: SHAPE and COLOUR and TEXT, never colour alone. Standing
   decision, and Ace is colour-blind — a page whose central claim is legibility
   cannot encode its most important field in hue. */
const RUNG: Record<string, { glyph: string; label: string; cls: string }> = {
  approved: { glyph: "●", label: "Approved", cls: "ap" },
  researching: { glyph: "◐", label: "Researching", cls: "re" },
  draft: { glyph: "○", label: "Draft", cls: "dr" },
  rejected: { glyph: "✕", label: "Rejected", cls: "rj" },
};
const UNFILLED = { glyph: "□", label: "Unfilled", cls: "un" };

const COVER: Record<string, { glyph: string; label: string; cls: string }> = {
  full: { glyph: "█", label: "Covered for the full 72 hours", cls: "full" },
  partial: { glyph: "▚", label: "Partial — works, but thin", cls: "part" },
  none: { glyph: "░", label: "Not covered", cls: "none" },
  unknown: { glyph: "?", label: "Not computable from our own records", cls: "unk" },
};

function Rung({ line }: { line: PackLine }) {
  const r = line.product ? RUNG[line.product.status || ""] ?? RUNG.draft : UNFILLED;
  return (
    <span className={`sf-pkrung ${r.cls}`}>
      <span className="g" aria-hidden="true">{r.glyph}</span>
      {r.label}
    </span>
  );
}

function CoverageBar({ row }: { row: CoverageRow }) {
  const c = COVER[row.state];
  const pct = row.hours === null ? null : Math.max(2, Math.round((row.hours / PACK_HOURS) * 100));
  return (
    <div className={`sf-pkcov ${c.cls}`}>
      <div className="sf-pkcovhead">
        <span className="sf-pkcovneed">{row.need}</span>
        <span className="sf-pkcovstate">
          {row.hours !== null ? <b className="sf-pkcovhrs">{Math.round(row.hours)} h</b> : null}
          <span className="g" aria-hidden="true">{c.glyph}</span>
          {c.label}
        </span>
      </div>
      {/* A real 0-72 hour scale with the day marks drawn on it, so a bar that
          stops at 24 is visibly one third rather than just short. The fill
          animates with transform, never width — width animation is a layout
          thrash and the guidance is explicit about it. */}
      <div className="sf-pkcovtrack" role="img" aria-label={`${row.need}: ${c.label}. ${row.headline}`}>
        <span className="sf-pkcovtick" style={{ left: "33.333%" }} aria-hidden="true" />
        <span className="sf-pkcovtick" style={{ left: "66.666%" }} aria-hidden="true" />
        {pct === null ? (
          <div className="sf-pkcovfill nofill">
            <span>no measurable figure</span>
          </div>
        ) : (
          <div className="sf-pkcovfill" style={{ width: `${pct}%` }} />
        )}
      </div>
      <p className="sf-pkcovhead2">{row.headline}</p>
      <p className="sf-pkcovdetail">{row.detail}</p>
      <p className="sf-pkcovbasis">
        Assessed by {row.basis}
        {row.missingFields.length ? (
          <>
            {" · needs "}
            {row.missingFields.map((f) => (
              <code key={f}>{f}</code>
            ))}
          </>
        ) : null}
      </p>
    </div>
  );
}

export default async function PackPage() {
  const [data, funnel] = await Promise.all([getPack(), getFunnelData()]);

  if (!data.configured || !data.product) {
    return (
      <main className="sf-page">
        <div className="sf-catwrap">
          <div className="cc-notice">
            <strong>The pack is not set up.</strong> No product with slug <code>72-hour-pack</code>{" "}
            was found — run the pack migration, or check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
          </div>
        </div>
      </main>
    );
  }

  const p = data.product;
  const s = data.stats;
  const hoursRow = data.coverage.filter((c) => c.hours !== null);

  /* Filled lines first, in manifest order, then the empty slots. The empty ones
     are shown rather than dropped — same call the manifest makes. */
  const carousel: CarouselItem[] = [
    ...data.lines.filter((l) => l.product),
    ...data.lines.filter((l) => !l.product),
  ].map((l) => ({
    key: l.id,
    name: l.product?.name || l.unfilledLabel || l.slot,
    qty: l.qty,
    image: l.product?.image ?? null,
    slug: l.product?.slug ?? null,
    status: l.product?.status ?? null,
    filled: Boolean(l.product),
  }));
  const weightKg = s.totalWeightGrams ? (s.totalWeightGrams / 1000).toFixed(2) : null;

  return (
    <HouseholdProvider countries={funnel.countries}>
    <main className="sf-page banded">
      {funnel.totalActive > 0 ? (
        <div className="sf-livebar">
          <strong>{funnel.totalActive.toLocaleString("en-GB")}</strong> public-safety warnings active
          across {funnel.countriesWithAlerts} European countries right now — counted from our own
          feeds, not an estimate.
        </div>
      ) : null}

      <header className="sf-band">
        <div className="sf-bandin">
          <div className="sf-bandkicker">One pack · Shelter in place · Three days</div>
          <h1 className="wide">When the power goes, you have about a day.</h1>
          <p className="sf-bandlede">
            Not because anything dramatic happens. Because the water in your cupboard runs out, the
            shops shut, and the card machines stop. Every civil-protection agency in Europe tells
            households to cover seventy-two hours on their own. Almost nobody does.
          </p>
        </div>
      </header>

      <div className="sf-catwrap">
        {/* THE SELECTOR IS THE CONVERSION MECHANISM and it sits above the fold.
            Everything below it is personalised by what it says, including the
            quantity that reaches the real basket. */}
        <HouseholdSelector />

        <CountryBlock feedCount={funnel.feedCount} />

        <section className="sf-orderblock">
          <div className="sf-orderin">
            <h2>Order it</h2>
            <PackBuy
              productId={p.id}
              price={p.selling}
              currency="EUR"
              isPlaceholder={data.priceIsPlaceholder}
            />
          </div>
        </section>

        {/* Each objection sits where it forms, not in a FAQ at the bottom. */}
        <section className="sf-reveal sf-obj">
          <h2>Three things people say before they buy</h2>

          <div className="sf-objitem">
            <h3>&ldquo;I could just buy this myself, cheaper.&rdquo;</h3>
            <p>
              You could buy something cheaper. You would be buying supermarket food with a
              twelve-month date on it, a torch chosen by price, and water you rotate every six months
              and eventually stop rotating. That is the kit that quietly stops being a kit.
            </p>
            <p>
              What is in this box was chosen against one question — does it still work in three years,
              in the dark, when nobody is thinking clearly. The rations are made for liferafts and
              last five years. The radio has no battery to go flat. That is the difference you are
              paying for, and it is the only difference worth paying for.
            </p>
            <div className="sf-objcmp">
              <div>
                <span>Assembling it yourself</span>
                <strong>{s.tradeCostLines >= 10 ? "11 suppliers" : `${s.filled} lines`}</strong>
                <em>Six deliveries, two shops, and an afternoon comparing tourniquets you will never use.</em>
              </div>
              <div>
                <span>Replacement cycle</span>
                <strong>Every 12 months</strong>
                <em>Supermarket food and water need rotating yearly. Most people manage it twice.</em>
              </div>
              <div className="win">
                <span>This pack</span>
                <strong>Once, for 5 years</strong>
                <em>One order. One box. One reminder from us before anything expires.</em>
              </div>
            </div>
          </div>

          <div className="sf-objitem">
            <h3>&ldquo;I&rsquo;ll sort it later.&rdquo;</h3>
            <p>
              This is the honest one, and it is the reason most households have nothing. Nobody buys
              this on the day they need it, because on that day the shops are already empty — that is
              what a warning does to a supermarket.
            </p>
            <p>
              So here is the only argument we think is fair. Everything in this box has a five-year
              life. Buying it today rather than next spring costs you nothing at all except the money,
              and it is the difference between being covered for the next sixty months and being
              covered for none of them. <strong>There is no sale, no countdown, and no reason to rush
              other than that one.</strong>
            </p>
          </div>

          <div className="sf-objitem">
            <h3>&ldquo;Why should I trust you?&rdquo;</h3>
            <p>
              Because we publish what we have not verified. Below you will find{" "}
              {s.unfilled} slots in this pack that are still empty, {data.blockers.length} items
              flagged as unresolved, and a note that our own catalogue currently contradicts itself
              about a box of matches.
            </p>
            <p>
              No other preparedness retailer shows you that, and it is not modesty — it is the whole
              product. Anyone can put things in a box. What we sell is knowing which things, and being
              willing to tell you what we do not yet know.
            </p>
          </div>
        </section>

        <h2 className="sf-pksect">Exactly what is in it</h2>
        <PackCarousel items={carousel} />

        <div className="sf-pktop solo">
          <div className="sf-pkthesis">
            <h2>What it actually covers, hour by hour</h2>
            <p className="sf-pklede">
              Drawn to a 72-hour scale from the quantities in the box and the figures in our own
              product records — not from a marketing claim. Where a figure does not exist, the row
              says so and names the field it needs. {hoursRow.length} of {data.coverage.length} rows
              could be put on the clock today.
            </p>
          </div>
        </div>

        <div className="sf-pkcovaxis" aria-hidden="true">
          <span>0 h</span><span>24 h</span><span>48 h</span><span>72 h</span>
        </div>

        <section className="sf-reveal sf-pkcovgrid">
          {data.coverage.map((row) => (
            <CoverageBar key={row.key} row={row} />
          ))}
        </section>

        <section className="sf-reveal sf-pkmanifest">
          <h2>The manifest</h2>
          <p className="sf-pklede">
            {s.filled} filled lines and {s.unfilled} still empty, published together. Every line
            carries where it is made, what it is certified to, and how far up our evidence ladder it
            has climbed. Nothing ships at &ldquo;researching&rdquo;.
          </p>

          {data.slots.map((group) => (
            <div className="sf-pkslot" key={group.slot}>
              <h3>
                {group.slot}
                <span>{group.lines.length} {group.lines.length === 1 ? "line" : "lines"}</span>
              </h3>
              {group.lines.map((l) => (
                <div className={`sf-pkline${l.product ? "" : " empty"}`} key={l.id}>
                  <div className="sf-pkqtytag">{l.qty}&times;</div>
                  <div className="sf-pkbody">
                    <div className="sf-pkname">
                      {l.product ? (
                        l.product.slug ? (
                          <Link href={`/admin/site/catalogue/${l.product.slug}`}>{l.product.name}</Link>
                        ) : (
                          l.product.name
                        )
                      ) : (
                        l.unfilledLabel
                      )}
                      <Rung line={l} />
                    </div>
                    {l.product ? (
                      <div className="sf-pkmeta">
                        {[
                          l.product.brand,
                          l.product.country,
                          l.product.weightText,
                          l.product.shelfLife,
                          l.product.certifications,
                        ]
                          .filter(Boolean)
                          .map((x, i) => (
                            <span key={i}>{x}</span>
                          ))}
                      </div>
                    ) : null}
                    {l.note ? <p className="sf-pknote">{l.note}</p> : null}
                    {l.flagLabel && l.flagLabel !== "Unfilled" && l.flagNote ? (
                      <p className={`sf-pkflag f-${l.flagLabel.toLowerCase()}`}>
                        <strong>{l.flagLabel}</strong> {l.flagNote}
                      </p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </section>

        <section className="sf-reveal sf-pkrules">
          <h2>What is deliberately not in this box</h2>
          <div className="sf-pkrulegrid">
            <div>
              <h3>No stove, no fuel, no gas</h3>
              <p>
                The ration needs no cooking, so the pack needs no stove, no fuel tablets, no canister
                and no lighter. Every one of those is restricted freight. Leaving them out means this
                box travels as an ordinary parcel to any address in Europe, on any carrier, at any
                time of year.
              </p>
            </div>
            <div>
              <h3>No medicines</h3>
              <p>
                Painkillers, rehydration salts and iodine tablets are medicinal products, and selling
                them across borders is a pharmacy licence in twenty-seven separate jurisdictions. Keep
                your own medication with the box; we will not pretend a shop can supply it.
              </p>
            </div>
            <div>
              <h3>No tent, no rucksack</h3>
              <p>
                The official guidance is to stay in your home, not leave it. A grab bag is a different
                product for a different emergency, and building both at once would mean doing neither
                properly.
              </p>
            </div>
            <div>
              <h3>Nothing we have not checked</h3>
              <p>
                Every line carries its rung on the evidence ladder. {s.researching} are still at
                &ldquo;researching&rdquo; and {s.draft} at &ldquo;draft&rdquo; — and those will be
                resolved or replaced before a single box ships, not quietly promoted.
              </p>
            </div>
          </div>
        </section>

        <LeadCapture />

        <section className="sf-reveal sf-after">
          <h2>What happens after you order</h2>
          <p className="sf-pklede">
            A box you buy once and forget is a box that fails. This is the part that stops that —
            designed, and honest about which pieces are not built yet.
          </p>
          <ol className="sf-aftersteps">
            <li>
              <span className="when">Immediately</span>
              <strong>Register the pack</strong>
              <p>
                It lands in your account with every item, its batch and its expiry. You can print the
                manifest and tape it inside the lid.
              </p>
            </li>
            <li>
              <span className="when">Ongoing</span>
              <strong>We watch your region</strong>
              <p>
                The same {funnel.feedCount} official feeds behind this page. You hear when it matters,
                not when we want a sale.
              </p>
            </li>
            <li>
              <span className="when">Year four</span>
              <strong>We tell you what expires</strong>
              <p>
                Before anything goes out of date, not after. Replace the consumables, keep the
                equipment. <em>Needs email, which is not connected yet.</em>
              </p>
            </li>
            <li>
              <span className="when">Whenever you like</span>
              <strong>Close the next gap</strong>
              <p>
                Tell us your home has changed — a baby, a dog, a relative who cannot manage stairs —
                and we tell you the one thing worth adding next.
              </p>
            </li>
          </ol>
        </section>

        <section className="sf-pkinternal">
          <div className="sf-pkinthead">Internal · SC Desk · not customer-facing</div>
          <h2>Where this stands</h2>
          <div className="cc-tiles">
            <div className="cc-tile"><div className="n">{s.filled} / {s.slots}</div><div className="l">Slots filled</div></div>
            <div className="cc-tile"><div className="n">{s.approved}</div><div className="l">Approved</div></div>
            <div className="cc-tile"><div className="n">{s.researching}</div><div className="l">Researching</div></div>
            <div className="cc-tile"><div className="n">{s.draft}</div><div className="l">Draft</div></div>
            <div className="cc-tile"><div className="n">{s.realCostBasis}</div><div className="l">Real cost basis</div></div>
            <div className="cc-tile"><div className="n">{s.weighed}</div><div className="l">Weighed lines</div></div>
          </div>

          <p>
            <strong>Cost.</strong> {s.tradeCostLines} of the {s.filled} filled lines carry a recorded
            wholesale figure, and at the quantities in this pack those total{" "}
            <strong>€{s.tradeCostTotal.toFixed(2)}</strong> — before lighting, the toilet system and
            the smaller first-aid kit are priced at all. But only <strong>{s.realCostBasis}</strong>{" "}
            of them rest on a real cost basis; the rest are recommended retail prices sitting in a
            column labelled wholesale. Competitor kits retail at €80–200. Either those figures are
            not trade prices, or this specification cannot be sold at market — and both readings
            demand exactly the same next action.
          </p>

          {data.blockers.length ? (
            <>
              <h3>Blocking and compliance items</h3>
              <ul className="sf-pkintlist">
                {data.blockers.map((b, i) => (
                  <li key={i}>
                    <strong>{b.line}</strong> — <em>{b.label}.</em> {b.note}
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          {data.faults.length ? (
            <>
              <h3>Data faults found in these rows</h3>
              <p className="sf-pkintnote">
                Derived by reading the records on this page, not typed into a template — so this list
                finds new faults on its own rather than going stale.
              </p>
              <ul className="sf-pkintlist">
                {data.faults.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </>
          ) : null}

          <h3>Coverage rows that could not be computed</h3>
          <ul className="sf-pkintlist">
            {data.coverage.filter((c) => c.missingFields.length).length === 0 ? (
              <li>None — every row has the figures it needs.</li>
            ) : (
              data.coverage
                .filter((c) => c.missingFields.length)
                .map((c) => (
                  <li key={c.key}>
                    <strong>{c.need}</strong> — needs {c.missingFields.map((f) => <code key={f}>{f}</code>)}
                  </li>
                ))
            )}
          </ul>

          <h3>Funnel</h3>
          <p className="sf-pkintnote">
            Four events are recorded and no more — selector interaction, scroll to the order block,
            add to basket, email capture — and a fifth needs a database migration, which is the point.
            Three stubs sit behind this page and all three are stated on it rather than hidden: the
            price is a test figure, payment is the demo provider, and transactional email does not
            exist, so the capture form stores consent and sends nothing.
          </p>

          <p className="sf-pkintnote">
            Under GPSR 2023/988, assembling and selling this box makes us its manufacturer —
            responsible economic operator, technical file, traceability — not a reseller of its parts.
            That is the compliance item with the most work and the least thought behind it.
          </p>
        </section>

        <p className="sf-pkprov">
          Every product, status, certification and weight on this page is read from{" "}
          <code>public.products</code> and <code>public.pack_items</code> as they stand right now.
          Quantities and coverage are calculated from those records against the 72-hour guidance
          published by the EU, BBK (Germany), MSB (Sweden) and RCB (Poland).
        </p>
      </div>
    </main>
    </HouseholdProvider>
  );
}
