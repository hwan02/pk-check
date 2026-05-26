import type { MetadataRoute } from "next";
import { createServerClient } from "@/lib/supabase/server";

const SITE_URL = "https://kikidult.com";

export const revalidate = 3600; // 1시간 캐시

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // 정적 페이지
  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/shop`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/shop?category=pokemon`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/shop?category=onepiece`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/legal/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/legal/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  // 동적 상품 페이지
  try {
    const db = createServerClient();
    const { data } = await db
      .from("listings")
      .select("id, short_id, updated_at")
      .eq("is_active", true)
      .gt("stock", 0)
      .order("updated_at", { ascending: false })
      .limit(5000);

    const listings: MetadataRoute.Sitemap = (data ?? []).map(
      (l: { id: string; short_id: string | null; updated_at: string }) => ({
        url: `${SITE_URL}/shop/${l.short_id ?? l.id}`,
        lastModified: new Date(l.updated_at),
        changeFrequency: "weekly" as const,
        priority: 0.7,
      }),
    );
    return [...staticPages, ...listings];
  } catch {
    return staticPages;
  }
}
