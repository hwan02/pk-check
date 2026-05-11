import { Suspense } from "react";
import { notFound } from "next/navigation";
import CardGrid from "@/components/card-grid";
import Pagination from "@/components/pagination";
import SetRarityFilter from "@/components/set-rarity-filter";
import { createServerClient } from "@/lib/supabase/server";
import { ITEMS_PER_PAGE } from "@/lib/constants";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = createServerClient();
  const { data: set } = await supabase.from("sets").select("name").eq("id", id).single();
  if (!set) return { title: "세트를 찾을 수 없음" };
  return { title: `${set.name} - 포포시세` };
}

export default async function SetDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const rarity = sp.rarity ?? "";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10));

  const supabase = createServerClient();

  const { data: set } = await supabase.from("sets").select("*").eq("id", id).single();
  if (!set) notFound();

  // 세트 내 레어리티별 카드 수 집계
  const { data: rarityCounts } = await supabase
    .from("cards")
    .select("rarity, rarity_ja")
    .eq("set_id", id)
    .not("rarity", "is", null);

  const rarityMap = new Map<string, { count: number; label: string }>();
  const isKr = set.region === "kr";
  for (const row of rarityCounts ?? []) {
    if (!row.rarity) continue;
    const label = isKr ? (row.rarity_ja ?? row.rarity) : row.rarity;
    const prev = rarityMap.get(row.rarity);
    rarityMap.set(row.rarity, { count: (prev?.count ?? 0) + 1, label });
  }
  // 카드 수 많은 순 + 히트 레어리티 우선
  const hitRarities = [
    "Special Illustration Rare", "Illustration Rare", "Hyper Rare",
    "Ultra Rare", "Secret Rare", "ACE SPEC Rare", "Double Rare",
  ];
  const rarities = [...rarityMap.entries()]
    .map(([r, v]) => ({ rarity: r, count: v.count, label: v.label }))
    .sort((a, b) => {
      const aHit = hitRarities.indexOf(a.rarity);
      const bHit = hitRarities.indexOf(b.rarity);
      if (aHit >= 0 && bHit >= 0) return aHit - bHit;
      if (aHit >= 0) return -1;
      if (bHit >= 0) return 1;
      return b.count - a.count;
    });

  // 히트 카드 (SAR, AR, UR 등 고등급 카드, 가격 높은순)
  const { data: hitCards } = await supabase
    .from("cards")
    .select("*, prices(*), set:sets(*)")
    .eq("set_id", id)
    .in("rarity", hitRarities)
    .order("name", { ascending: true })
    .limit(20);

  const hits = (hitCards ?? [])
    .map((c) => ({
      ...c,
      prices: Array.isArray(c.prices) ? c.prices[0] ?? null : c.prices ?? null,
      set: Array.isArray(c.set) ? c.set[0] ?? null : c.set ?? null,
    }))
    .sort((a, b) => {
      const pa = a.prices?.tcg_market ?? 0;
      const pb = b.prices?.tcg_market ?? 0;
      return pb - pa;
    });

  // 필터된 카드 목록
  const from = (page - 1) * ITEMS_PER_PAGE;
  let cardQuery = supabase
    .from("cards")
    .select("*, prices(*), set:sets(*)", { count: "exact" })
    .eq("set_id", id);

  if (rarity) {
    cardQuery = cardQuery.eq("rarity", rarity);
  }

  cardQuery = cardQuery.order("number", { ascending: true }).range(from, from + ITEMS_PER_PAGE - 1);

  const { data, count } = await cardQuery;

  const cards = (data ?? []).map((c) => ({
    ...c,
    prices: Array.isArray(c.prices) ? c.prices[0] ?? null : c.prices ?? null,
    set: Array.isArray(c.set) ? c.set[0] ?? null : c.set ?? null,
  }));

  const total = count ?? 0;
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  const paginationBase = rarity ? `/sets/${id}?rarity=${encodeURIComponent(rarity)}` : `/sets/${id}`;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{set.name}</h1>
        <p className="text-sm opacity-60">
          {set.series} · {set.printed_total}장
          {set.release_date && ` · ${set.release_date}`}
        </p>

        {set.snkrdunk_box_price != null && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card-bg)] px-4 py-2">
            <span className="text-xs opacity-50">박스 시세 (snkrdunk)</span>
            <span className="text-lg font-bold text-blue-600">
              ¥{set.snkrdunk_box_price.toLocaleString()}
            </span>
          </div>
        )}
      </div>

      {/* Rarity Filter */}
      <Suspense>
        <SetRarityFilter setId={id} rarities={rarities} />
      </Suspense>

      {/* Hit Cards */}
      {hits.length > 0 && !rarity && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">히트 카드</h2>
          <CardGrid cards={hits} />
        </section>
      )}

      <p className="text-sm opacity-60 mb-4">
        {total.toLocaleString()}개 카드
        {rarity && <> · {rarity}</>}
      </p>

      <CardGrid cards={cards} />

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        baseUrl={paginationBase}
      />
    </div>
  );
}
