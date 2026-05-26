import type { MetadataRoute } from "next";

const SITE_URL = "https://kikidult.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/admin/*",
          "/api/*",
          "/checkout",
          "/cart",
          "/mypage",
          "/mypage/*",
          "/orders",
          "/orders/*",
          "/support",
          "/support/*",
          "/login",
          "/signup",
          "/auth/*",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
