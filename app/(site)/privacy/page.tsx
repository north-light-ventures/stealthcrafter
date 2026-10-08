import type { Metadata } from "next";
import { OPERATOR, operatorGaps } from "@/lib/public/operator";

export const metadata: Metadata = {
  title: "Privacy · StealthCrafter",
  description:
    "What this site does and does not collect. No accounts, no sign-up, no advertising, and no cookies set by us.",
  robots: { index: true, follow: true },
};

/* The honest version of a privacy policy is short, because the honest answer
 * for these four pages is "almost nothing". Every claim below is a claim about
 * code that exists in this repository; nothing here is boilerplate carried over
 * from a template, and nothing claims a protection the code does not provide.
 */
export default function PrivacyPage() {
  const gaps = operatorGaps();

  return (
    <div className="pb-page pb-legal">
      <header className="pb-head">
        <span className="pb-kicker">Legal</span>
        <h1>Privacy</h1>
        <p className="pb-lede">
          These four pages have no accounts, no sign-up, no newsletter, no basket and no
          advertising. There is almost nothing to tell you, and this page tells you the rest of it
          rather than padding it out.
        </p>
      </header>

      <section className="pb-legalsec">
        <h2>What we do not do</h2>
        <ul>
          <li>We set no cookies of our own on these pages.</li>
          <li>We do not ask for your email address, and there is nowhere on this site to give it.</li>
          <li>
            We do not look up where you are. The country picker is a choice you make; there is no IP
            lookup, no browser-language sniffing and no location header used to guess it for you.
          </li>
          <li>Your choice of country is not stored and is not sent anywhere.</li>
          <li>We do not sell, share or rent anything about you, because we do not hold it.</li>
        </ul>
      </section>

      <section className="pb-legalsec">
        <h2>What does happen</h2>
        <h3>Our hosting provider</h3>
        <p>
          This site is served by Vercel. Like any web host, their servers process the IP address and
          browser user-agent of each request in order to deliver the page and to keep the service
          running and secure. We do not add to those logs and we do not use them to build any profile
          of a visitor.
        </p>

        <h3>Audience measurement</h3>
        <p>
          We load a script from Ahrefs Analytics to count how many people reach each page and which
          pages they arrive from. It does not set cookies and we do not use it to identify
          individuals. If you would rather it did not load at all, any content blocker will stop it,
          and nothing on this site depends on it working.
        </p>

        <h3>Links we send you to</h3>
        <p>
          Much of the point of this site is sending you to the authority that actually warns you.
          Once you follow one of those links you are on their site under their terms, which we do not
          control and have not reviewed on your behalf.
        </p>
      </section>

      <section className="pb-legalsec">
        <h2>Your rights</h2>
        <p>
          Under the GDPR you have the right to ask what personal data an organisation holds about
          you, to have it corrected or erased, and to complain to your national data-protection
          authority. In our case the honest answer to the first question, for a visitor to these
          pages, is that we hold none: there is no account to look up and no record tied to you.
        </p>
        {gaps.length ? (
          <p>
            The address for making such a request is published with our operator details, which are
            being registered and are not yet final. Until they are, the contact route on our{" "}
            <a href="/sources">Sources</a> page reaches us.
          </p>
        ) : (
          <p>
            To make a request, write to{" "}
            <a href={`mailto:${OPERATOR.email}`}>{OPERATOR.email}</a>.
          </p>
        )}
      </section>

      <section className="pb-legalsec">
        <h2>If that changes</h2>
        <p>
          We are building more than these four pages, and some of it — an account, a reminder before
          something in your cupboard expires — will need your email address. None of that is on this
          site today. When it arrives it will arrive with its own clear explanation at the point you
          are asked, not as a quiet revision to this page.
        </p>
      </section>
    </div>
  );
}
