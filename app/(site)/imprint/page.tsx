import type { Metadata } from "next";
import { OPERATOR, operatorGaps } from "@/lib/public/operator";

export const metadata: Metadata = {
  title: "Imprint · StealthCrafter",
  description: "Who operates this site, where they are, and how to reach them.",
  robots: { index: true, follow: true },
};

export default function ImprintPage() {
  const gaps = operatorGaps();

  return (
    <div className="pb-page pb-legal">
      <header className="pb-head">
        <span className="pb-kicker">Legal</span>
        <h1>Imprint</h1>
      </header>

      {gaps.length ? (
        <div className="pb-legalgap">
          <h2>These details are not published yet</h2>
          <p>
            An imprint has to name a real legal person at a real address. Ours is being registered
            and we are not going to put a provisional one here, because a plausible-looking address
            that nobody has checked is a false statement of identity rather than a placeholder.
          </p>
          <p>Still to publish: {gaps.join("; ")}.</p>
          <p>
            Until then, anything you need to raise about this site — including anything in the
            sections below — should go to the address published on our{" "}
            <a href="/sources">Sources</a> page, and we will answer it.
          </p>
        </div>
      ) : (
        <section className="pb-legalsec">
          <h2>Operator</h2>
          <p>
            <strong>{OPERATOR.legalName}</strong>
            {OPERATOR.tradingAs && OPERATOR.tradingAs !== OPERATOR.legalName ? (
              <> trading as {OPERATOR.tradingAs}</>
            ) : null}
          </p>
          <address>
            {OPERATOR.addressLines.map((l, i) => (
              <span key={i}>{l}</span>
            ))}
            <span>{OPERATOR.country}</span>
          </address>
          <dl>
            <div>
              <dt>Email</dt>
              <dd>
                <a href={`mailto:${OPERATOR.email}`}>{OPERATOR.email}</a>
              </dd>
            </div>
            {OPERATOR.registration ? (
              <div>
                <dt>Registration</dt>
                <dd>{OPERATOR.registration}</dd>
              </div>
            ) : null}
            {OPERATOR.vat ? (
              <div>
                <dt>VAT</dt>
                <dd>{OPERATOR.vat}</dd>
              </div>
            ) : null}
            <div>
              <dt>Responsible for the content</dt>
              <dd>{OPERATOR.responsibleForContent}</dd>
            </div>
          </dl>
        </section>
      )}

      <section className="pb-legalsec">
        <h2>What this site publishes, and whose it is</h2>
        <p>
          Two different things appear on this site and they have different owners. The register —
          which countries have which public-warning system, how it reaches people, and whether we can
          read it — is our own research and our own wording. The conditions and warnings are the
          property of the authorities that issued them, carried under the licences listed on our{" "}
          <a href="/sources">Sources</a> page, and shown as theirs.
        </p>
        <p>
          Our reading of a published figure is never an official warning and is never presented as
          one. In an emergency, follow your own national authority.
        </p>
      </section>

      <section className="pb-legalsec">
        <h2>Getting something corrected</h2>
        <p>
          If a row about your country is wrong — the system misnamed, the channel misdescribed, a
          feed we say does not exist — tell us and we will correct it and say that we did. The
          register is research, and research is wrong sometimes; a page that cannot be corrected is
          not evidence of anything.
        </p>
      </section>
    </div>
  );
}
