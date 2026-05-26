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
  boxes: MarketCard[]; // 비활성 포함 박스 — 그룹 헤더용
  history: MarketPriceRow[];
}

export default function MarketBrowse({ cards, boxes, history }: Props) {
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

  // 카드 id → card 매핑 (활성 카드 + 모든 박스)
  const cardById = useMemo(() => {
    const m = new Map<string, MarketCard>();
    for (const c of cards) m.set(c.id, c);
    for (const b of boxes) if (!m.has(b.id)) m.set(b.id, b);
    return m;
  }, [cards, boxes]);

  /**
   * 그룹화:
   * - 박스 단위로 그룹
   * - 박스 헤더 + 그 박스 자식 팩들 + 각 팩의 자식 카드들
   * - 박스가 없는(고아) 팩도 별도 그룹 ("기타")
   * - 박스가 없는 자유 카드(부모가 박스 없거나 박스 자식 single 그룹)도 처리
   */
  const groups = useMemo(() => {
    type Group = {
      box: MarketCard | null;
      boxId: string;
      packs: { pack: MarketCard; cards: MarketCard[] }[];
    };
    const groupMap = new Map<string, Group>();

    // 팩 → 자식 단일 카드 모음
    const childrenByParent = new Map<string, MarketCard[]>();
    for (const c of cards) {
      if (!c.parent_id) continue;
      const arr = childrenByParent.get(c.parent_id) ?? [];
      arr.push(c);
      childrenByParent.set(c.parent_id, arr);
    }
    for (const arr of childrenByParent.values()) {
      arr.sort((a, b) => a.display_order - b.display_order);
    }

    function getOrCreateGroup(boxId: string, box: MarketCard | null): Group {
      const cached = groupMap.get(boxId);
      if (cached) return cached;
      const g: Group = { box, boxId, packs: [] };
      groupMap.set(boxId, g);
      return g;
    }

    // 활성 팩들을 박스 그룹에 매핑
    for (const pack of cards) {
      if (pack.product_type !== "pack") continue;
      if (category !== "all" && pack.category !== category) continue;

      const childCards = (childrenByParent.get(pack.id) ?? []).filter(
        (c) => c.product_type === "single",
      );

      const boxId = pack.parent_id ?? "__orphan__";
      const box = pack.parent_id ? cardById.get(pack.parent_id) ?? null : null;
      const g = getOrCreateGroup(boxId, box);
      g.packs.push({ pack, cards: childCards });
    }

    // 검색 필터
    const needle = q.trim().toLowerCase();
    const filtered: Group[] = [];
    for (const g of groupMap.values()) {
      if (!needle) {
        filtered.push(g);
        continue;
      }
      const boxHay = (g.box ? `${g.box.name} ${g.box.set_name ?? ""}` : "").toLowerCase();
      const matchedPacks = g.packs.filter((p) => {
        const packHay = `${p.pack.name} ${p.pack.set_name ?? ""}`.toLowerCase();
        const cardHit = p.cards.some((c) =>
          `${c.name} ${c.name_en ?? ""} ${c.rarity ?? ""}`.toLowerCase().includes(needle),
        );
        return packHay.includes(needle) || cardHit;
      });
      if (boxHay.includes(needle)) {
        filtered.push(g);
      } else if (matchedPacks.length > 0) {
        filtered.push({ ...g, packs: matchedPacks });
      }
    }

    // 정렬: 박스가 있는 그룹 먼저, 박스 created_at 내림차순. orphan 은 끝.
    filtered.sort((a, b) => {
      if (a.box && !b.box) return -1;
      if (!a.box && b.box) return 1;
      if (a.box && b.box) {
        return (b.box.created_at ?? "").localeCompare(a.box.created_at ?? "");
      }
      return 0;
    });
    return filtered;
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
            placeholder="박스·팩·카드 이름·등급 검색"
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

      {groups.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] py-20 text-center">
          <p className="text-sm opacity-60">
            {cards.length === 0 ? "아직 등록된 시세가 없습니다." : "조건에 맞는 결과가 없어요."}
          </p>
        </div>
      ) : (
        <ul className="space-y-8">
          {groups.map((group, gi) => (
            <li
              key={group.boxId}
              className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden animate-fade-in"
              style={{ animationDelay: `${Math.min(gi * 80, 600)}ms` }}
            >
              {/* 박스 헤더 */}
              {group.box ? (
                <BoxHeader box={group.box} history={historyByCard} />
              ) : (
                <div className="px-4 py-2.5 border-b border-[var(--border)] bg-[var(--surface)]/40">
                  <p className="text-xs font-semibold opacity-60">박스 미지정 팩</p>
                </div>
              )}

              {/* 팩 행들 */}
              <ul className="divide-y divide-[var(--border)]">
                {group.packs.map(({ pack, cards: childCards }) => (
                  <li key={pack.id} className="flex">
                    {/* 좌측: 팩 카드 */}
                    <Link
                      href={marketCardHref(pack)}
                      className="shrink-0 w-[120px] sm:w-[150px] p-3 flex flex-col items-center group hover:bg-[var(--surface)]/40 transition"
                    >
                      <div className="aspect-[3/4] w-full relative rounded-lg overflow-hidden bg-white">
                        {pack.image_url ? (
                          <Image
                            src={pack.image_url}
                            alt={pack.name}
                            fill
                            sizes="150px"
                            className="object-contain p-1 group-hover:scale-[1.04] transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs opacity-40">no image</div>
                        )}
                      </div>
                      <p className="text-[10px] font-bold mt-2 text-center line-clamp-2 leading-snug">
                        {pack.name}
                      </p>
                    </Link>

                    {/* 우측: 카드 가로 슬라이드 */}
                    <div className="flex-1 min-w-0 border-l border-[var(--border)] py-3">
                      {childCards.length === 0 ? (
                        <div className="h-full flex items-center justify-center px-4">
                          <p className="text-xs opacity-50">카드 시세 준비 중</p>
                        </div>
                      ) : (
                        <div
                          className="flex gap-3 overflow-x-auto px-3 sm:px-4 scroll-smooth"
                          style={{ scrollSnapType: "x mandatory" }}
                        >
                          {childCards.map((c) => (
                            <CardChip
                              key={c.id}
                              card={c}
                              history={historyByCard.get(c.id) ?? []}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function BoxHeader({
  box,
  history,
}: {
  box: MarketCard;
  history: Map<string, MarketPriceRow[]>;
}) {
  const top = latestByGrade(history.get(box.id) ?? [])[0];
  const inner = (
    <div className="flex items-center gap-3 px-4 py-3 border-b-2 border-[var(--primary)]/30 bg-[var(--primary)]/5">
      <div className="w-16 h-16 sm:w-20 sm:h-20 relative shrink-0 rounded-lg overflow-hidden bg-white border border-[var(--border)] shadow-sm">
        {box.image_url ? (
          <Image src={box.image_url} alt={box.name} fill sizes="80px" className="object-contain p-0.5" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[9px] opacity-40">no img</div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] tracking-[0.25em] uppercase opacity-60 font-semibold text-[var(--primary)]">📦 BOX</p>
        <p className="text-base sm:text-lg font-black truncate mt-0.5">{box.name}</p>
        {top ? (
          <p className="text-xs opacity-70 mt-1">
            박스 시세 <span className="font-bold">{formatKRW(top.latest)}</span>{" "}
            <span className="opacity-50">· {top.grade}</span>
          </p>
        ) : box.list_price_krw != null ? (
          <p className="text-xs opacity-70 mt-1">정가 <span className="font-bold">{formatKRW(box.list_price_krw)}</span></p>
        ) : null}
      </div>
      {box.is_active && (
        <span className="text-xs opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition">
          상세 →
        </span>
      )}
    </div>
  );
  return box.is_active ? (
    <Link href={marketCardHref(box)} className="block group hover:bg-[var(--primary)]/10 transition">
      {inner}
    </Link>
  ) : (
    inner
  );
}

function CardChip({
  card,
  history,
}: {
  card: MarketCard;
  history: MarketPriceRow[];
}) {
  const top = latestByGrade(history)[0];
  const ch = top ? priceChangePct(top.latest, top.prev) : null;
  return (
    <Link
      href={marketCardHref(card)}
      className="shrink-0 w-[120px] sm:w-[140px] group"
      style={{ scrollSnapAlign: "start" }}
    >
      <div className="aspect-[3/4] relative rounded-lg overflow-hidden bg-white border border-[var(--border)] group-hover:border-[var(--border-strong)] group-hover:shadow-md transition">
        {card.image_url ? (
          <Image
            src={card.image_url}
            alt={card.name}
            fill
            sizes="140px"
            className="object-contain p-1.5 group-hover:scale-[1.05] transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[10px] opacity-40">no image</div>
        )}
        {card.rarity && (
          <span className="absolute top-1.5 left-1.5 text-[9px] px-1.5 py-0.5 rounded bg-black/70 text-white font-semibold">
            {card.rarity}
          </span>
        )}
      </div>
      <p className="text-[11px] font-bold mt-1.5 line-clamp-1 leading-snug">{card.name}</p>
      {top ? (
        <div className="flex items-baseline gap-1.5 mt-0.5">
          <p className="text-[12px] font-extrabold tracking-tight">{formatKRW(top.latest)}</p>
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
      ) : card.list_price_krw != null ? (
        <p className="text-[11px] opacity-70 mt-0.5">정가 {formatKRW(card.list_price_krw)}</p>
      ) : (
        <p className="text-[10px] opacity-50 mt-0.5">시세 준비 중</p>
      )}
    </Link>
  );
}
