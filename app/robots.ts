import type { MetadataRoute } from "next";

/* Index the four public routes and the two legal pages. Everything else — the
   whole Command Center, the storefront, the pack, the basket, checkout, orders,
   Jimmy — sits under /admin behind the founder gate and must stay out of the
   index. The gate already redirects, but a crawler should not be finding the
   redirect in the first place. */
export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://www.stealthcrafter.com";
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/countries", "/guides", "/sources", "/imprint", "/privacy"],
        disallow: ["/admin", "/admin/", "/api/", "/login", "/pack"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
