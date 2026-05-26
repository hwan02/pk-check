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
  type MarketCard,
  type MarketPriceRow,
} from "@/lib/market";

interface Props {
  cards: MarketCard[];
  history: MarketPriceRow[];
}

export default function MarketBrowse({ cards, history }: Props) {
  const [category, setCategory] = useState<"all" | "pokemon" | "onepiece">("all");
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

  const counts = useMemo(() => {
    const out = { all: 0, pokemon: 0, onepiece: 0 };
    for (const c of cards) {
      out.all++;
      out[c.category]++;
    }
    return out;
  }, [cards]);

  // 팩 단위 그룹: pack 행 + 그 자식 single 카드들
  const groups = useMemo(() => {
    const packs = cards
      .filter((c) => c.product_type === "pack")
      .filter((p) => category === "all" || p.category === category);
    const singlesByParent = new Map<string, MarketCard[]>();
    for (const c of cards) {
      if (c.product_type !== "single" || !c.parent_id) continue;
      const arr = singlesByParent.get(c.parent_id) ?? [];
      arr.push(c);
      singlesByParent.set(c.parent_id, arr);
    }
    // single 도 display_order 기준 정렬
    for (const arr of singlesByParent.values()) {
      arr.sort((a, b) => a.display_order - b.display_order);
    }

    const needle = q.trim().toLowerCase();
    return packs
      .map((pack) => {
        const allCards = singlesByParent.get(pack.id) ?? [];
        // 검색: pack 이름 또는 카드 이름 매칭
        if (needle) {
          const packHay = `${pack.name} ${pack.set_name ?? ""}`.toLowerCase();
          const matched = allCards.filter((c) =>
            `${c.name} ${c.name_en ?? ""} ${c.rarity ?? ""}`.toLowerCase().includes(needle),
          );
          if (!packHay.includes(needle) && matched.length === 0) return null;
        }
        return { pack, cards: allCards };
      })
      .filter((g): g is { pack: MarketCard; cards: MarketCard[] } => g !== null);
  }, [cards, category, q]);

  // 부모 박스 정보 매핑 — 팩의 박스
  const parentById = useMemo(() => {
    const m = new Map<string, MarketCard>();
    for (const c of cards) m.set(c.id, c);
    return m;
  }, [cards]);

  return (
    <>
      {/* 카테고리 탭 */}
      <div className="flex justify-center gap-1 mb-4 flex-wrap">
        {(["all", "pokemon", "onepiece"] as const).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition ${
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
      <div className="max-w-md mx-auto mb-6">
        <div className="relative">
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="팩·카드 이름·등급 검색"
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

      {/* 팩 단위 행 */}
      {groups.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] py-20 text-center">
          <p className="text-sm opacity-60">
            {cards.length === 0 ? "아직 등록된 시세가 없습니다." : "조건에 맞는 결과가 없어요."}
          </p>
        </div>
      ) : (
        <ul className="space-y-6">
          {groups.map(({ pack, cards: childCards }, idx) => {
            const parentBox = pack.parent_id ? parentById.get(pack.parent_id) : null;
            return (
              <li
                key={pack.id}
                className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden animate-fade-in"
                style={{ animationDelay: `${Math.min(idx * 60, 600)}ms` }}
              >
                <div className="flex">
                  {/* 좌측: 팩 카드 */}
                  <Link
                    href={marketCardHref(pack)}
                    className="shrink-0 w-[140px] sm:w-[170px] p-3 sm:p-4 flex flex-col items-center group hover:bg-[var(--surface)]/40 transition"
                  >
                    <div className="aspect-[3/4] w-full relative rounded-lg overflow-hidden bg-white">
                      {pack.image_url ? (
                        <Image
                          src={pack.image_url}
                          alt={pack.name}
                          fill
                          sizes="170px"
                          className="object-contain p-1 group-hover:scale-[1.04] transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs opacity-40">no image</div>
                      )}
                    </div>
                    <p className="text-[11px] font-bold mt-2 text-center line-clamp-2 leading-snug">
                      {pack.name}
                    </p>
                    {parentBox && (
                      <p className="text-[9px] opacity-50 mt-0.5 text-center line-clamp-1">
                        {parentBox.name}
                      </p>
                    )}
                  </Link>

                  {/* 우측: 카드 가로 슬라이드 */}
                  <div className="flex-1 min-w-0 border-l border-[var(--border)] py-3 sm:py-4">
                    {childCards.length === 0 ? (
                      <div className="h-full flex items-center justify-center px-4">
                        <p className="text-xs opacity-50">카드 시세 준비 중</p>
                      </div>
                    ) : (
                      <div
                        className="flex gap-3 overflow-x-auto px-3 sm:px-4 scroll-smooth"
                        style={{ scrollSnapType: "x mandatory" }}
                      >
                        {childCards.map((c) => {
                          const top = latestByGrade(historyByCard.get(c.id) ?? [])[0];
                          const ch = top ? priceChangePct(top.latest, top.prev) : null;
                          return (
                            <Link
                              key={c.id}
                              href={marketCardHref(c)}
                              className="shrink-0 w-[120px] sm:w-[140px] group"
                              style={{ scrollSnapAlign: "start" }}
                            >
                              <div className="aspect-[3/4] relative rounded-lg overflow-hidden bg-white border border-[var(--border)] group-hover:border-[var(--border-strong)] group-hover:shadow-md transition">
                                {c.image_url ? (
                                  <Image
                                    src={c.image_url}
                                    alt={c.name}
                                    fill
                                    sizes="140px"
                                    className="object-contain p-1.5 group-hover:scale-[1.05] transition-transform duration-300"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-[10px] opacity-40">no image</div>
                                )}
                                {c.rarity && (
                                  <span className="absolute top-1.5 left-1.5 text-[9px] px-1.5 py-0.5 rounded bg-black/70 text-white font-semibold">
                                    {c.rarity}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] font-bold mt-1.5 line-clamp-1 leading-snug">
                                {c.name}
                              </p>
                              {top ? (
                                <div className="flex items-baseline gap-1.5 mt-0.5">
                                  <p className="text-[12px] font-extrabold tracking-tight">
                                    {formatKRW(top.latest)}
                                  </p>
                                  {ch && (
                                    <span
                                      className={`text-[10px] font-semibold ${
                                        ch.dir === "up"
                                          ? "text-red-600"
                                          : ch.dir === "down"
                                            ? "text-blue-600"
                                            : "opacity-50"
                                      }`}
                                    >
                                      {ch.dir === "up" ? "▲" : ch.dir === "down" ? "▼" : ""}
                                      {Math.abs(ch.pct).toFixed(0)}%
                                    </span>
                                  )}
                                </div>
                              ) : c.list_price_krw != null ? (
                                <p className="text-[11px] opacity-70 mt-0.5">
                                  정가 {formatKRW(c.list_price_krw)}
                                </p>
                              ) : (
                                <p className="text-[10px] opacity-50 mt-0.5">시세 준비 중</p>
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
