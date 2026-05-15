export const dynamic = "force-dynamic";

import { Suspense } from "react";
import Link from "next/link";
import { createSsrClient } from "@/lib/supabase/ssr";
import ShopGrid from "@/components/shop-grid";
import ShopSearchBar from "@/components/shop-search-bar";
import CategoryTabs from "@/components/category-tabs";
import type { Listing } from "@/lib/shop";
import { ITEMS_PER_PAGE } from "@/lib/constants";

interface Props {
  searchParams: Promise<Record<string, string | undefined>>;
}

const SORTS: { value: string; label: string }[] = [
  { value: "newest", label: "최신순" },
  { value: "price_asc", label: "가격 낮은순" },
  { value: "price_desc", label: "가격 높은순" },
];

export default async function ShopPage({ searchParams }: Props) {
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const category = params.category ?? "";
  const sort = params.sort ?? "newest";
  const page = Math.max(1, parseInt(params.page ?? "1", 10));

  const supabase = await createSsrClient();
  let query = supabase
    .from("listings")
    .select("*", { count: "exact" })
    .eq("is_active", true)
    .gt("stock", 0);

  if (category === "pokemon" || category === "onepiece") {
    query = query.eq("category", category);
  }
  if (q) {
    query = query.or(`title.ilike.%${q}%,title_en.ilike.%${q}%`);
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

  const from = (page - 1) * ITEMS_PER_PAGE;
  query = query.range(from, from + ITEMS_PER_PAGE - 1);

  const { data, count } = await query;
  const items = (data ?? []) as Listing[];
  const total = count ?? 0;
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  function buildUrl(overrides: Record<string, string | undefined>) {
    const sp = new URLSearchParams();
    const merged = { q, category, sort, ...overrides };
    for (const [k, v] of Object.entries(merged)) {
      if (v) sp.set(k, v);
    }
    const s = sp.toString();
    return s ? `/shop?${s}` : "/shop";
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex justify-center mb-6">
        <Suspense>
          <ShopSearchBar defaultValue={q} />
        </Suspense>
      </div>

      <CategoryTabs current={category} basePath="/shop" sort={sort} q={q} />

      <div className="flex items-center justify-between mb-4 mt-3">
        <span className="text-xs opacity-60">
          {total > 0 ? `${total.toLocaleString()}개 상품` : "상품 없음"}
          {q && <> · &quot;{q}&quot;</>}
        </span>
        <div className="flex items-center gap-1">
          {SORTS.map((s) => (
            <Link
              key={s.value}
              href={buildUrl({ sort: s.value, page: undefined })}
              className={`text-xs px-2 py-1 rounded ${
                sort === s.value
                  ? "bg-[var(--primary)] text-white"
                  : "opacity-60 hover:opacity-100"
              }`}
            >
              {s.label}
            </Link>
          ))}
        </div>
      </div>

      <ShopGrid listings={items} />

      {totalPages > 1 && (
        <div className="flex justify-center gap-1 mt-8">
          {Array.from({ length: totalPages }).map((_, i) => {
            const p = i + 1;
            return (
              <Link
                key={p}
                href={buildUrl({ page: p === 1 ? undefined : String(p) })}
                className={`text-sm px-3 py-1.5 rounded ${
                  p === page
                    ? "bg-[var(--primary)] text-white"
                    : "border border-[var(--border)] hover:bg-[var(--card-bg)]"
                }`}
              >
                {p}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

