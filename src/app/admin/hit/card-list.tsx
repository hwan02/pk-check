"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MARKET_CATEGORY_LABEL,
  PRODUCT_TYPE_LABEL,
  type MarketCard,
  type MarketPriceRow,
  type ProductType,
} from "@/lib/market";
import {
  BoxBulkToggle,
  DeleteMarketButton,
  PriceHistoryPanel,
  ToggleActiveButton,
  type ParentOpt,
} from "./row-actions";
import EditCardModal from "./edit-modal";

interface Props {
  cards: MarketCard[];
  history: MarketPriceRow[];
  parentOptions: ParentOpt[];
}

const TYPE_COLORS: Record<ProductType, string> = {
  box: "bg-amber-100 text-amber-900",
  pack: "bg-sky-100 text-sky-900",
  single: "bg-violet-100 text-violet-900",
};

export default function AdminMarketCardList({ cards, history, parentOptions }: Props) {
  const historyByCard = useMemo(() => {
    const m = new Map<string, MarketPriceRow[]>();
    for (const r of history) {
      const arr = m.get(r.card_id) ?? [];
      arr.push(r);
      m.set(r.card_id, arr);
    }
    return m;
  }, [history]);

  // 부모(박스/팩) id → 이름 매핑 — 카드 row 에 부모 박스명 노출용
  const parentNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of parentOptions) m.set(p.id, p.name);
    return m;
  }, [parentOptions]);

  const [q, setQ] = useState("");
  const [setFilter, setSetFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | ProductType>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "hidden">("all");
  const [categoryFilter, setCategoryFilter] = useState<"all" | "pokemon" | "onepiece">("all");
  const [pricedFilter, setPricedFilter] = useState<"all" | "yes" | "no">("all");
  const [rarityFilter, setRarityFilter] = useState<string>("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [zoomImg, setZoomImg] = useState<{ src: string; alt: string } | null>(null);

  useEffect(() => {
    if (!zoomImg) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setZoomImg(null); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [zoomImg]);

  const setOptions = useMemo(() => {
    const set = new Set<string>();
    for (const c of cards) if (c.set_name) set.add(c.set_name);
    return [...set].sort((a, b) => a.localeCompare(b, "ko"));
  }, [cards]);

  const rarityOptions = useMemo(() => {
    const set = new Set<string>();
    for (const c of cards) if (c.rarity) set.add(c.rarity);
    const PRIORITY = ["SAR", "UR", "HR", "SR", "AR", "RR",
      "Special Illustration Rare", "Illustration Rare", "Hyper Rare",
      "Ultra Rare", "Double Rare", "ACE SPEC Rare",
      "Rare", "Uncommon", "Common"];
    const rest = [...set].filter((r) => !PRIORITY.includes(r)).sort();
    return [...PRIORITY.filter((p) => set.has(p)), ...rest];
  }, [cards]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return cards.filter((c) => {
      if (categoryFilter !== "all" && c.category !== categoryFilter) return false;
      if (typeFilter !== "all" && c.product_type !== typeFilter) return false;
      if (setFilter && c.set_name !== setFilter) return false;
      if (rarityFilter && c.rarity !== rarityFilter) return false;
      if (statusFilter === "active" && !c.is_active) return false;
      if (statusFilter === "hidden" && c.is_active) return false;
      if (pricedFilter !== "all") {
        const has = (historyByCard.get(c.id) ?? []).length > 0;
        if (pricedFilter === "yes" && !has) return false;
        if (pricedFilter === "no" && has) return false;
      }
      if (needle) {
        const hay = `${c.name} ${c.name_en ?? ""} ${c.set_name ?? ""} ${c.rarity ?? ""}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [cards, q, setFilter, rarityFilter, typeFilter, statusFilter, categoryFilter, pricedFilter, historyByCard]);

  const activeFilterCount =
    (q ? 1 : 0) + (setFilter ? 1 : 0) + (rarityFilter ? 1 : 0) +
    (typeFilter !== "all" ? 1 : 0) + (statusFilter !== "all" ? 1 : 0) +
    (categoryFilter !== "all" ? 1 : 0) + (pricedFilter !== "all" ? 1 : 0);

  function reset() {
    setQ(""); setSetFilter(""); setRarityFilter("");
    setTypeFilter("all"); setStatusFilter("all");
    setCategoryFilter("all"); setPricedFilter("all");
  }

  const editingCard = editingId ? cards.find((c) => c.id === editingId) : null;

  return (
    <>
      {/* 검색 + 필터 바 */}
      <div className="sticky top-14 z-30 -mx-4 px-4 py-3 bg-[var(--background)]/95 backdrop-blur border-b border-[var(--border)] space-y-2">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="이름·세트·등급으로 검색"
            className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:border-[var(--primary)] focus:outline-none"
          />
          {q && <button onClick={() => setQ("")} className="text-xs opacity-60 hover:opacity-100 px-2">✕</button>}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <select value={setFilter} onChange={(e) => setSetFilter(e.target.value)}
            className="px-2 py-1 rounded border border-[var(--border)] bg-[var(--background)] max-w-[220px] truncate">
            <option value="">전체</option>
            {setOptions.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={rarityFilter} onChange={(e) => setRarityFilter(e.target.value)}
            className="px-2 py-1 rounded border border-[var(--border)] bg-[var(--background)] max-w-[180px]">
            <option value="">등급 전체</option>
            {rarityOptions.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as "all" | ProductType)}
            className="px-2 py-1 rounded border border-[var(--border)] bg-[var(--background)]">
            <option value="all">타입 전체</option>
            <option value="box">박스</option>
            <option value="pack">팩</option>
            <option value="single">싱글</option>
          </select>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value as "all" | "pokemon" | "onepiece")}
            className="px-2 py-1 rounded border border-[var(--border)] bg-[var(--background)]">
            <option value="all">카테고리 전체</option>
            <option value="pokemon">포켓몬</option>
            <option value="onepiece">원피스</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "hidden")}
            className="px-2 py-1 rounded border border-[var(--border)] bg-[var(--background)]">
            <option value="all">전체</option>
            <option value="active">노출중</option>
            <option value="hidden">숨김</option>
          </select>
          <select value={pricedFilter} onChange={(e) => setPricedFilter(e.target.value as "all" | "yes" | "no")}
            className="px-2 py-1 rounded border border-[var(--border)] bg-[var(--background)]">
            <option value="all">가격 무관</option>
            <option value="yes">가격 있음</option>
            <option value="no">가격 없음</option>
          </select>
          {activeFilterCount > 0 && (
            <button onClick={reset} className="px-2 py-1 rounded border border-[var(--border)] opacity-70 hover:opacity-100">
              필터 초기화 ({activeFilterCount})
            </button>
          )}
          <span className="ml-auto opacity-70">{filtered.length} / {cards.length}장</span>
        </div>
      </div>

      {/* 카드 리스트 */}
      <div className="space-y-2 mt-4">
        {filtered.length === 0 ? (
          <p className="text-center text-xs opacity-50 py-12">
            {cards.length === 0 ? "등록된 Hit 카드가 없습니다." : "조건에 맞는 카드가 없어요."}
          </p>
        ) : (
          filtered.map((c) => (
            <div key={c.id} className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-3">
              <div className="flex items-start gap-3">
                {/* 썸네일 (클릭=확대) */}
                {c.image_url ? (
                  <button
                    type="button"
                    onClick={() => setZoomImg({ src: c.image_url!, alt: c.name })}
                    className="w-14 h-14 relative shrink-0 rounded overflow-hidden bg-gray-50 hover:ring-2 hover:ring-[var(--primary)]"
                    aria-label="이미지 확대"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.image_url} alt={c.name} loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover" />
                  </button>
                ) : (
                  <div className="w-14 h-14 shrink-0 rounded bg-gray-50 border border-dashed border-[var(--border)] flex items-center justify-center text-[10px] opacity-40">
                    이미지
                  </div>
                )}

                {/* 정보 (표시 전용) */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${TYPE_COLORS[c.product_type]}`}>
                      {PRODUCT_TYPE_LABEL[c.product_type]}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--primary)] text-white">
                      {MARKET_CATEGORY_LABEL[c.category]}
                    </span>
                    <span className="text-sm font-semibold truncate">{c.name}</span>
                  </div>
                  <p className="text-[11px] opacity-60 mt-0.5 truncate">
                    {[c.set_name, c.rarity, c.name_en].filter(Boolean).join(" · ") || "—"}
                  </p>
                  {c.parent_id && (
                    <p className="text-[10px] opacity-50 mt-0.5 truncate">
                      ↳ 소속: {parentNameById.get(c.parent_id) ?? "(알 수 없음)"}
                    </p>
                  )}
                </div>

                {/* 액션 */}
                <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                  {c.product_type === "box" && (
                    <BoxBulkToggle boxId={c.id} boxActive={c.is_active} />
                  )}
                  <ToggleActiveButton id={c.id} active={c.is_active} />
                  <button
                    type="button"
                    onClick={() => setEditingId(c.id)}
                    className="text-xs px-3 py-1 rounded border border-[var(--border)] hover:bg-[var(--surface)]"
                  >
                    수정
                  </button>
                  <DeleteMarketButton id={c.id} />
                </div>
              </div>

              {/* 가격 history */}
              <PriceHistoryPanel cardId={c.id} history={historyByCard.get(c.id) ?? []} />
            </div>
          ))
        )}
      </div>

      {/* 수정 모달 */}
      {editingCard && (
        <EditCardModal
          card={editingCard}
          parentOptions={parentOptions}
          onClose={() => setEditingId(null)}
        />
      )}

      {/* 이미지 확대 */}
      {zoomImg && (
        <button
          type="button"
          onClick={() => setZoomImg(null)}
          className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-6"
        >
          <div className="relative w-full max-w-3xl aspect-square">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={zoomImg.src} alt={zoomImg.alt} decoding="async" className="absolute inset-0 w-full h-full object-contain" />
          </div>
          <span className="absolute top-4 right-4 text-white/80 text-xs">클릭하여 닫기 (ESC)</span>
        </button>
      )}
    </>
  );
}
