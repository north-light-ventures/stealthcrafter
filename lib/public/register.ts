// THE PUBLIC REGISTER — what /countries is built from.
//
// This is SC 13's research, which is ours: the name of each country's public
// warning system, the channel it reaches people on, whether it is machine
// readable, and whether we carry it. None of that is licensed content, so none
// of it is gated. What IS gated — the alerts themselves — lives in licence.ts
// and is not touched here.
//
// EVERY NUMBER ON THE PUBLIC PAGE IS COMPUTED HERE AND NOWHERE ELSE.
// The brief that commissioned this page quoted "39 countries, 30 with no
// machine-readable civil-protection feed". The register says otherwise today.
// A headline figure typed into a page is a figure that goes stale silently and
// then gets quoted back at us, so the page asks this file and this file counts
// the rows.

import { REGISTRY } from "../feeds/registry";
import { countryName } from "../iso-ids";

/** The register grows faster than any hand-kept name table, and a row reading
    "AD — AD" is a bug the reader sees. Fall back to the platform's own ISO
    names so a country added to the register is named without a code change. */
const REGION_NAMES =
  typeof Intl !== "undefined" && "DisplayNames" in Intl
    ? new Intl.DisplayNames(["en"], { type: "region" })
    : null;

function displayName(iso2: string): string {
  const known = countryName(iso2);
  if (known && known !== iso2) return known;
  try {
    return REGION_NAMES?.of(iso2) || iso2;
  } catch {
    return iso2;
  }
}
import type { Feed } from "../feeds/types";

/** The four states the brief names, and the only four a country row can be in
    for a given kind of hazard. The wording is the page's wording: these strings
    are shown to the public, so they live next to the logic that assigns them. */
export type CoverageState = "reporting" | "built-not-on" | "not-machine-readable" | "nothing-found";

export const COVERAGE_WORD: Record<CoverageState, string> = {
  reporting: "We carry it",
  "built-not-on": "Built, not switched on",
  "not-machine-readable": "Published, but not machine-readable",
  "nothing-found": "Nothing found",
};

/** Shape AND text, never colour alone — the standing rule on this site, and Ace
    is colour-blind. Each state gets a glyph as well as a word. */
export const COVERAGE_GLYPH: Record<CoverageState, string> = {
  reporting: "\u25CF",            // ● carried and live
  "built-not-on": "\u25C6",       // ◆ solid, but a different shape: it exists, it is not on
  "not-machine-readable": "\u25CB", // ○ published, nothing to subscribe to
  "nothing-found": "\u25A1",      // □ we looked and found none
};
// NOT ◐ / ◑ (U+25D0/U+25D1). They have no glyph in the default system sans on
// Linux and Android and fall back to a 3px sliver — checked by rendering, not
// assumed. On a page whose states are encoded in shape because the reader may
// be colour-blind, an invisible shape is the whole signal gone.

export type CountryRow = {
  iso2: string;
  name: string;
  /** The national public-warning system, named whether or not we can read it. */
  system: string | null;
  /** How the state reaches a household: the authority's own channel. */
  channel: string;
  machineReadable: boolean;
  state: CoverageState;
  /** Why, in one sentence, when the state is not "reporting". */
  why: string;
  /** The authority's own page, for the reader to go and check us. */
  href: string | null;
  feedsRegistered: number;
};

function civilRows(rows: Feed[]): Feed[] {
  return rows.filter((f) => f.kind === "civil-protection");
}

/** SC 13's notes are research prose. The first sentence is reliably the
    finding; the rest belongs in the register, not on a public page. */
function firstSentence(notes: string | null | undefined): string {
  if (!notes) return "";
  const first = notes.split(/(?<=[.!?])\s+/)[0] || notes;
  return first.length > 240 ? first.slice(0, 237) + "…" : first;
}

function hostOf(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

/**
 * One row per country, from the register.
 *
 * `enabledIds` is the set of feed ids actually switched on in the database —
 * passed in rather than read here so this stays a pure function over the
 * register and can be exercised without a database. The registry's own
 * `enabled` flag records what SC 13 intended; the database records what is
 * true. Where they disagree the database wins, because that is the one a
 * reader's page is actually served from.
 */
export function buildCountryRows(enabledIds: Set<string>): CountryRow[] {
  const by = new Map<string, Feed[]>();
  for (const f of REGISTRY) {
    if (!f.country_iso2) continue;
    if (!by.has(f.country_iso2)) by.set(f.country_iso2, []);
    by.get(f.country_iso2)!.push(f);
  }

  const out: CountryRow[] = [];
  for (const [iso2, rows] of by.entries()) {
    const civil = civilRows(rows);

    // The system is named from the civil-protection rows whether or not any of
    // them is readable. A reader in a cell-broadcast country still needs to
    // know what will reach them.
    const named =
      civil.find((f) => enabledIds.has(f.id)) ??
      civil.find((f) => f.register_status === "USABLE") ??
      civil.find((f) => f.register_status === "NO-PUBLIC-FEED") ??
      civil[0];

    const carried = civil.find((f) => enabledIds.has(f.id) && f.licence_state === "clear");
    const usable = civil.find((f) => f.register_status === "USABLE");
    const exists = civil.find(
      (f) => f.register_status === "EXISTS-NOT-USABLE" || f.register_status === "EXISTS"
    );
    const noPublicFeed = civil.find((f) => f.register_status === "NO-PUBLIC-FEED");

    let state: CoverageState;
    let why = "";
    if (carried) {
      state = "reporting";
    } else if (usable || exists) {
      state = "built-not-on";
      const f = (usable ?? exists)!;
      why =
        f.licence_state === "blocked"
          ? "the licence does not permit our use"
          : f.licence_state === "pending"
          ? "we have asked the authority for permission and are waiting"
          : f.licence_state === "unknown"
          ? "the licence has not been established"
          : f.access_state === "needs-contract"
          ? "it needs a signed agreement"
          : f.access_state === "needs-key"
          ? "it needs an API key we do not yet hold"
          : f.access_state === "needs-registration"
          ? "it needs an account we have not opened"
          : "it is built and not yet switched on";
    } else if (noPublicFeed) {
      state = "not-machine-readable";
      why = firstSentence(noPublicFeed.notes) || "warnings are issued, but not in a form anything can subscribe to";
    } else {
      state = "nothing-found";
      why = "we looked for a national civil-protection feed and found none";
    }

    // Cell broadcast is the rule across most of Europe, and it is the single
    // most useful thing to tell a reader: the channel is their own handset.
    const channel = noPublicFeed || state === "nothing-found" ? "Direct to the handset" : "Machine-readable feed";

    out.push({
      iso2,
      name: displayName(iso2),
      system: named?.authority ?? null,
      channel,
      machineReadable: Boolean(carried || usable || exists),
      state,
      why,
      href: hostOf(named?.endpoint),
      feedsRegistered: rows.length,
    });
  }

  return out.sort((a, b) => a.name.localeCompare(b.name));
}

export type RegisterTotals = {
  countries: number;
  machineReadable: number;
  noMachineReadable: number;
  carried: number;
  feeds: number;
};

export function registerTotals(rows: CountryRow[]): RegisterTotals {
  return {
    countries: rows.length,
    machineReadable: rows.filter((r) => r.machineReadable).length,
    noMachineReadable: rows.filter((r) => !r.machineReadable).length,
    carried: rows.filter((r) => r.state === "reporting").length,
    feeds: REGISTRY.length,
  };
}
