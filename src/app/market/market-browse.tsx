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
  boxes: MarketCard[];
}

export default function MarketBrowse({ boxes }: Props) {
  const [category, setCategory] = useState<"all" | "pokemon" | "onepiece">("all");
  const [q, setQ] = useState("");

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
        const hay = `${b.name} ${b.set_name ?? ""}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [boxes, category, q]);

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
            placeholder="박스 검색"
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

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] py-20 text-center">
          <p className="text-sm opacity-60">
            {boxes.length === 0 ? "아직 등록된 박스가 없습니다." : "조건에 맞는 박스가 없어요."}
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-3 gap-y-6">
          {filtered.map((b) => (
            <li key={b.id}>
              <Link href={marketCardHref(b)} className="block group">
                <div className="aspect-square relative rounded-2xl overflow-hidden bg-white border border-[var(--border)] group-hover:border-[var(--border-strong)] group-hover:shadow-md transition">
                  {b.image_url ? (
                    <Image
                      src={b.image_url}
                      alt={b.name}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      className="object-contain p-3 group-hover:scale-[1.03] transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs opacity-40">
                      no image
                    </div>
                  )}
                </div>
                <div className="mt-2.5 px-1">
                  <p className="text-[10px] tracking-widest uppercase opacity-50">
                    {MARKET_CATEGORY_LABEL[b.category]}
                  </p>
                  <p className="text-[13px] font-bold mt-0.5 leading-snug line-clamp-2">
                    {b.name}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
