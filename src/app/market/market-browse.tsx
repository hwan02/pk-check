"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  MARKET_CATEGORY_LABEL,
  marketCardHref,
  type MarketCard,
} from "@/lib/market";

interface Props {
  all: MarketCard[]; // 활성 박스 + 팩 + 싱글 모두
}

// 등급 우선순위 (MUR > SAR > SSR > AR > RR > UR > HR > SR > ...)
const RARITY_RANK: Record<string, number> = {
  MUR: 1,
  SAR: 2, "Special Illustration Rare": 2,
  SSR: 3,
  AR: 4, "Illustration Rare": 4,
  RR: 5, "Double Rare": 5, RRR: 5,
  UR: 6, "Ultra Rare": 6,
  HR: 7, "Hyper Rare": 7,
  SR: 8, "Secret Rare": 8,
  MA: 9,
  "ACE SPEC Rare": 10,
  R: 11, Rare: 11,
  S: 12, "Shiny Rare": 12,
  U: 13, Uncommon: 13,
  C: 14, Common: 14,
};
const rank = (r: string | null) => (r ? RARITY_RANK[r] ?? 50 : 99);

export default function MarketBrowse({ all }: Props) {
  const [category, setCategory] = useState<"all" | "pokemon" | "onepiece">("all");
  const [q, setQ] = useState("");

  const boxes = useMemo(() => all.filter((c) => c.product_type === "box"), [all]);
  const packs = useMemo(() => all.filter((c) => c.product_type === "pack"), [all]);
  const singles = useMemo(() => all.filter((c) => c.product_type === "single"), [all]);

  // 박스 id → 카드들 (자식 팩의 자식 single 모음)
  const cardsByBox = useMemo(() => {
    // pack.parent_id → box, single.parent_id → pack
    const packToBox = new Map<string, string>();
    for (const p of packs) {
      if (p.parent_id) packToBox.set(p.id, p.parent_id);
    }
    const m = new Map<string, MarketCard[]>();
    for (const s of singles) {
      if (!s.parent_id) continue;
      // single 의 부모가 pack 인 경우 → pack 의 박스
      const boxId = packToBox.get(s.parent_id) ?? s.parent_id; // 또는 single 의 부모가 곧 박스인 경우
      const arr = m.get(boxId) ?? [];
      arr.push(s);
      m.set(boxId, arr);
    }
    // 등급 우선순위 정렬
    for (const arr of m.values()) {
      arr.sort((a, b) => {
        const ra = rank(a.rarity);
        const rb = rank(b.rarity);
        if (ra !== rb) return ra - rb;
        return a.display_order - b.display_order;
      });
    }
    return m;
  }, [packs, singles]);

  const counts = useMemo(() => {
    const out = { all: 0, pokemon: 0, onepiece: 0 };
    for (const b of boxes) {
      out.all++;
      out[b.category]++;
    }
    return out;
  }, [boxes]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return boxes.filter((b) => {
      if (category !== "all" && b.category !== category) return false;
      if (needle) {
        const cs = cardsByBox.get(b.id) ?? [];
        const hay = `${b.name} ${b.set_name ?? ""}`.toLowerCase();
        const matchCard = cs.some((c) =>
          `${c.name} ${c.name_en ?? ""} ${c.rarity ?? ""}`.toLowerCase().includes(needle),
        );
        if (!hay.includes(needle) && !matchCard) return false;
      }
      return true;
    });
  }, [boxes, cardsByBox, category, q]);

  return (
    <>
      {/* 카테고리 탭 + 검색 — 모바일/데스크탑 공통 가로 정렬 */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto">
        <div className="flex gap-1 shrink-0">
          {(["all", "pokemon", "onepiece"] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                category === c
                  ? "bg-[var(--primary)] text-white"
                  : "border border-[var(--border)] opacity-70 hover:opacity-100"
              }`}
            >
              {c === "all" ? "전체" : MARKET_CATEGORY_LABEL[c]}
              <span className="ml-1 text-[10px] opacity-70">{counts[c]}</span>
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[140px]">
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="검색"
            className="w-full pl-8 pr-7 py-1.5 rounded-full border border-[var(--border)] bg-[var(--card-bg)] text-xs focus:border-[var(--primary)] focus:outline-none"
          />
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 opacity-40"
            width="13" height="13" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          {q && (
            <button
              onClick={() => setQ("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs opacity-50 hover:opacity-100"
              aria-label="검색 지우기"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] py-20 text-center">
          <p className="text-sm opacity-60">
            {boxes.length === 0 ? "아직 등록된 박스가 없습니다." : "결과 없음"}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((box) => {
            const cards = cardsByBox.get(box.id) ?? [];
            return (
              <li
                key={box.id}
                className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden"
              >
                <div className="flex items-stretch">
                  {/* 좌측: 박스 카드 */}
                  <Link
                    href={marketCardHref(box)}
                    className="shrink-0 w-[110px] sm:w-[140px] p-2 group hover:bg-[var(--surface)]/40 transition flex flex-col items-center"
                  >
                    <div className="aspect-square w-full relative rounded-lg overflow-hidden bg-white">
                      {box.image_url ? (
                        <Image
                          src={box.image_url}
                          alt={box.name}
                          fill
                          sizes="140px"
                          className="object-contain p-1.5 group-hover:scale-[1.04] transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] opacity-40">
                          no image
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] sm:text-[11px] font-bold mt-1.5 text-center line-clamp-2 leading-tight">
                      {box.name}
                    </p>
                  </Link>

                  {/* 우측: 카드 가로 슬라이드 */}
                  <div className="flex-1 min-w-0 border-l border-[var(--border)]">
                    {cards.length === 0 ? (
                      <div className="h-full flex items-center justify-center p-4">
                        <p className="text-xs opacity-50">Hit 카드 준비 중</p>
                      </div>
                    ) : (
                      <div
                        className="flex gap-2 sm:gap-3 overflow-x-auto p-2 sm:p-3 h-full items-center scroll-smooth"
                        style={{ scrollSnapType: "x mandatory" }}
                      >
                        {cards.map((c) => (
                          <Link
                            key={c.id}
                            href={marketCardHref(c)}
                            className="shrink-0 w-[88px] sm:w-[110px] group"
                            style={{ scrollSnapAlign: "start" }}
                          >
                            <div className="aspect-[3/4] relative rounded-lg overflow-hidden bg-white border border-[var(--border)] group-hover:border-[var(--border-strong)] group-hover:shadow-md transition">
                              {c.image_url ? (
                                <Image
                                  src={c.image_url}
                                  alt={c.name}
                                  fill
                                  sizes="110px"
                                  className="object-contain p-1 group-hover:scale-[1.05] transition-transform duration-300"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[9px] opacity-40">
                                  no image
                                </div>
                              )}
                              {c.rarity && (
                                <span className="absolute top-1 left-1 text-[8px] sm:text-[9px] px-1 py-0.5 rounded bg-black/75 text-white font-semibold">
                                  {c.rarity}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] sm:text-[11px] font-bold mt-1 line-clamp-1 leading-snug">
                              {c.name}
                            </p>
                          </Link>
                        ))}
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
