// Readiness-plan capture. PERSONAL DATA — see the comment in lead-capture.tsx.
//
// The consent wording shown on screen is stored verbatim with its timestamp, so
// what someone agreed to is evidence rather than a boolean. Nothing is sent:
// there is no transactional email provider, and the response says so rather
// than implying a message is on its way.
import { NextRequest, NextResponse } from "next/server";
import { requestIsAuthed } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!(await requestIsAuthed(req)))
    return NextResponse.json({ ok: false, message: "unauthorized" }, { status: 401 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "We could not read that." }, { status: 400 });
  }

  const email = String(body?.email || "").trim().toLowerCase();
  const consentText = String(body?.consentText || "").trim();
  if (!email.includes("@") || email.length < 5)
    return NextResponse.json({ ok: false, message: "That does not look like an email address." });
  if (!consentText)
    return NextResponse.json({ ok: false, message: "We cannot store this without your consent." });

  try {
    const sb = supabaseAdmin();
    if (!sb) return NextResponse.json({ ok: false, message: "Not connected just now." });

    // Idempotent on the address: someone pressing twice should not become two
    // rows, and re-consenting should refresh the record rather than duplicate it.
    const { data: existing } = await sb.from("pack_leads").select("id").ilike("email", email).maybeSingle();
    if (existing) {
      await sb
        .from("pack_leads")
        .update({
          household_size: Number(body?.people) || null,
          country_iso2: body?.country ? String(body.country).slice(0, 2).toUpperCase() : null,
          consent_text: consentText,
          consent_at: new Date().toISOString(),
          unsubscribed_at: null,
        })
        .eq("id", (existing as any).id);
    } else {
      await sb.from("pack_leads").insert({
        email,
        household_size: Number(body?.people) || null,
        country_iso2: body?.country ? String(body.country).slice(0, 2).toUpperCase() : null,
        source: String(body?.source || "pack-funnel").slice(0, 64),
        consent_text: consentText,
      });
    }

    // The send that does not exist, logged where a real one would go — the same
    // stub shape as the order confirmation in app/api/shop/checkout/route.ts.
    console.log(`[readiness-plan-email:STUB] to=${email} household=${body?.people} country=${body?.country}`);

    return NextResponse.json({
      ok: true,
      message: "Stored. Nothing has been sent — transactional email is not connected yet.",
    });
  } catch {
    return NextResponse.json({ ok: false, message: "We could not save that just now." });
  }
}
