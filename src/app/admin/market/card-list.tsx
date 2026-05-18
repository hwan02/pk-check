"use client";

import { useMemo, useState } from "react";
import type { MarketCard, MarketPriceRow } from "@/lib/market";
import {
  DeleteMarketButton,
  ImageThumb,
  InlineCategory,
  InlineParent,
  InlineProductType,
  InlineText,
  PriceHistoryPanel,
  ToggleActiveButton,
  type ParentOpt,
} from "./row-actions";

type ProductType = "box" | "pack" | "single";

interface Props {
  cards: MarketCard[];
  history: MarketPriceRow[];
  parentOptions: ParentOpt[];
}

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
  const [q, setQ] = useState("");
  const [setFilter, setSetFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | ProductType>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "hidden">("all");
  const [categoryFilter, setCategoryFilter] = useState<"all" | "pokemon" | "onepiece">("all");
  const [pricedFilter, setPricedFilter] = useState<"all" | "yes" | "no">("all");
  const [rarityFilter, setRarityFilter] = useState<string>("");

  // 박스(set_name) 목록 추출
  const setOptions = useMemo(() => {
    const set = new Set<string>();
    for (const c of cards) {
      if (c.set_name) set.add(c.set_name);
    }
    return [...set].sort((a, b) => a.localeCompare(b, "ko"));
  }, [cards]);

  // 등급 목록 — 비싼 순 우선순위 + 그 외는 알파벳
  const rarityOptions = useMemo(() => {
    const set = new Set<string>();
    for (const c of cards) {
      if (c.rarity) set.add(c.rarity);
    }
    const PRIORITY = [
      "SAR", "UR", "HR", "SR", "AR", "RR",
      "Special Illustration Rare",
      "Illustration Rare",
      "Hyper Rare",
      "Ultra Rare",
      "Double Rare",
      "ACE SPEC Rare",
      "Rare",
      "Uncommon",
      "Common",
    ];
    const rest = [...set]
      .filter((r) => !PRIORITY.includes(r))
      .sort((a, b) => a.localeCompare(b));
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
    (q ? 1 : 0) +
    (setFilter ? 1 : 0) +
    (rarityFilter ? 1 : 0) +
    (typeFilter !== "all" ? 1 : 0) +
    (statusFilter !== "all" ? 1 : 0) +
    (categoryFilter !== "all" ? 1 : 0) +
    (pricedFilter !== "all" ? 1 : 0);

  function reset() {
    setQ("");
    setSetFilter("");
    setRarityFilter("");
    setTypeFilter("all");
    setStatusFilter("all");
    setCategoryFilter("all");
    setPricedFilter("all");
  }

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
          {q && (
            <button onClick={() => setQ("")} className="text-xs opacity-60 hover:opacity-100 px-2">
              ✕
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <select
            value={setFilter}
            onChange={(e) => setSetFilter(e.target.value)}
            className="px-2 py-1 rounded border border-[var(--border)] bg-[var(--background)] max-w-[220px] truncate"
          >
            <option value="">박스 전체</option>
            {setOptions.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select
            value={rarityFilter}
            onChange={(e) => setRarityFilter(e.target.value)}
            className="px-2 py-1 rounded border border-[var(--border)] bg-[var(--background)] max-w-[180px]"
          >
            <option value="">등급 전체</option>
            {rarityOptions.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as "all" | ProductType)}
            className="px-2 py-1 rounded border border-[var(--border)] bg-[var(--background)]"
          >
            <option value="all">타입 전체</option>
            <option value="box">박스</option>
            <option value="pack">팩</option>
            <option value="single">싱글</option>
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as "all" | "pokemon" | "onepiece")}
            className="px-2 py-1 rounded border border-[var(--border)] bg-[var(--background)]"
          >
            <option value="all">카테고리 전체</option>
            <option value="pokemon">포켓몬</option>
            <option value="onepiece">원피스</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "hidden")}
            className="px-2 py-1 rounded border border-[var(--border)] bg-[var(--background)]"
          >
            <option value="all">전체</option>
            <option value="active">노출중</option>
            <option value="hidden">숨김</option>
          </select>
          <select
            value={pricedFilter}
            onChange={(e) => setPricedFilter(e.target.value as "all" | "yes" | "no")}
            className="px-2 py-1 rounded border border-[var(--border)] bg-[var(--background)]"
          >
            <option value="all">가격 무관</option>
            <option value="yes">가격 있음</option>
            <option value="no">가격 없음</option>
          </select>
          {activeFilterCount > 0 && (
            <button
              onClick={reset}
              className="px-2 py-1 rounded border border-[var(--border)] opacity-70 hover:opacity-100"
            >
              필터 초기화 ({activeFilterCount})
            </button>
          )}
          <span className="ml-auto opacity-70">
            {filtered.length} / {cards.length}장
          </span>
        </div>
      </div>

      {/* 카드 목록 */}
      <div className="space-y-3 mt-4">
        {filtered.length === 0 ? (
          <p className="text-center text-xs opacity-50 py-12">
            {cards.length === 0 ? "등록된 시세 카드가 없습니다." : "조건에 맞는 카드가 없어요."}
          </p>
        ) : (
          filtered.map((c) => (
            <div
              key={c.id}
              className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-3"
            >
              <div className="flex items-start gap-3">
                <ImageThumb id={c.id} src={c.image_url} alt={c.name} />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <InlineCategory id={c.id} initial={c.category} />
                    <InlineProductType id={c.id} initial={c.product_type} />
                    <InlineText
                      id={c.id}
                      field="name"
                      initial={c.name}
                      placeholder="이름"
                      className="font-semibold flex-1 min-w-[120px]"
                    />
                    <ToggleActiveButton id={c.id} active={c.is_active} />
                    <DeleteMarketButton id={c.id} />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <InlineParent
                      id={c.id}
                      initialParentId={c.parent_id}
                      productType={c.product_type}
                      category={c.category}
                      parentOptions={parentOptions}
                    />
                    <InlineText
                      id={c.id}
                      field="name_en"
                      initial={c.name_en}
                      placeholder="영문 (선택)"
                      className="opacity-70 max-w-[180px]"
                    />
                    <InlineText
                      id={c.id}
                      field="set_name"
                      initial={c.set_name}
                      placeholder="세트명"
                      className="opacity-70 max-w-[180px]"
                    />
                    <InlineText
                      id={c.id}
                      field="rarity"
                      initial={c.rarity}
                      placeholder="등급/레어"
                      className="opacity-70 max-w-[120px]"
                    />
                  </div>
                </div>
              </div>

              <PriceHistoryPanel cardId={c.id} history={historyByCard.get(c.id) ?? []} />
            </div>
          ))
        )}
      </div>
    </>
  );
}
