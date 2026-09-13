import Link from "next/link";
import { getPack, PACK_HOURS, PACK_PEOPLE, type CoverageRow, type PackLine } from "@/lib/pack";
import PackBuy from "./pack-buy";
import PackCarousel, { type CarouselItem } from "./pack-carousel";

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
          <span className="g" aria-hidden="true">{c.glyph}</span>
          {c.label}
        </span>
      </div>
      <div className="sf-pkcovtrack" role="img" aria-label={`${row.need}: ${c.label}. ${row.headline}`}>
        {pct === null ? (
          <div className="sf-pkcovfill nofill">
            <span>no measurable figure</span>
          </div>
        ) : (
          <div className="sf-pkcovfill" style={{ width: `${pct}%` }}>
            <span>{Math.round(row.hours!)} h</span>
          </div>
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
  const data = await getPack();

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
    <main className="sf-page banded">
      <header className="sf-band">
        <div className="sf-bandin">
          <div className="sf-bandkicker">One product · Shelter-in-place · Two people</div>
          <h1 className="wide">The 72-Hour Pack</h1>
          <p className="sf-bandlede">{p.description}</p>
          <div className="sf-bandstats">
            <div className="sf-bandstat"><b>{PACK_HOURS} h</b><span>duration</span></div>
            <div className="sf-bandstat"><b>{PACK_PEOPLE} people</b><span>household</span></div>
            <div className="sf-bandstat"><b>{s.filled} / {s.slots}</b><span>lines filled</span></div>
            <div className="sf-bandstat"><b>{s.approved}</b><span>approved</span></div>
            {weightKg ? <div className="sf-bandstat"><b>{weightKg} kg</b><span>weighed so far</span></div> : null}
          </div>
        </div>
      </header>

      <div className="sf-catwrap">
        <PackCarousel items={carousel} />

        <div className="sf-pktop">
          <div className="sf-pkthesis">
            <h2>What it actually covers, hour by hour</h2>
            <p className="sf-pklede">
              Drawn to a 72-hour scale from the quantities in the box and the figures in our own
              product records — not from a marketing claim. Where a figure does not exist, the row
              says so and names the field it needs. {hoursRow.length} of {data.coverage.length} rows
              could be put on the clock today.
            </p>
          </div>
          <PackBuy
            productId={p.id}
            price={p.selling}
            currency="EUR"
            isPlaceholder={data.priceIsPlaceholder}
          />
        </div>

        <section className="sf-pkcovgrid">
          {data.coverage.map((row) => (
            <CoverageBar key={row.key} row={row} />
          ))}
        </section>

        <section className="sf-pkmanifest">
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

        <section className="sf-pkrules">
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
  );
}
