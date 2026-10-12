import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://gastronomia3300.dk";

  return ["/", "/menu", "/privacy", "/terms", "/cookies"].map((path) => ({
    url: `${baseUrl}${path}`,
    changeFrequency: "weekly",
    priority: path === "/" ? 1 : path === "/menu" ? 0.9 : 0.3,
  }));
}
