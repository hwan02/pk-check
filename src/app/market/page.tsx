export const dynamic = "force-dynamic";

import Image from "next/image";
import Link from "next/link";
import { createSsrClient } from "@/lib/supabase/ssr";
import {
  formatKRW,
  latestByGrade,
  MARKET_CATEGORY_LABEL,
  PRODUCT_TYPE_LABEL,
  priceChangePct,
  type MarketCard,
  type ProductType,
} from "@/lib/market";
import { fetchActiveMarketCards } from "@/lib/market-query";

interface Props {
  searchParams: Promise<Record<string, string | undefined>>;
}

const SORTS: { value: string; label: string }[] = [
  { value: "order", label: "추천순" },
  { value: "newest", label: "최신순" },
];

const PRODUCT_TYPES: ProductType[] = ["single", "pack", "box"];

export default async function MarketPage({ searchParams }: Props) {
  const params = await searchParams;
  const category =
    params.category === "onepiece" ? ("onepiece" as const) : ("pokemon" as const);
  const productType: ProductType = (
    PRODUCT_TYPES as readonly string[]
  ).includes(params.type ?? "")
    ? (params.type as ProductType)
    : "single";
  const sort = params.sort ?? "order";

  const supabase = await createSsrClient();
  const { cards, historyByCard } = await fetchActiveMarketCards(
    supabase,
    category,
    productType,
  );

  // 정렬 — newest 만 별도 처리
  let displayCards: MarketCard[] = cards;
  if (sort === "newest") {
    displayCards = [...cards].sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  function buildUrl(overrides: Record<string, string | undefined>) {
    const sp = new URLSearchParams();
    const merged: Record<string, string | undefined> = {
      category,
      type: productType,
      sort,
      ...overrides,
    };
    for (const [k, v] of Object.entries(merged)) {
      if (k === "category" && v === "pokemon") continue; // 기본값
      if (k === "type" && v === "single") continue; // 기본값
      if (k === "sort" && v === "order") continue;
      if (v) sp.set(k, v);
    }
    const s = sp.toString();
    return s ? `/market?${s}` : "/market";
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <header className="mb-6 text-center">
        <p className="text-[10px] tracking-[0.3em] opacity-50 uppercase">MARKET</p>
        <h1 className="mt-2 text-2xl md:text-3xl font-black tracking-tight">시세</h1>
        <p className="mt-2 text-xs opacity-60">트레이딩 카드 등급별 시세 (원화)</p>
      </header>

      {/* 카테고리 탭 */}
      <div className="flex justify-center gap-1 mb-3">
        {(["pokemon", "onepiece"] as const).map((c) => (
          <Link
            key={c}
            href={buildUrl({ category: c })}
            className={`px-5 py-2 rounded-full text-sm font-semibold ${
              category === c
                ? "bg-[var(--primary)] text-white"
                : "border border-[var(--border)] opacity-70 hover:opacity-100"
            }`}
          >
            {MARKET_CATEGORY_LABEL[c]}
          </Link>
        ))}
      </div>

      {/* 상품 타입 서브탭 */}
      <div className="flex justify-center gap-1 mb-5">
        {PRODUCT_TYPES.map((t) => (
          <Link
            key={t}
            href={buildUrl({ type: t })}
            className={`px-3.5 py-1 rounded-full text-xs font-semibold ${
              productType === t
                ? "bg-[var(--foreground)] text-[var(--background)]"
                : "border border-[var(--border)] opacity-60 hover:opacity-100"
            }`}
          >
            {PRODUCT_TYPE_LABEL[t]}
          </Link>
        ))}
      </div>

      {/* 정렬 */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs opacity-60">
          {displayCards.length > 0 ? `${displayCards.length}장` : "데이터 준비 중"}
        </span>
        <div className="flex items-center gap-1">
          {SORTS.map((s) => (
            <Link
              key={s.value}
              href={buildUrl({ sort: s.value })}
              className={`text-[11px] px-2 py-1 rounded ${
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

      {/* 카드 그리드 */}
      {displayCards.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] py-20 text-center">
          <p className="text-sm opacity-60">아직 등록된 시세가 없습니다.</p>
        </div>
      ) : (
        <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-3 gap-y-6">
          {displayCards.map((c) => {
            const grades = latestByGrade(historyByCard.get(c.id) ?? []);
            const topGrade = grades[0];
            const ch = topGrade ? priceChangePct(topGrade.latest, topGrade.prev) : null;
            return (
              <li key={c.id}>
                <Link href={`/market/${c.id}`} className="block group">
                  <div className="rounded-xl overflow-hidden bg-[var(--surface)] border border-[var(--border)]">
                    <div className="aspect-square relative bg-white">
                      {c.image_url ? (
                        <Image
                          src={c.image_url}
                          alt={c.name}
                          fill
                          className="object-contain p-3 group-hover:scale-[1.03] transition-transform"
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs opacity-40">
                          no image
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-2.5 px-0.5">
                    {(c.set_name || c.rarity) && (
                      <p className="text-[10px] tracking-widest uppercase opacity-50 truncate">
                        {[c.set_name, c.rarity].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    <p className="text-[13px] font-bold leading-snug line-clamp-1 mt-0.5">
                      {c.name}
                    </p>
                    {c.name_en && (
                      <p className="text-[11px] opacity-50 line-clamp-1 mt-0.5">{c.name_en}</p>
                    )}
                    {topGrade ? (
                      <>
                        <div className="mt-1.5 flex items-baseline gap-2">
                          <p className="text-[15px] font-extrabold tracking-tight">
                            {formatKRW(topGrade.latest)}
                          </p>
                          {ch && (
                            <span
                              className={`text-[11px] font-semibold ${
                                ch.dir === "up"
                                  ? "text-red-600"
                                  : ch.dir === "down"
                                    ? "text-blue-600"
                                    : "opacity-50"
                              }`}
                            >
                              {ch.dir === "up" ? "▲" : ch.dir === "down" ? "▼" : "·"}{" "}
                              {Math.abs(ch.pct).toFixed(1)}%
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] opacity-50 mt-0.5">{topGrade.grade} 기준</p>
                      </>
                    ) : (
                      <p className="text-[11px] opacity-50 mt-1.5">시세 정보 없음</p>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
