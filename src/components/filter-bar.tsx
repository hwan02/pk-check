"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

const RARITIES = [
  { value: "Common", label: "C" },
  { value: "Uncommon", label: "U" },
  { value: "Rare", label: "R" },
  { value: "Double Rare", label: "RR" },
  { value: "Illustration Rare", label: "AR" },
  { value: "Special Illustration Rare", label: "SAR" },
  { value: "Hyper Rare", label: "HR" },
  { value: "Ultra Rare", label: "UR" },
  { value: "Secret Rare", label: "SR" },
  { value: "ACE SPEC Rare", label: "ACE" },
];

const TYPES = [
  { value: "Colorless", label: "무색" },
  { value: "Darkness", label: "악" },
  { value: "Dragon", label: "드래곤" },
  { value: "Fairy", label: "페어리" },
  { value: "Fighting", label: "격투" },
  { value: "Fire", label: "불꽃" },
  { value: "Grass", label: "풀" },
  { value: "Lightning", label: "번개" },
  { value: "Metal", label: "강철" },
  { value: "Psychic", label: "초" },
  { value: "Water", label: "물" },
];

const SUPERTYPES = [
  { value: "", label: "전체" },
  { value: "Pokémon", label: "포켓몬" },
  { value: "Trainer", label: "트레이너" },
  { value: "Energy", label: "에너지" },
];

const SORT_OPTIONS = [
  { value: "name", label: "이름순" },
  { value: "price_desc", label: "가격 높은순" },
  { value: "price_asc", label: "가격 낮은순" },
  { value: "newest", label: "최신순" },
];

export default function FilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const base = pathname === "/" ? "/" : "/search";

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page");
    router.push(`${base}?${params.toString()}`);
  }

  const hasFilters =
    searchParams.get("rarity") ||
    searchParams.get("type") ||
    searchParams.get("supertype") ||
    searchParams.get("priced") ||
    searchParams.get("region");

  function clearAll() {
    const params = new URLSearchParams();
    const q = searchParams.get("q");
    if (q) params.set("q", q);
    router.push(`${base}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
      <select
        value={searchParams.get("region") ?? ""}
        onChange={(e) => update("region", e.target.value)}
        className="px-3 py-1.5 rounded border border-[var(--border)] bg-[var(--card-bg)] text-sm"
      >
        <option value="">에디션 전체</option>
        <option value="en">북미판</option>
        <option value="jp">일본판</option>
        <option value="kr">한국판</option>
      </select>

      <select
        value={searchParams.get("supertype") ?? ""}
        onChange={(e) => update("supertype", e.target.value)}
        className="px-3 py-1.5 rounded border border-[var(--border)] bg-[var(--card-bg)] text-sm"
      >
        {SUPERTYPES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>

      <select
        value={searchParams.get("type") ?? ""}
        onChange={(e) => update("type", e.target.value)}
        className="px-3 py-1.5 rounded border border-[var(--border)] bg-[var(--card-bg)] text-sm"
      >
        <option value="">타입 전체</option>
        {TYPES.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>

      <select
        value={searchParams.get("rarity") ?? ""}
        onChange={(e) => update("rarity", e.target.value)}
        className="px-3 py-1.5 rounded border border-[var(--border)] bg-[var(--card-bg)] text-sm"
      >
        <option value="">등급 전체</option>
        {RARITIES.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>

      <select
        value={searchParams.get("priced") ?? ""}
        onChange={(e) => update("priced", e.target.value)}
        className="px-3 py-1.5 rounded border border-[var(--border)] bg-[var(--card-bg)] text-sm"
      >
        <option value="">시세 전체</option>
        <option value="snkrdunk">snkrdunk 시세 있는 것</option>
        <option value="tcg">TCGPlayer 시세 있는 것</option>
        <option value="both">둘 다 있는 것</option>
      </select>

      <select
        value={searchParams.get("sort") ?? "name"}
        onChange={(e) => update("sort", e.target.value)}
        className="px-3 py-1.5 rounded border border-[var(--border)] bg-[var(--card-bg)] text-sm"
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      {hasFilters && (
        <button
          onClick={clearAll}
          className="px-3 py-1.5 rounded text-sm text-[var(--primary)] hover:underline cursor-pointer"
        >
          필터 초기화
        </button>
      )}
    </div>
  );
}
