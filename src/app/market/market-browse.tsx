"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  MARKET_CATEGORY_LABEL,
  marketCardHref,
  type MarketCard,
  type MarketPriceRow,
} from "@/lib/market";

interface Props {
  cards: MarketCard[]; // 박스 + 팩 + 싱글 모두 (비활성 포함)
  boxes: MarketCard[]; // 박스만 별도 (cards 의 부분집합)
  history: MarketPriceRow[]; // 추후 시세 표시 시 사용
}

// 등급 우선순위 (낮을수록 비싼/희귀)
const RARITY_RANK: Record<string, number> = {
  MUR: 1,
  SAR: 2,
  "Special Illustration Rare": 2,
  SSR: 3,
  UR: 4,
  "Ultra Rare": 4,
  HR: 5,
  "Hyper Rare": 5,
  SR: 6,
  "Secret Rare": 6,
  AR: 7,
  "Illustration Rare": 7,
  MA: 8,
  RR: 9,
  "Double Rare": 9,
  RRR: 9,
  "ACE SPEC Rare": 10,
  R: 11,
  Rare: 11,
  S: 12,
  "Shiny Rare": 12,
  U: 13,
  Uncommon: 13,
  C: 14,
  Common: 14,
};

function rarityRank(r: string | null): number {
  if (!r) return 99;
  return RARITY_RANK[r] ?? 50;
}

export default function MarketBrowse({ cards, boxes }: Props) {
  const [category, setCategory] = useState<"all" | "pokemon" | "onepiece">("all");
  const [q, setQ] = useState("");

  const counts = useMemo(() => {
    const out = { all: 0, pokemon: 0, onepiece: 0 };
    for (const c of cards) {
      if (c.product_type !== "single") continue;
      out.all++;
      out[c.category]++;
    }
    return out;
  }, [cards]);

  const cardById = useMemo(() => {
    const m = new Map<string, MarketCard>();
    for (const c of cards) m.set(c.id, c);
    return m;
  }, [cards]);

  // 각 행: 팩 1개 + 그 팩의 박스(부모) + 그 팩의 자식 카드들
  const rows = useMemo(() => {
    const childrenByParent = new Map<string, MarketCard[]>();
    for (const c of cards) {
      if (c.product_type !== "single" || !c.parent_id) continue;
      const arr = childrenByParent.get(c.parent_id) ?? [];
      arr.push(c);
      childrenByParent.set(c.parent_id, arr);
    }
    // 카드 등급 우선순위 정렬
    for (const arr of childrenByParent.values()) {
      arr.sort((a, b) => {
        const ra = rarityRank(a.rarity);
        const rb = rarityRank(b.rarity);
        if (ra !== rb) return ra - rb;
        return a.display_order - b.display_order;
      });
    }

    const packs = cards.filter((c) => c.product_type === "pack");
    const result = packs
      .filter((p) => category === "all" || p.category === category)
      .map((pack) => {
        const box = pack.parent_id ? cardById.get(pack.parent_id) ?? null : null;
        const childCards = childrenByParent.get(pack.id) ?? [];
        return { pack, box, cards: childCards };
      });

    // 검색
    const needle = q.trim().toLowerCase();
    if (!needle) return result;
    return result.filter(({ pack, box, cards: cs }) => {
      const hay = `${pack.name} ${pack.set_name ?? ""} ${box?.name ?? ""}`.toLowerCase();
      if (hay.includes(needle)) return true;
      return cs.some((c) =>
        `${c.name} ${c.name_en ?? ""} ${c.rarity ?? ""}`.toLowerCase().includes(needle),
      );
    });
  }, [cards, cardById, category, q]);

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
            placeholder="박스·팩·카드 이름 검색"
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

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] py-20 text-center">
          <p className="text-sm opacity-60">
            {cards.length === 0 ? "아직 등록된 데이터가 없습니다." : "조건에 맞는 결과가 없어요."}
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {rows.map(({ pack, box, cards: childCards }, idx) => (
            <li
              key={pack.id}
              className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden animate-fade-in"
              style={{ animationDelay: `${Math.min(idx * 60, 600)}ms` }}
            >
              <div className="flex items-stretch">
                {/* 좌측: 박스 + 팩 (1:1 비율, 세로 분리) */}
                <div className="shrink-0 flex">
                  {/* 박스 */}
                  {box && (
                    <ContainerThumb card={box} label="BOX" />
                  )}
                  {/* 팩 */}
                  <ContainerThumb card={pack} label="PACK" />
                </div>

                {/* 우측: 카드 가로 슬라이드 */}
                <div className="flex-1 min-w-0 border-l border-[var(--border)]">
                  {childCards.length === 0 ? (
                    <div className="h-full flex items-center justify-center px-4 py-6">
                      <p className="text-xs opacity-50">카드 미등록</p>
                    </div>
                  ) : (
                    <div
                      className="flex gap-2 sm:gap-3 overflow-x-auto px-3 py-3 scroll-smooth h-full items-center"
                      style={{ scrollSnapType: "x mandatory" }}
                    >
                      {childCards.map((c) => (
                        <CardChip key={c.id} card={c} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

    </>
  );
}

/* ───────────── 박스 / 팩 썸네일 (좌측) ───────────── */
function ContainerThumb({ card, label }: { card: MarketCard; label: "BOX" | "PACK" }) {
  const inner = (
    <div className="aspect-square w-[110px] sm:w-[130px] relative bg-white">
      {card.image_url ? (
        <Image
          src={card.image_url}
          alt={card.name}
          fill
          sizes="130px"
          className="object-contain p-2 group-hover:scale-[1.04] transition-transform duration-300"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-[10px] opacity-40">
          no image
        </div>
      )}
      <span
        className={`absolute top-1.5 left-1.5 text-[9px] px-1.5 py-0.5 rounded font-bold tracking-wider ${
          label === "BOX"
            ? "bg-amber-100 text-amber-900"
            : "bg-sky-100 text-sky-900"
        }`}
      >
        {label}
      </span>
      <p className="absolute bottom-0 left-0 right-0 px-1.5 py-1 text-[9px] sm:text-[10px] font-bold leading-tight line-clamp-2 bg-gradient-to-t from-white via-white/90 to-transparent">
        {card.name}
      </p>
    </div>
  );

  const wrapClass =
    "shrink-0 border-r border-[var(--border)] group relative " +
    (card.is_active ? "hover:bg-[var(--surface)]/40 transition" : "opacity-60");

  return card.is_active ? (
    <Link href={marketCardHref(card)} className={wrapClass}>
      {inner}
    </Link>
  ) : (
    <div className={wrapClass}>{inner}</div>
  );
}

/* ───────────── 카드 칩 (시세 표시 X — 추후 활성화) ───────────── */
function CardChip({ card }: { card: MarketCard }) {
  const inner = (
    <>
      <div className="aspect-[3/4] relative rounded-lg overflow-hidden bg-white border border-[var(--border)] group-hover:border-[var(--border-strong)] group-hover:shadow-md transition">
        {card.image_url ? (
          <Image
            src={card.image_url}
            alt={card.name}
            fill
            sizes="110px"
            className="object-contain p-1.5 group-hover:scale-[1.05] transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[10px] opacity-40">no image</div>
        )}
        {card.rarity && (
          <span className="absolute top-1.5 left-1.5 text-[9px] px-1.5 py-0.5 rounded bg-black/75 text-white font-semibold">
            {card.rarity}
          </span>
        )}
      </div>
      <p className="text-[11px] font-bold mt-1.5 line-clamp-1 leading-snug">{card.name}</p>
      {/* 시세 표시는 데이터 완성 시 활성화. 지금은 숨김 */}
    </>
  );

  const baseClass =
    "shrink-0 w-[100px] sm:w-[120px] group";
  const styleSnap = { scrollSnapAlign: "start" as const };

  return card.is_active ? (
    <Link href={marketCardHref(card)} className={baseClass} style={styleSnap}>
      {inner}
    </Link>
  ) : (
    <div className={baseClass + " opacity-50"} style={styleSnap}>
      {inner}
    </div>
  );
}
