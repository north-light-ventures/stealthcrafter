import type { MetadataRoute } from "next";

const ROUTES = ["", "/countries", "/guides", "/sources", "/imprint", "/privacy"];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://www.stealthcrafter.com";
  const now = new Date();
  return ROUTES.map((r) => ({
    url: `${base}${r}`,
    lastModified: now,
    changeFrequency: r === "" || r === "/countries" ? "daily" : "monthly",
    priority: r === "" ? 1 : r === "/countries" ? 0.9 : 0.6,
  }));
}
