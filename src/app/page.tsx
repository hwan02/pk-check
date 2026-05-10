export const dynamic = "force-dynamic";

import { Suspense } from "react";
import Link from "next/link";
import SearchBar from "@/components/search-bar";
import CardGrid from "@/components/card-grid";
import FilterBar from "@/components/filter-bar";
import Pagination from "@/components/pagination";
import { createServerClient } from "@/lib/supabase/server";
import { ITEMS_PER_PAGE } from "@/lib/constants";
import { expandSearchQuery } from "@/lib/translate";

interface Props {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function HomePage({ searchParams }: Props) {
  const params = await searchParams;
  const q = params.q ?? "";
  const rarity = params.rarity ?? "";
  const type = params.type ?? "";
  const supertype = params.supertype ?? "";
  const priced = params.priced ?? "";
  const sort = params.sort ?? "";
  const page = Math.max(1, parseInt(params.page ?? "1", 10));

  const hasSearch = q || rarity || type || supertype || priced || sort;

  const supabase = createServerClient();

  if (hasSearch) {
    // 검색/필터 모드
    let query = supabase
      .from("cards")
      .select("*, prices(*), set:sets(*)", { count: "exact" });

    if (q) {
      const keywords = await expandSearchQuery(q);
      const orConditions = keywords
        .map((kw) => `name.ilike.%${kw}%,name_ja.ilike.%${kw}%`)
        .join(",");
      query = query.or(orConditions);
    }
    if (rarity) query = query.eq("rarity", rarity);
    if (type) query = query.contains("types", [type]);
    if (supertype) query = query.eq("supertype", supertype);
    if (priced === "snkrdunk") query = query.not("prices.snkrdunk_price", "is", null);
    else if (priced === "tcg") query = query.not("prices.tcg_market", "is", null);
    else if (priced === "both") query = query.not("prices.snkrdunk_price", "is", null).not("prices.tcg_market", "is", null);

    switch (sort) {
      case "price_desc":
        query = query.order("tcg_market", { referencedTable: "prices", ascending: false, nullsFirst: false });
        break;
      case "price_asc":
        query = query.order("tcg_market", { referencedTable: "prices", ascending: true, nullsFirst: false });
        break;
      case "newest":
        query = query.order("updated_at", { ascending: false });
        break;
      default:
        query = query.order("name", { ascending: true });
    }

    const from = (page - 1) * ITEMS_PER_PAGE;
    query = query.range(from, from + ITEMS_PER_PAGE - 1);
    const { data, count } = await query;

    const cards = (data ?? []).map((c) => ({
      ...c,
      prices: Array.isArray(c.prices) ? c.prices[0] ?? null : c.prices ?? null,
      set: Array.isArray(c.set) ? c.set[0] ?? null : c.set ?? null,
    }));

    const total = count ?? 0;
    const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

    const baseParams = new URLSearchParams();
    if (q) baseParams.set("q", q);
    if (rarity) baseParams.set("rarity", rarity);
    if (type) baseParams.set("type", type);
    if (supertype) baseParams.set("supertype", supertype);
    if (priced) baseParams.set("priced", priced);
    if (sort) baseParams.set("sort", sort);
    const baseUrl = `/?${baseParams.toString()}`;

    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex justify-center mb-4">
          <SearchBar defaultValue={q} />
        </div>
        <Suspense>
          <FilterBar />
        </Suspense>
        <p className="text-sm opacity-60 mb-4">
          {total > 0 ? `${total.toLocaleString()}개 결과` : "결과 없음"}
          {q && <> &middot; &quot;{q}&quot;</>}
        </p>
        <CardGrid cards={cards} />
        <Pagination currentPage={page} totalPages={totalPages} baseUrl={baseUrl} />
      </div>
    );
  }

  // 기본 메인: 검색 + 퀵필터 + 인기카드
  const { data: topCards } = await supabase
    .from("cards")
    .select("*, prices(*), set:sets(*)")
    .not("prices.tcg_market", "is", null)
    .order("tcg_market", { referencedTable: "prices", ascending: false })
    .limit(12);

  const cards = (topCards ?? []).map((c) => ({
    ...c,
    prices: Array.isArray(c.prices) ? c.prices[0] ?? null : c.prices ?? null,
    set: Array.isArray(c.set) ? c.set[0] ?? null : c.set ?? null,
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <section className="mb-4">
        <div className="flex justify-center">
          <SearchBar />
        </div>
      </section>

      <Suspense>
        <FilterBar />
      </Suspense>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">인기 카드</h2>
          <Link href="/?sort=price_desc" className="text-sm text-[var(--primary)] hover:underline">
            전체보기
          </Link>
        </div>
        <CardGrid cards={cards} />
      </section>
    </div>
  );
}
