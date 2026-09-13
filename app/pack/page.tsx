import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/* The Desk asked for /pack. The storefront lives under /admin/site/* because
   that is what the founder gate in middleware.ts matches, and moving the page
   out from under it to shorten the URL would take it out from behind the gate.
   So /pack is a redirect: the short address Ace was promised, landing on the
   gated page rather than beside it. */
export default function PackShortcut() {
  redirect("/admin/site/pack");
}
