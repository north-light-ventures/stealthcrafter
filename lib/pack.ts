// THE 72-HOUR PACK — data and the coverage computation.
//
// StealthCrafter launches with one product. It is an ordinary row in
// `products` joined to `pack_items`, deliberately: basket, checkout, VAT,
// orders and the Command Center learn nothing new, and SC 01 can change what is
// in the box without touching this file.
//
// THE COVERAGE STRIP IS THE PART THAT EARNS THE PAGE, and it is the part most
// easily faked. Every row here is computed from the catalogue, and where it
// cannot be computed the row says so and names the field that is missing. There
// is no hard-coded bar anywhere in this file. That is not fastidiousness: a
// coverage claim is the only thing on the page a customer would actually rely
// on in an emergency.

import { supabaseAdmin } from "./supabase";
import { parseImages } from "./catalogue-data";

/* ---------------- the household this pack is sized for ---------------- */

export const PACK_PEOPLE = 2;
export const PACK_DAYS = 3;
export const PACK_HOURS = 72;

/** EU / BBK / MSB / RCB household guidance, and the basis of every number below. */
export const LITRES_PER_PERSON_DAY = 2;
export const KCAL_PER_PERSON_DAY = 2000;

export const WATER_NEED_L = LITRES_PER_PERSON_DAY * PACK_PEOPLE * PACK_DAYS; // 12
export const FOOD_NEED_KCAL = KCAL_PER_PERSON_DAY * PACK_PEOPLE * PACK_DAYS; // 12000

/* ---------------- shapes ---------------- */

export type PackProduct = {
  id: string;
  name: string;
  brand: string | null;
  status: string | null;
  slug: string | null;
  image: string | null;
  country: string | null;
  weightGrams: number | null;
  weightText: string | null;
  certifications: string | null;
  shelfLife: string | null;
  powerSource: string | null;
  contents: string | null;
  description: string | null;
  dangerousGoods: boolean;
  wholesale: number | null;
  selling: number | null;
  priceBasis: string | null;
  litresCapacity: number | null;
  litresSupplied: number | null;
  kcalTotal: number | null;
  burnHours: number | null;
  lumens: number | null;
};

export type PackLine = {
  id: string;
  slot: string;
  needKey: string | null;
  qty: number;
  note: string | null;
  flagLabel: string | null;
  flagNote: string | null;
  product: PackProduct | null;
  /** an unfilled slot is a real published line, not an absence */
  unfilledLabel: string | null;
};

export type CoverageState = "full" | "partial" | "none" | "unknown";

export type CoverageRow = {
  key: string;
  need: string;
  state: CoverageState;
  /** 0-72 when a real quantity produced it; null when the row is not measured */
  hours: number | null;
  /** how the row was reached, said out loud on the page */
  basis: "measured" | "self-powered" | "lines filled" | "not computable";
  headline: string;
  detail: string;
  /** columns that would turn a "not computable" row into a measured one */
  missingFields: string[];
};

export type PackStats = {
  slots: number;
  filled: number;
  unfilled: number;
  approved: number;
  researching: number;
  draft: number;
  realCostBasis: number;
  weighed: number;
  tradeCostTotal: number;
  tradeCostLines: number;
  totalWeightGrams: number;
};

export type PackData = {
  configured: boolean;
  product: PackProduct | null;
  priceIsPlaceholder: boolean;
  lines: PackLine[];
  slots: { slot: string; lines: PackLine[] }[];
  coverage: CoverageRow[];
  stats: PackStats;
  /** data faults DERIVED from the rows, not typed into a template */
  faults: string[];
  blockers: { label: string; line: string; note: string }[];
};

/* ---------------- reading numbers the catalogue already states -------------
   The structured column wins. Where it is null we will read a figure the
   product record states about ITSELF, and mark it derived rather than verified.
   Reading a number the catalogue already holds is not inventing one — but two
   recorded figures that disagree are refused outright rather than averaged or
   picked between, because picking would hide exactly the fault worth surfacing. */

type Reading = { value: number | null; source: "field" | "derived" | "conflict" | "none"; saw: number[] };

function numbersOf(re: RegExp, text: string, scale = 1): number[] {
  const out: number[] = [];
  let m: RegExpExecArray | null;
  const r = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
  while ((m = r.exec(text || ""))) {
    const n = parseFloat(m[1].replace(/[ ,](?=\d{3}\b)/g, "").replace(",", "."));
    if (Number.isFinite(n) && n > 0) out.push(n * scale);
  }
  return out;
}

function agree(a: number[], tolerance = 0.02): number | null {
  if (!a.length) return null;
  const max = Math.max(...a);
  const min = Math.min(...a);
  return max - min <= max * tolerance ? max : null;
}

/** Litres this product holds or supplies, from its own record. */
function readLitres(p: PackProduct, field: number | null): Reading {
  if (field !== null && field !== undefined) return { value: Number(field), source: "field", saw: [] };
  const fromName = [
    ...numbersOf(/(\d+(?:[.,]\d+)?)\s*(?:l|litre|liter)s?\b/i, p.name),
    ...numbersOf(/(\d+(?:[.,]\d+)?)\s*ml\b/i, p.name, 0.001),
  ];
  const fromContents = [
    ...numbersOf(/(\d+(?:[.,]\d+)?)\s*(?:l|litre|liter)s?\b/i, p.contents || ""),
  ];
  const nameV = agree(fromName);
  const contentsV = agree(fromContents);
  if (nameV !== null && contentsV !== null) {
    return agree([nameV, contentsV], 0.05) !== null
      ? { value: Math.max(nameV, contentsV), source: "derived", saw: [nameV, contentsV] }
      : { value: null, source: "conflict", saw: [nameV, contentsV] };
  }
  const only = nameV ?? contentsV;
  return only !== null ? { value: only, source: "derived", saw: [only] } : { value: null, source: "none", saw: [] };
}

/** Food energy, from its own record. */
function readKcal(p: PackProduct): Reading {
  if (p.kcalTotal !== null && p.kcalTotal !== undefined)
    return { value: Number(p.kcalTotal), source: "field", saw: [] };
  const fromName = agree(numbersOf(/(\d[\d ,.]*)\s*(?:kcal|calorie)/i, p.name));
  const fromContents = agree(numbersOf(/(\d[\d ,.]*)\s*(?:kcal|calorie)/i, p.contents || ""));
  if (fromName !== null && fromContents !== null) {
    return agree([fromName, fromContents], 0.02) !== null
      ? { value: fromName, source: "derived", saw: [fromName, fromContents] }
      : { value: null, source: "conflict", saw: [fromName, fromContents] };
  }
  const only = fromName ?? fromContents;
  return only !== null ? { value: only, source: "derived", saw: [only] } : { value: null, source: "none", saw: [] };
}

/** True when the item carries its own generation and cannot simply run out. */
function selfPowered(p: PackProduct): boolean {
  return /hand.?crank|wind.?up|dynamo|solar/i.test(p.powerSource || "");
}

/* ---------------- the coverage engine ---------------- */

function lineName(l: PackLine): string {
  return l.product?.name || l.unfilledLabel || "Unfilled slot";
}

function slotsRow(
  key: string,
  need: string,
  lines: PackLine[],
  copy: { full: string; partial: string; none: string }
): CoverageRow {
  const filled = lines.filter((l) => l.product);
  const unfilled = lines.filter((l) => !l.product);
  const state: CoverageState = !lines.length
    ? "none"
    : unfilled.length === 0
    ? "full"
    : filled.length === 0
    ? "none"
    : "partial";
  const headline =
    `${filled.length} of ${lines.length} line${lines.length === 1 ? "" : "s"} filled` +
    (unfilled.length ? ` — missing ${unfilled.map((l) => l.unfilledLabel).filter(Boolean).join(", ")}` : "");
  return {
    key,
    need,
    state,
    hours: null,
    basis: "lines filled",
    headline,
    detail: state === "full" ? copy.full : state === "none" ? copy.none : copy.partial,
    missingFields: [],
  };
}

/** Exported so the computation can be exercised against real catalogue strings
    without a database — the numbers on this strip are the page's whole claim. */
export function buildCoverage(lines: PackLine[]): CoverageRow[] {
  const of = (k: string) => lines.filter((l) => l.needKey === k);
  const rows: CoverageRow[] = [];

  /* ---- WATER: litres against 2 L per person per day ---- */
  {
    const ls = of("water");
    let storage = 0;
    let ready = 0;
    const conflicts: string[] = [];
    const missing = new Set<string>();
    let anyStorage = false;
    let anyReady = false;

    for (const l of ls) {
      if (!l.product) continue;
      const cap = readLitres(l.product, l.product.litresCapacity);
      const sup = readLitres(l.product, l.product.litresSupplied);
      // A container stores; a sachet supplies. The record tells us which by
      // whether it describes a vessel or a quantity of drinking water.
      const isVessel = /container|tainer|canister|jerry|bottle|carrier/i.test(l.product.name);
      if (isVessel) {
        if (cap.source === "conflict") conflicts.push(`${l.product.name} (${cap.saw.join(" L vs ")} L)`);
        else if (cap.value !== null) { storage += cap.value * l.qty; anyStorage = true; }
        else missing.add("products.litres_capacity");
      } else if (/water/i.test(l.product.name) && !/treatment|micropur|purif/i.test(l.product.name)) {
        if (sup.source === "conflict") conflicts.push(`${l.product.name} (${sup.saw.join(" L vs ")} L)`);
        else if (sup.value !== null) { ready += sup.value * l.qty; anyReady = true; }
        else missing.add("products.litres_supplied");
      }
    }

    const have = storage + ready;
    const measured = anyStorage || anyReady;
    const hours = measured ? Math.min(PACK_HOURS, (have / WATER_NEED_L) * PACK_HOURS) : null;
    rows.push({
      key: "water",
      need: "Drinking water",
      state: !measured ? "unknown" : have >= WATER_NEED_L ? "full" : have > 0 ? "partial" : "none",
      hours,
      basis: measured ? "measured" : "not computable",
      headline: measured
        ? `${have.toFixed(have % 1 ? 1 : 0)} L against a ${WATER_NEED_L} L need` +
          (anyStorage && !anyReady ? " — capacity to fill, not water in the box" : "")
        : "Cannot be computed from the catalogue",
      detail: measured
        ? `Two people at ${LITRES_PER_PERSON_DAY} litres a day for ${PACK_DAYS} days is ${WATER_NEED_L} litres.` +
          (anyStorage && !anyReady
            ? " The container is capacity, not contents — it covers this only if it is filled before the pressure drops."
            : "") +
          (conflicts.length ? ` Ready-to-drink water cannot be totalled: ${conflicts.join("; ")}.` : "")
        : `Nothing in these lines states a volume we can trust.${conflicts.length ? ` ${conflicts.join("; ")}.` : ""}`,
      missingFields: [...missing],
    });
  }

  /* ---- FOOD: kcal against 2,000 per person per day ---- */
  {
    const ls = of("food");
    let kcal = 0;
    let measured = false;
    const conflicts: string[] = [];
    const missing = new Set<string>();
    for (const l of ls) {
      if (!l.product) continue;
      const r = readKcal(l.product);
      if (r.source === "conflict")
        conflicts.push(`${l.product.name} records both ${r.saw[0].toLocaleString("en-GB")} and ${r.saw[1].toLocaleString("en-GB")} kcal`);
      else if (r.value !== null) { kcal += r.value * l.qty; measured = true; }
      else missing.add("products.kcal_total");
    }
    if (conflicts.length) missing.add("products.kcal_total");
    rows.push({
      key: "food",
      need: "Food",
      state: !measured ? "unknown" : kcal >= FOOD_NEED_KCAL ? "full" : kcal > 0 ? "partial" : "none",
      hours: measured ? Math.min(PACK_HOURS, (kcal / FOOD_NEED_KCAL) * PACK_HOURS) : null,
      basis: measured ? "measured" : "not computable",
      headline: measured
        ? `${kcal.toLocaleString("en-GB")} kcal against a ${FOOD_NEED_KCAL.toLocaleString("en-GB")} kcal need`
        : "Cannot be computed — the record contradicts itself",
      detail: measured
        ? `Two people at ${KCAL_PER_PERSON_DAY.toLocaleString("en-GB")} kcal a day for ${PACK_DAYS} days. No water, no cooking and no utensils needed, which is the reason this pack carries no stove.`
        : `${conflicts.join("; ")}. We will not pick the flattering number, and we will not pick the cautious one either — the record has to be fixed before this row can say anything.`,
      missingFields: [...missing],
    });
  }

  /* ---- INFORMATION: computed from how the thing is powered ---- */
  {
    const ls = of("information").filter((l) => l.product);
    const self = ls.filter((l) => selfPowered(l.product!));
    rows.push({
      key: "information",
      need: "Information",
      state: self.length ? "full" : ls.length ? "unknown" : "none",
      hours: self.length ? PACK_HOURS : null,
      basis: self.length ? "self-powered" : ls.length ? "not computable" : "lines filled",
      headline: self.length
        ? "Indefinite — nothing here has a battery to run out of"
        : ls.length
        ? "Cannot be computed"
        : "No line filled",
      detail: self.length
        ? `${self.map(lineName).join(", ")} — the record shows hand-crank and solar generation, so the limit is how long someone is willing to wind it, not how long a cell lasts.`
        : "The record does not say how these are powered.",
      missingFields: self.length ? [] : ["products.power_source"],
    });
  }

  /* ---- LIGHT: burn-hours, which we do not hold ---- */
  {
    const ls = of("light");
    const filled = ls.filter((l) => l.product);
    const withHours = filled.filter((l) => l.product!.burnHours !== null);
    const hours = withHours.reduce((a, l) => a + Number(l.product!.burnHours) * l.qty, 0);
    const info = of("information").filter((l) => l.product && /led|lamp|light|torch/i.test(l.product.name + " " + (l.product.description || "")));
    rows.push({
      key: "light",
      need: "Light",
      state: withHours.length ? (hours >= PACK_HOURS ? "full" : "partial") : filled.length || info.length ? "unknown" : "none",
      hours: withHours.length ? Math.min(PACK_HOURS, hours) : null,
      basis: withHours.length ? "measured" : "not computable",
      headline: withHours.length
        ? `${hours.toFixed(0)} burn-hours against ${PACK_HOURS}`
        : `${filled.length} of ${ls.length} light lines filled, and no burn-hours recorded for any of them`,
      detail: withHours.length
        ? "Totalled from the recorded burn time of every light in the box."
        : (info.length
            ? `The only light in the box is on ${info.map(lineName).join(", ")}. `
            : "") +
          (ls.length - filled.length
            ? `${ls.filter((l) => !l.product).map((l) => l.unfilledLabel).join(", ")} ${ls.length - filled.length === 1 ? "is" : "are"} unfilled. `
            : "") +
          "Even for what is in the box we hold no burn-hours figure, so this row cannot be drawn honestly.",
      missingFields: withHours.length ? [] : ["products.burn_hours", "products.lumens"],
    });
  }

  /* ---- WARMTH, HYGIENE, SANITATION: assessed by lines filled ---- */
  rows.push(
    slotsRow("warmth", "Warmth", of("warmth"), {
      full: "Every warmth line is filled. There is no heat source, deliberately — any heat source indoors is a carbon-monoxide risk we will not ship without a detector. These hold body heat rather than making any. How long they do that for is not a figure we record.",
      partial: "Part of the warmth provision is in the box.",
      none: "Nothing in the box addresses warmth.",
    }),
    slotsRow("hygiene", "Hygiene", of("hygiene"), {
      full: "Waterless by design — tablets to brush with, wipes, and a concentrated soap that works in cold water. Assessed by lines filled: none of these carry a quantity we could run a three-day figure against.",
      partial: "Part of the hygiene provision is in the box.",
      none: "Nothing in the box addresses washing.",
    }),
    slotsRow("sanitation", "Sanitation", of("sanitation"), {
      full: "Both sanitation lines are filled.",
      partial:
        "When the water stops, the toilet stops. There is paper in this box and, as it stands, nothing to use it with. This is the gap most kits never mention and it is the first one we are filling.",
      none: "Not covered at all.",
    })
  );

  return rows;
}

/* ---------------- load ---------------- */

const PRODUCT_FIELDS =
  "id,slug,sc_product_name,product_name,brand,product_status,image_urls,country_of_manufacture," +
  "weight,weight_grams,certifications_notes,shelf_life,power_source,included_contents,description," +
  "dangerous_goods,wholesale_price,selling_price,price_basis,currency," +
  "litres_capacity,litres_supplied,kcal_total,burn_hours,lumens,people_capacity";

function shape(p: any): PackProduct {
  return {
    id: p.id,
    name: p.sc_product_name || p.product_name || "Product",
    brand: p.brand ?? null,
    status: p.product_status ?? null,
    slug: p.slug ?? null,
    image: parseImages(p.image_urls)[0] ?? null,
    country: p.country_of_manufacture ?? null,
    weightGrams: p.weight_grams ?? null,
    weightText: p.weight ?? null,
    certifications: p.certifications_notes ?? null,
    shelfLife: p.shelf_life ?? null,
    powerSource: p.power_source ?? null,
    contents: p.included_contents ?? null,
    description: p.description ?? null,
    dangerousGoods: Boolean(p.dangerous_goods),
    wholesale: p.wholesale_price === null || p.wholesale_price === undefined ? null : Number(p.wholesale_price),
    selling: p.selling_price === null || p.selling_price === undefined ? null : Number(p.selling_price),
    priceBasis: p.price_basis ?? null,
    litresCapacity: p.litres_capacity === null || p.litres_capacity === undefined ? null : Number(p.litres_capacity),
    litresSupplied: p.litres_supplied === null || p.litres_supplied === undefined ? null : Number(p.litres_supplied),
    kcalTotal: p.kcal_total ?? null,
    burnHours: p.burn_hours === null || p.burn_hours === undefined ? null : Number(p.burn_hours),
    lumens: p.lumens ?? null,
  };
}

const EMPTY: PackData = {
  configured: false,
  product: null,
  priceIsPlaceholder: true,
  lines: [],
  slots: [],
  coverage: [],
  stats: {
    slots: 0, filled: 0, unfilled: 0, approved: 0, researching: 0, draft: 0,
    realCostBasis: 0, weighed: 0, tradeCostTotal: 0, tradeCostLines: 0, totalWeightGrams: 0,
  },
  faults: [],
  blockers: [],
};

export const PACK_SLUG = "72-hour-pack";

export async function getPack(slug = PACK_SLUG): Promise<PackData> {
  const sb = supabaseAdmin();
  if (!sb) return EMPTY;

  const { data: packRow } = await sb.from("products").select(PRODUCT_FIELDS).eq("slug", slug).maybeSingle();
  if (!packRow) return EMPTY;
  const product = shape(packRow);

  const { data: itemRows } = await sb
    .from("pack_items")
    .select("id,component_product_id,quantity,slot_label,need_key,sort_order,note,flag_label,flag_note")
    .eq("pack_product_id", product.id)
    .order("sort_order", { ascending: true });
  const items = (itemRows as any[]) || [];

  const ids = items.map((i) => i.component_product_id).filter(Boolean);
  const byId: Record<string, PackProduct> = {};
  if (ids.length) {
    const { data: comps } = await sb.from("products").select(PRODUCT_FIELDS).in("id", ids);
    for (const c of (comps as any[]) || []) byId[c.id] = shape(c);
  }

  const lines: PackLine[] = items.map((i) => ({
    id: i.id,
    slot: i.slot_label,
    needKey: i.need_key ?? null,
    qty: i.quantity,
    note: i.note ?? null,
    flagLabel: i.flag_label ?? null,
    flagNote: i.flag_note ?? null,
    product: i.component_product_id ? byId[i.component_product_id] ?? null : null,
    unfilledLabel: i.component_product_id ? null : i.flag_note ?? i.slot_label,
  }));

  // Manifest order: slots in the order their first line appears.
  const slots: { slot: string; lines: PackLine[] }[] = [];
  for (const l of lines) {
    let g = slots.find((s) => s.slot === l.slot);
    if (!g) { g = { slot: l.slot, lines: [] }; slots.push(g); }
    g.lines.push(l);
  }

  const filledLines = lines.filter((l) => l.product);
  const REAL_BASIS = new Set(["wholesale_x2_6", "landed_x2_2", "rrp_confirmed", "trade"]);
  const stats: PackStats = {
    slots: lines.length,
    filled: filledLines.length,
    unfilled: lines.length - filledLines.length,
    approved: filledLines.filter((l) => l.product!.status === "approved").length,
    researching: filledLines.filter((l) => l.product!.status === "researching").length,
    draft: filledLines.filter((l) => l.product!.status === "draft").length,
    realCostBasis: filledLines.filter((l) => REAL_BASIS.has(l.product!.priceBasis || "")).length,
    weighed: filledLines.filter((l) => l.product!.weightGrams).length,
    tradeCostLines: filledLines.filter((l) => l.product!.wholesale !== null).length,
    tradeCostTotal: Math.round(
      filledLines.reduce((a, l) => a + (l.product!.wholesale ?? 0) * l.qty, 0) * 100
    ) / 100,
    totalWeightGrams: filledLines.reduce((a, l) => a + (l.product!.weightGrams ?? 0) * l.qty, 0),
  };

  /* FAULTS ARE DERIVED, not typed. A page that lists known faults from a
     template stops finding new ones the day someone forgets to update it. */
  const faults: string[] = [];
  for (const l of filledLines) {
    const p = l.product!;
    if (p.wholesale !== null && p.selling !== null && p.wholesale >= p.selling)
      faults.push(`${p.name}: recorded cost €${p.wholesale.toFixed(2)} is at or above its selling price €${p.selling.toFixed(2)}.`);
    const k = readKcal(p);
    if (k.source === "conflict")
      faults.push(`${p.name}: the record states both ${k.saw[0].toLocaleString("en-GB")} and ${k.saw[1].toLocaleString("en-GB")} kcal.`);
    const v = readLitres(p, p.litresSupplied);
    if (v.source === "conflict")
      faults.push(`${p.name}: the record states both ${v.saw[0]} L and ${v.saw[1]} L.`);
    if (p.dangerousGoods)
      faults.push(`${p.name} is flagged as dangerous goods — rule R1 says the pack carries none.`);
    if (/li[- ]?ion|lithium/i.test(p.powerSource || ""))
      faults.push(`${p.name} contains a lithium cell (${p.powerSource}). Rule R1 excludes lithium power banks; a cell inside equipment is a different classification, but it is the same shipping question and nobody has answered it.`);
    if (!p.country || /missing|unknown|not (specified|stated)/i.test(p.country))
      faults.push(`${p.name}: country of manufacture is not recorded — GPSR traceability needs it.`);
  }

  const blockers = lines
    .filter((l) => l.flagLabel === "Blocking" || l.flagLabel === "Compliance")
    .map((l) => ({
      label: l.flagLabel!,
      line: l.product?.name || l.unfilledLabel || l.slot,
      note: l.flagNote || "",
    }));

  return {
    configured: true,
    product,
    priceIsPlaceholder: (product.priceBasis || "").startsWith("demo"),
    lines,
    slots,
    coverage: buildCoverage(lines),
    stats,
    faults,
    blockers,
  };
}
