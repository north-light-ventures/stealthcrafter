import Link from "next/link";

/* THE MAP OWNS THE VIEWPORT.
 *
 * Its own route group, with its own shell, because the home screen is not a
 * document with a map in it — the map IS the page, and wrapping it in the
 * ordinary site chrome (a header band, a scrolling column, a footer) is
 * exactly what would turn it back into a picture on a website.
 *
 * So the nav floats over the map as one slim row of glass, and the legal
 * links live in a single line at the bottom rather than in a footer block.
 * /countries, /guides and /sources keep the normal shell in app/(site).
 */

const NAV = [
  { href: "/countries", label: "By country" },
  { href: "/guides", label: "Guides" },
  { href: "/sources", label: "Sources" },
];

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="pb-liveshell">
      <header className="pb-livenav">
        <Link href="/" className="pb-brand" aria-label="StealthCrafter, home">
          Stealth<span>Crafter</span>
        </Link>
        <nav aria-label="Main">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href}>
              {n.label}
            </Link>
          ))}
          <Link href="/imprint" className="quiet">
            Imprint
          </Link>
          <Link href="/privacy" className="quiet">
            Privacy
          </Link>
        </nav>
      </header>
      {children}
    </div>
  );
}
