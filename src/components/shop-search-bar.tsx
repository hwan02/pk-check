"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function ShopSearchBar({ defaultValue = "" }: { defaultValue?: string }) {
  const router = useRouter();
  const sp = useSearchParams();
  const [v, setV] = useState(defaultValue);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams(sp.toString());
    if (v.trim()) params.set("q", v.trim());
    else params.delete("q");
    params.delete("page");
    router.push(params.toString() ? `/shop?${params}` : "/shop");
  }

  return (
    <form onSubmit={submit} className="w-full max-w-xl flex gap-2">
      <input
        value={v}
        onChange={(e) => setV(e.target.value)}
        placeholder="상품 검색 (예: 피카츄, 루피)"
        className="flex-1 min-w-0 px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
      />
      <button
        type="submit"
        className="shrink-0 whitespace-nowrap px-5 py-2.5 rounded-xl bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90"
      >
        검색
      </button>
    </form>
  );
}