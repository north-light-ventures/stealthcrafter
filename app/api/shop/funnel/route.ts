// Four events, and only four. The CHECK constraint on funnel_events is what
// keeps that true — a fifth needs a migration and therefore a decision.
import { NextRequest, NextResponse } from "next/server";
import { requestIsAuthed } from "@/lib/auth";
import { guestKeyFromRequest, customerIdFromRequest } from "@/lib/customer-auth";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED = new Set(["selector", "reached_order", "add_to_basket", "lead"]);

export async function POST(req: NextRequest) {
  if (!(await requestIsAuthed(req))) return NextResponse.json({ ok: false }, { status: 401 });
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const event = String(body?.event || "");
  if (!ALLOWED.has(event)) return NextResponse.json({ ok: false }, { status: 400 });

  try {
    const sb = supabaseAdmin();
    await sb?.from("funnel_events").insert({
      event,
      country_iso2: body?.country ? String(body.country).slice(0, 2).toUpperCase() : null,
      people: Number(body?.people) || null,
      packs: Number(body?.packs) || null,
      // Not a tracking identifier: whichever basket key this visitor already
      // has, so a funnel can be read end to end without inventing a new cookie.
      session_key: customerIdFromRequest(req) || guestKeyFromRequest(req) || null,
    });
  } catch {
    /* instrumentation must never be able to break the page */
  }
  return NextResponse.json({ ok: true });
}
