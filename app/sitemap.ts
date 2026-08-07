import type { MetadataRoute } from "next";

const SITE_URL = "https://www.askben.buzz";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["", "/whyben", "/privacy", "/security", "/terms"];

  return pages.map((path, index) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date("2026-08-07"),
    changeFrequency: index === 0 ? "weekly" : "monthly",
    priority: index === 0 ? 1 : 0.6,
  }));
}
