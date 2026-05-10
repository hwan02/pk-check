"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";

export default function SearchBar({ defaultValue = "" }: { defaultValue?: string }) {
  const [query, setQuery] = useState(defaultValue);
  const router = useRouter();
  const pathname = usePathname();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (q) {
      // 메인(/)에서는 메인에서 검색, 그 외는 /search로
      const base = pathname === "/" ? "/" : "/search";
      router.push(`${base}?q=${encodeURIComponent(q)}`);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 w-full max-w-xl">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="카드 이름 검색 (영어/일본어)..."
        className="flex-1 px-4 py-3 rounded-lg border border-[var(--border)] bg-[var(--card-bg)] text-[var(--foreground)] placeholder:opacity-50 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-sm"
      />
      <button
        type="submit"
        className="px-6 py-3 rounded-lg bg-[var(--primary)] text-white font-medium text-sm hover:bg-[var(--primary-dark)] transition cursor-pointer"
      >
        검색
      </button>
    </form>
  );
}
