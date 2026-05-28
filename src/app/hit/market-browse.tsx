"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  MARKET_CATEGORY_LABEL,
  marketCardHref,
  safeImageUrl,
  type MarketCard,
} from "@/lib/market";

// 지역 토글 — 'all' → 모든 지역, jp/kr/en → 해당 지역만
type RegionFilter = "all" | "jp" | "kr" | "en";
const REGION_CYCLE: RegionFilter[] = ["all", "jp", "kr", "en"];
const REGION_FLAG: Record<RegionFilter, string> = {
  all: "🌐",
  jp: "🇯🇵",
  kr: "🇰🇷",
  en: "🇺🇸",
};
const REGION_LABEL: Record<RegionFilter, string> = {
  all: "전체",
  jp: "일본판",
  kr: "한국판",
  en: "북미판",
};

interface Props {
  all: MarketCard[]; // 활성 박스 + 팩 + 싱글 모두
}

// 등급 우선순위 (작을수록 먼저 노출)
// - Pokemon: MUR > SAR > SSR > AR > RR > UR > HR > SR > ...
// - One Piece: SEC > L > SR > R > UC > C
const RARITY_RANK: Record<string, number> = {
  // Pokemon 최상위
  MUR: 1,
  SAR: 2, "Special Illustration Rare": 2,
  SSR: 3,
  // One Piece SEC (시크릿 레어 — 박스 톱)
  SEC: 3,
  AR: 4, "Illustration Rare": 4,
  // One Piece L (리더 — 컬렉터블 + 덱 핵심)
  L: 4,
  RR: 5, "Double Rare": 5, RRR: 5,
  UR: 6, "Ultra Rare": 6,
  HR: 7, "Hyper Rare": 7,
  SR: 8, "Secret Rare": 8,
  MA: 9,
  "ACE SPEC Rare": 10,
  R: 11, Rare: 11,
  S: 12, "Shiny Rare": 12,
  U: 13, Uncommon: 13, UC: 13,
  C: 14, Common: 14,
};
const rank = (r: string | null) => (r ? RARITY_RANK[r] ?? 50 : 99);

export default function MarketBrowse({ all }: Props) {
  const [category, setCategory] = useState<"all" | "pokemon" | "onepiece">("all");
  const [q, setQ] = useState("");
  const [region, setRegion] = useState<RegionFilter>("all");
  const [fading, setFading] = useState(false);

  // 첫 로드시 localStorage 에서 region 복원
  useEffect(() => {
    const saved = localStorage.getItem("hit-region") as RegionFilter | null;
    if (saved && REGION_CYCLE.includes(saved)) setRegion(saved);
  }, []);

  function cycleRegion() {
    const idx = REGION_CYCLE.indexOf(region);
    const next = REGION_CYCLE[(idx + 1) % REGION_CYCLE.length];
    setFading(true);
    setTimeout(() => {
      setRegion(next);
      localStorage.setItem("hit-region", next);
      // 다음 페인트 후 페이드 해제
      requestAnimationFrame(() => requestAnimationFrame(() => setFading(false)));
    }, 200);
  }

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
    const list = boxes.filter((b) => {
      if (category !== "all" && b.category !== category) return false;
      // region 필터 — 박스 자체의 region 으로 판단 (자식 single 들도 같은 region 으로 매겨짐)
      if (region !== "all" && b.region !== region) return false;
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
    // 전체 카테고리일 땐 포켓몬 먼저 (현재 인기 카테고리). 그 안에서는 원래 순서(display_order / created_at) 유지.
    if (category === "all") {
      const rank = (c: MarketCard["category"]) => (c === "pokemon" ? 0 : 1);
      return [...list].sort((a, b) => rank(a.category) - rank(b.category));
    }
    return list;
  }, [boxes, cardsByBox, category, q, region]);

  return (
    <>
      {/* 검색 + 지역 토글 한 줄 */}
      <div className="flex items-center gap-2 mb-2">
        <div className="relative flex-1 min-w-0">
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="박스/카드/등급 검색"
            className="w-full pl-9 pr-8 py-2 rounded-full border border-[var(--border)] bg-[var(--card-bg)] text-sm focus:border-[var(--primary)] focus:outline-none"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40"
            width="15" height="15" viewBox="0 0 24 24" fill="none"
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
        <button
          type="button"
          onClick={cycleRegion}
          title={`${REGION_LABEL[region]} (클릭하면 다음 지역)`}
          className="shrink-0 flex items-center gap-1.5 h-[36px] px-3 rounded-full border border-[var(--border)] bg-[var(--card-bg)] text-sm font-semibold hover:bg-[var(--surface)] transition"
        >
          <span
            key={region}
            className="text-lg leading-none inline-block transition-transform duration-200"
            style={{ animation: "flagFlip 0.4s ease-out" }}
          >
            {REGION_FLAG[region]}
          </span>
          <span className="text-xs">{REGION_LABEL[region]}</span>
        </button>
      </div>

      {/* 카테고리 탭 */}
      <div className="flex gap-1 mb-4 overflow-x-auto -mx-1 px-1">
        {(["all", "pokemon", "onepiece"] as const).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition ${
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

      {filtered.length === 0 ? (
        <div
          className={`rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] py-20 text-center transition-opacity duration-200 ${
            fading ? "opacity-0" : "opacity-100"
          }`}
        >
          <p className="text-sm opacity-60">
            {boxes.length === 0
              ? "아직 등록된 박스가 없습니다."
              : region !== "all"
                ? `${REGION_LABEL[region]} 카드 없음`
                : "결과 없음"}
          </p>
        </div>
      ) : (
        <ul
          className={`space-y-3 transition-opacity duration-200 ${
            fading ? "opacity-0" : "opacity-100"
          }`}
        >
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
                    className="shrink-0 w-[150px] sm:w-[200px] p-3 group hover:bg-[var(--surface)]/40 transition flex flex-col items-center"
                  >
                    <div className="aspect-[3/4] w-full relative rounded-xl overflow-hidden bg-white">
                      {box.image_url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={safeImageUrl(box.image_url)!}
                          alt={box.name}
                          loading="lazy"
                          decoding="async"
                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[11px] opacity-40">
                          no image
                        </div>
                      )}
                    </div>
                    <p className="text-[12px] sm:text-[13px] font-bold mt-2 text-center line-clamp-2 leading-tight">
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
                        className="flex gap-3 sm:gap-4 overflow-x-auto p-3 sm:p-4 scroll-smooth"
                        style={{ scrollSnapType: "x mandatory" }}
                      >
                        {cards.map((c) => (
                          <Link
                            key={c.id}
                            href={marketCardHref(c)}
                            className="shrink-0 w-[130px] sm:w-[160px] group flex flex-col"
                            style={{ scrollSnapAlign: "start" }}
                          >
                            <div className="w-[130px] h-[182px] sm:w-[160px] sm:h-[224px] relative rounded-xl overflow-hidden bg-white border border-[var(--border)] group-hover:border-[var(--border-strong)] group-hover:shadow-lg transition shrink-0">
                              {c.image_url ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                  src={safeImageUrl(c.image_url)!}
                                  alt={c.name}
                                  loading="lazy"
                                  decoding="async"
                                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.05] transition-transform duration-300"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[10px] opacity-40">
                                  no image
                                </div>
                              )}
                              {c.rarity && (
                                <span className="absolute top-1.5 left-1.5 text-[10px] sm:text-[11px] px-1.5 py-0.5 rounded bg-black/75 text-white font-bold">
                                  {c.rarity}
                                </span>
                              )}
                            </div>
                            <p className="text-[12px] sm:text-[13px] font-bold mt-1.5 line-clamp-1 leading-tight">
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
