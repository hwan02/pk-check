"use client";

import { useState } from "react";
import Image from "next/image";

interface SnkrItem {
  url: string;
  title: string;
  price: number;
  image: string;
}

export default function AddPage() {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<SnkrItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setItems([]);
    try {
      const resp = await fetch(`/api/snkrdunk?q=${encodeURIComponent(query.trim())}`, { cache: "no-store" });
      const data = await resp.json();
      setItems(data.items ?? []);
    } catch {
      setItems([]);
    }
    setLoading(false);
  }

  async function handleAdd(item: SnkrItem) {
    setError("");
    try {
      const resp = await fetch("/api/snkrdunk/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });
      if (resp.ok) {
        setAdded((prev) => new Set(prev).add(item.url || item.title));
      } else {
        const data = await resp.json();
        setError(data.error || "추가 실패");
      }
    } catch {
      setError("네트워크 오류");
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-xl font-bold mb-4">snkrdunk에서 카드 추가</h1>

      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="일본어로 검색 (예: ピカチュウex SAR)"
          className="flex-1 px-4 py-3 rounded-lg border border-[var(--border)] bg-[var(--card-bg)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition cursor-pointer disabled:opacity-50"
        >
          {loading ? "검색 중..." : "검색"}
        </button>
      </form>

      {error && (
        <p className="text-sm text-red-500 mb-3">{error}</p>
      )}

      {items.length > 0 && (
        <p className="text-sm opacity-60 mb-3">{items.length}개 결과</p>
      )}

      <div className="flex flex-col gap-3">
        {items.map((item) => {
          const isAdded = added.has(item.url || item.title);
          return (
            <div
              key={item.url || item.title}
              className="flex items-center gap-4 rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-3"
            >
              {item.image && (
                <Image
                  src={item.image}
                  alt=""
                  width={60}
                  height={60}
                  className="rounded object-cover flex-shrink-0"
                  unoptimized
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.title}</p>
                <p className="text-lg font-bold text-blue-600">
                  ¥{item.price.toLocaleString()}
                </p>
                {item.url && (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[var(--primary)] hover:underline"
                  >
                    snkrdunk에서 보기
                  </a>
                )}
              </div>
              <button
                onClick={() => handleAdd(item)}
                disabled={isAdded}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition flex-shrink-0 cursor-pointer ${
                  isAdded
                    ? "bg-green-100 text-green-700"
                    : "bg-[var(--primary)] text-white hover:opacity-90"
                }`}
              >
                {isAdded ? "추가됨" : "추가"}
              </button>
            </div>
          );
        })}
      </div>

      {!loading && items.length === 0 && query && (
        <p className="text-center py-10 opacity-50">검색 결과가 없습니다.</p>
      )}
    </div>
  );
}
