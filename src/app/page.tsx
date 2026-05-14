export const dynamic = "force-dynamic";

import { Suspense } from "react";
import Link from "next/link";
import { createSsrClient } from "@/lib/supabase/ssr";
import ShopGrid from "@/components/shop-grid";
import ShopSearchBar from "@/components/shop-search-bar";
import CategoryTabs from "@/components/category-tabs";
import type { Listing } from "@/lib/shop";
import { getTopPricedCardsAsListings, type ShopItem } from "@/lib/shop-data";

interface Props {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function HomePage({ searchParams }: Props) {
  const params = await searchParams;
  const category = params.category ?? "";
  const sort = params.sort ?? "newest";

  const supabase = await createSsrClient();
  let query = supabase
    .from("listings")
    .select("*")
    .eq("is_active", true)
    .gt("stock", 0);

  if (category === "pokemon" || category === "onepiece") {
    query = query.eq("category", category);
  }
  switch (sort) {
    case "price_asc":
      query = query.order("price_usd", { ascending: true });
      break;
    case "price_desc":
      query = query.order("price_usd", { ascending: false });
      break;
    default:
      query = query.order("created_at", { ascending: false });
  }
  query = query.limit(20);

  const { data } = await query;
  let items: ShopItem[] = ((data ?? []) as Listing[]).map((l) => ({ ...l, isDemo: false }));

  // listings가 비어있고 원피스 카테고리가 아니면 cards top 10 데모로 채움
  if (items.length === 0 && category !== "onepiece") {
    const demos = await getTopPricedCardsAsListings(supabase, 10);
    if (sort === "price_asc") demos.sort((a, b) => a.price_usd - b.price_usd);
    else if (sort === "price_desc") demos.sort((a, b) => b.price_usd - a.price_usd);
    items = demos;
  }

  function buildUrl(over: Record<string, string | undefined>) {
    const sp = new URLSearchParams();
    const merged = { category, sort, ...over };
    for (const [k, v] of Object.entries(merged)) if (v) sp.set(k, v);
    const s = sp.toString();
    return s ? `/?${s}` : "/";
  }

  const hasDemo = items.some((i) => i.isDemo);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex justify-center mb-4">
        <Suspense>
          <ShopSearchBar />
        </Suspense>
      </div>

      <CategoryTabs current={category} basePath="/" sort={sort} />

      <div className="flex items-center justify-between mb-4 mt-3">
        <span className="text-xs opacity-60">
          {items.length}개 상품
          {hasDemo && <span className="ml-2 px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[10px]">DEMO</span>}
        </span>
        <div className="flex items-center gap-1">
          {[
            { v: "newest", l: "최신순" },
            { v: "price_asc", l: "낮은가격" },
            { v: "price_desc", l: "높은가격" },
          ].map((s) => (
            <Link
              key={s.v}
              href={buildUrl({ sort: s.v })}
              className={`text-xs px-2 py-1 rounded ${
                sort === s.v
                  ? "bg-[var(--primary)] text-white"
                  : "opacity-60 hover:opacity-100"
              }`}
            >
              {s.l}
            </Link>
          ))}
        </div>
      </div>

      <ShopGrid listings={items} />

      {items.length >= 10 && (
        <div className="flex justify-center mt-8">
          <Link
            href={`/shop${category ? `?category=${category}` : ""}`}
            className="px-5 py-2.5 rounded-xl border border-[var(--border)] text-sm hover:bg-[var(--card-bg)]"
          >
            전체 상품 보기 →
          </Link>
        </div>
      )}
    </div>
  );
}
