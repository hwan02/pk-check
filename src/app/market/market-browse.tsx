"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  formatKRW,
  latestByGrade,
  MARKET_CATEGORY_LABEL,
  marketCardHref,
  priceChangePct,
  PRODUCT_TYPE_LABEL,
  type MarketCard,
  type MarketPriceRow,
  type ProductType,
} from "@/lib/market";

interface Props {
  cards: MarketCard[];
  history: MarketPriceRow[];
}

const SORTS: { value: string; label: string }[] = [
  { value: "order", label: "추천순" },
  { value: "newest", label: "최신순" },
  { value: "price_desc", label: "시세 높은순" },
  { value: "price_asc", label: "시세 낮은순" },
];

const TYPE_COLORS: Record<ProductType, string> = {
  box: "bg-amber-100 text-amber-900",
  pack: "bg-sky-100 text-sky-900",
  single: "bg-violet-100 text-violet-900",
};

export default function MarketBrowse({ cards, history }: Props) {
  const [category, setCategory] = useState<"all" | "pokemon" | "onepiece">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | ProductType>("all");
  const [sort, setSort] = useState<string>("order");
  const [q, setQ] = useState("");

  const historyByCard = useMemo(() => {
    const m = new Map<string, MarketPriceRow[]>();
    for (const r of history) {
      const arr = m.get(r.card_id) ?? [];
      arr.push(r);
      m.set(r.card_id, arr);
    }
    return m;
  }, [history]);

  const enriched = useMemo(() => {
    return cards.map((c) => {
      const grades = latestByGrade(historyByCard.get(c.id) ?? []);
      const top = grades[0];
      return { card: c, grades, topLatest: top?.latest ?? null, topGrade: top };
    });
  }, [cards, historyByCard]);

  const counts = useMemo(() => {
    const out = { all: 0, pokemon: 0, onepiece: 0 };
    for (const c of cards) {
      out.all++;
      out[c.category]++;
    }
    return out;
  }, [cards]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return enriched.filter(({ card }) => {
      if (category !== "all" && card.category !== category) return false;
      if (typeFilter !== "all" && card.product_type !== typeFilter) return false;
      if (needle) {
        const hay = `${card.name} ${card.name_en ?? ""} ${card.set_name ?? ""} ${card.rarity ?? ""}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [enriched, category, typeFilter, q]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    switch (sort) {
      case "newest":
        arr.sort((a, b) => b.card.created_at.localeCompare(a.card.created_at));
        break;
      case "price_desc":
        arr.sort((a, b) => (b.topLatest ?? -1) - (a.topLatest ?? -1));
        break;
      case "price_asc":
        arr.sort((a, b) => (a.topLatest ?? Infinity) - (b.topLatest ?? Infinity));
        break;
      default:
        arr.sort(
          (a, b) =>
            a.card.display_order - b.card.display_order ||
            b.card.created_at.localeCompare(a.card.created_at),
        );
    }
    return arr;
  }, [filtered, sort]);

  return (
    <>
      {/* 카테고리 탭 */}
      <div className="flex justify-center gap-1 mb-4 flex-wrap">
        {(["all", "pokemon", "onepiece"] as const).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={`px-5 py-2 rounded-full text-sm font-semibold ${
              category === c
                ? "bg-[var(--primary)] text-white"
                : "border border-[var(--border)] opacity-70 hover:opacity-100"
            }`}
          >
            {c === "all" ? "전체" : MARKET_CATEGORY_LABEL[c]}
            <span className="ml-1.5 text-[11px] opacity-70">{counts[c]}</span>
          </button>
        ))}
      </div>

      {/* 검색창 */}
      <div className="max-w-md mx-auto mb-4">
        <div className="relative">
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="카드 이름·세트·등급 검색"
            className="w-full pl-9 pr-9 py-2 rounded-full border border-[var(--border)] bg-[var(--card-bg)] text-sm focus:border-[var(--primary)] focus:outline-none"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40"
            width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          {q && (
            <button
              onClick={() => setQ("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs opacity-50 hover:opacity-100"
              aria-label="검색 지우기"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 타입 + 정렬 */}
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <div className="flex items-center gap-1 text-[11px]">
          {(["all", "box", "pack", "single"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTypeFilter(t)}
              className={`px-2 py-1 rounded ${
                typeFilter === t
                  ? "bg-[var(--primary)] text-white"
                  : "opacity-60 hover:opacity-100"
              }`}
            >
              {t === "all" ? "타입 전체" : PRODUCT_TYPE_LABEL[t as ProductType]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 text-[11px]">
          <span className="opacity-60 mr-1">{sorted.length}장</span>
          {SORTS.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setSort(s.value)}
              className={`px-2 py-1 rounded ${
                sort === s.value
                  ? "bg-[var(--primary)] text-white"
                  : "opacity-60 hover:opacity-100"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* 카드 그리드 */}
      {sorted.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] py-20 text-center">
          <p className="text-sm opacity-60">
            {cards.length === 0 ? "아직 등록된 시세가 없습니다." : "조건에 맞는 카드가 없어요."}
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-3 gap-y-6">
          {sorted.map(({ card: c, topGrade }) => {
            const ch = topGrade ? priceChangePct(topGrade.latest, topGrade.prev) : null;
            return (
              <li key={c.id}>
                <Link href={marketCardHref(c)} className="block group">
                  <div className="rounded-xl overflow-hidden bg-[var(--surface)] border border-[var(--border)] relative">
                    <span
                      className={`absolute top-1.5 left-1.5 z-10 text-[9px] px-1.5 py-0.5 rounded font-semibold ${TYPE_COLORS[c.product_type]}`}
                    >
                      {PRODUCT_TYPE_LABEL[c.product_type]}
                    </span>
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
                        <p className="text-[10px] opacity-50 mt-0.5">
                          {topGrade.grade} 기준
                          {c.list_price_krw != null && <> · 정가 {formatKRW(c.list_price_krw)}</>}
                        </p>
                      </>
                    ) : c.list_price_krw != null ? (
                      <p className="text-[13px] mt-1.5 opacity-80">
                        정가 <span className="font-semibold">{formatKRW(c.list_price_krw)}</span>
                      </p>
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
    </>
  );
}
