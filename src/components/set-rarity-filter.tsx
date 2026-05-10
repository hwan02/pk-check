"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

interface Props {
  setId: string;
  rarities: { rarity: string; count: number }[];
}

export default function SetRarityFilter({ setId, rarities }: Props) {
  const searchParams = useSearchParams();
  const current = searchParams.get("rarity") ?? "";

  return (
    <div className="flex flex-wrap gap-1.5 mb-4">
      <Link
        href={`/sets/${setId}`}
        className={`px-3 py-1.5 rounded-full text-xs transition ${
          !current
            ? "bg-[var(--primary)] text-white"
            : "border border-[var(--border)] hover:bg-[var(--border)]"
        }`}
      >
        전체
      </Link>
      {rarities.map(({ rarity, count }) => (
        <Link
          key={rarity}
          href={`/sets/${setId}?rarity=${encodeURIComponent(rarity)}`}
          className={`px-3 py-1.5 rounded-full text-xs transition ${
            current === rarity
              ? "bg-[var(--primary)] text-white"
              : "border border-[var(--border)] hover:bg-[var(--border)]"
          }`}
        >
          {rarity} ({count})
        </Link>
      ))}
    </div>
  );
}
