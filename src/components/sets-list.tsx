"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { CardSet } from "@/lib/types";

const REGION_TABS = [
  { value: "", label: "전체" },
  { value: "en", label: "북미판" },
  { value: "jp", label: "일본판" },
  { value: "kr", label: "한국판" },
];

export default function SetsList({ sets }: { sets: CardSet[] }) {
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("");

  let filtered = sets;
  if (region) {
    filtered = filtered.filter((s) => (s as Record<string, unknown>).region === region);
  }
  if (query) {
    filtered = filtered.filter(
      (s) =>
        s.name.toLowerCase().includes(query.toLowerCase()) ||
        (s.name_ja ?? "").includes(query) ||
        (s.series ?? "").toLowerCase().includes(query.toLowerCase())
    );
  }

  // Group by series
  const seriesMap = new Map<string, CardSet[]>();
  for (const set of filtered) {
    const series = set.series ?? "Other";
    if (!seriesMap.has(series)) seriesMap.set(series, []);
    seriesMap.get(series)!.push(set);
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {REGION_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setRegion(tab.value)}
            className={`px-3 py-1.5 rounded-full text-xs transition cursor-pointer ${
              region === tab.value
                ? "bg-[var(--primary)] text-white"
                : "border border-[var(--border)] hover:border-[var(--primary)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="세트 이름 검색..."
        className="w-full max-w-md px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--card-bg)] text-[var(--foreground)] placeholder:opacity-50 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-sm mb-6"
      />

      {filtered.length === 0 && (
        <p className="text-center py-10 opacity-50">검색 결과가 없습니다.</p>
      )}

      {[...seriesMap.entries()].map(([series, seriesSets]) => (
        <section key={series} className="mb-10">
          <h2 className="text-base font-semibold opacity-70 mb-3">{series}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {seriesSets.map((set) => (
              <Link
                key={set.id}
                href={`/sets/${set.id}`}
                className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden hover:shadow-lg transition group"
              >
                <div className="h-24 flex items-center justify-center bg-gray-50 p-3">
                  {set.logo_url ? (
                    <Image
                      src={set.logo_url}
                      alt={set.name}
                      width={200}
                      height={60}
                      className="max-h-16 w-auto object-contain group-hover:scale-105 transition-transform"
                    />
                  ) : set.symbol_url ? (
                    <Image
                      src={set.symbol_url}
                      alt={set.name}
                      width={48}
                      height={48}
                      className="opacity-40"
                    />
                  ) : (
                    <span className="text-xs opacity-30">No Image</span>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium truncate">{set.name}</p>
                  {set.name_ja && (
                    <p className="text-xs opacity-60 truncate">{set.name_ja}</p>
                  )}
                  <p className="text-xs opacity-50 mt-0.5">
                    {set.printed_total}장
                    {set.release_date && ` · ${set.release_date}`}
                  </p>
                  {set.snkrdunk_box_price != null && (
                    <p className="text-xs text-blue-600 font-medium mt-1">
                      박스 ¥{set.snkrdunk_box_price.toLocaleString()}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
