import Link from "next/link";

/* THE PUBLIC SHELL.
 *
 * Four routes and nothing else: Home, Guides, By Country, Sources. Everything
 * we have built — the pack, the funnel, the basket, checkout, orders, the
 * catalogue, the Kit Builder, Jimmy, the Command Center — stays exactly where
 * it is behind the founder gate at /admin/*. This is a front door drawn onto a
 * house that already exists.
 *
 * There is deliberately no basket, no price and no email capture anywhere in
 * this shell. Adding one later is a decision someone has to take on purpose.
 */

const NAV = [
  { href: "/", label: "Home" },
  { href: "/countries", label: "By country" },
  { href: "/guides", label: "Guides" },
  { href: "/sources", label: "Sources" },
];

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="pb-shell">
      <header className="pb-top">
        <div className="pb-topin">
          <Link href="/" className="pb-brand" aria-label="StealthCrafter, home">
            Stealth<span>Crafter</span>
          </Link>
          <nav className="pb-nav" aria-label="Main">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href}>
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="pb-main">{children}</main>

      <footer className="pb-foot">
        <div className="pb-footin">
          <div className="pb-footbrand">
            <strong>StealthCrafter</strong>
            <p>
              We read Europe&rsquo;s official public-warning systems and tell households what theirs
              actually is. Nothing on this site is an official alert.
            </p>
          </div>
          <nav className="pb-footnav" aria-label="Footer">
            <Link href="/countries">By country</Link>
            <Link href="/guides">Guides</Link>
            <Link href="/sources">Sources</Link>
            <Link href="/imprint">Imprint</Link>
            <Link href="/privacy">Privacy</Link>
          </nav>
        </div>
        <p className="pb-footnote">
          © {new Date().getFullYear()} StealthCrafter. In an emergency, follow your own national
          authority. Our reading of a published figure is never a substitute for their warning.
        </p>
      </footer>
    </div>
  );
}
