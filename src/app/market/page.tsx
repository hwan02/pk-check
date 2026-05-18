export const dynamic = "force-dynamic";

import Image from "next/image";
import Link from "next/link";
import { createSsrClient } from "@/lib/supabase/ssr";
import { formatKRW, MARKET_CATEGORY_LABEL, priceChange, type MarketCard } from "@/lib/market";

interface Props {
  searchParams: Promise<Record<string, string | undefined>>;
}

const SORTS: { value: string; label: string }[] = [
  { value: "order", label: "추천순" },
  { value: "price_desc", label: "가격 높은순" },
  { value: "price_asc", label: "가격 낮은순" },
  { value: "change_desc", label: "변동률 ▲" },
  { value: "change_asc", label: "변동률 ▼" },
  { value: "newest", label: "최신순" },
];

export default async function MarketPage({ searchParams }: Props) {
  const params = await searchParams;
  const category = (params.category === "onepiece" ? "onepiece" : "pokemon") as "pokemon" | "onepiece";
  const sort = params.sort ?? "order";

  const supabase = await createSsrClient();
  let query = supabase
    .from("market_cards")
    .select("*")
    .eq("is_active", true)
    .eq("category", category);

  switch (sort) {
    case "price_desc":
      query = query.order("price_krw", { ascending: false });
      break;
    case "price_asc":
      query = query.order("price_krw", { ascending: true });
      break;
    case "newest":
      query = query.order("created_at", { ascending: false });
      break;
    default:
      query = query
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false });
  }

  const { data } = await query;
  let cards = (data ?? []) as MarketCard[];

  // change_desc/asc 는 DB 정렬 어려우니 메모리에서 처리
  if (sort === "change_desc" || sort === "change_asc") {
    const desc = sort === "change_desc";
    cards = [...cards].sort((a, b) => {
      const ca = priceChange(a)?.pct ?? -Infinity;
      const cb = priceChange(b)?.pct ?? -Infinity;
      return desc ? cb - ca : ca - cb;
    });
  }

  function buildUrl(overrides: Record<string, string | undefined>) {
    const sp = new URLSearchParams();
    const merged = { category, sort, ...overrides };
    for (const [k, v] of Object.entries(merged)) {
      if (v && v !== "pokemon" /* 기본 */) sp.set(k, v);
      else if (k === "sort" && v && v !== "order") sp.set(k, v);
    }
    const s = sp.toString();
    return s ? `/market?${s}` : "/market";
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <header className="mb-6 text-center">
        <p className="text-[10px] tracking-[0.3em] opacity-50 uppercase">MARKET</p>
        <h1 className="mt-2 text-2xl md:text-3xl font-black tracking-tight">시세</h1>
        <p className="mt-2 text-xs opacity-60">트레이딩 카드 시세 (원화 기준)</p>
      </header>

      {/* 카테고리 탭 */}
      <div className="flex justify-center gap-1 mb-5">
        {(["pokemon", "onepiece"] as const).map((c) => (
          <Link
            key={c}
            href={buildUrl({ category: c })}
            className={`px-5 py-2 rounded-full text-sm font-semibold ${
              category === c
                ? "bg-[var(--primary)] text-white"
                : "border border-[var(--border)] opacity-70 hover:opacity-100"
            }`}
          >
            {MARKET_CATEGORY_LABEL[c]}
          </Link>
        ))}
      </div>

      {/* 정렬 */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs opacity-60">{cards.length > 0 ? `${cards.length}장` : "데이터 준비 중"}</span>
        <div className="flex items-center gap-1 flex-wrap justify-end">
          {SORTS.map((s) => (
            <Link
              key={s.value}
              href={buildUrl({ sort: s.value })}
              className={`text-[11px] px-2 py-1 rounded ${
                sort === s.value
                  ? "bg-[var(--primary)] text-white"
                  : "opacity-60 hover:opacity-100"
              }`}
            >
              {s.label}
            </Link>
          ))}
        </div>
      </div>

      {/* 카드 그리드 */}
      {cards.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] py-20 text-center">
          <p className="text-sm opacity-60">아직 등록된 시세가 없습니다.</p>
        </div>
      ) : (
        <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-3 gap-y-6">
          {cards.map((c) => {
            const ch = priceChange(c);
            return (
              <li key={c.id} className="block group">
                <div className="rounded-xl overflow-hidden bg-[var(--surface)] border border-[var(--border)]">
                  <div className="aspect-square relative bg-white">
                    {c.image_url ? (
                      <Image
                        src={c.image_url}
                        alt={c.name}
                        fill
                        className="object-contain p-3 group-hover:scale-[1.03] transition-transform"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs opacity-40">
                        no image
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-2.5 px-0.5">
                  {(c.set_name || c.rarity) && (
                    <p className="text-[10px] tracking-widest uppercase opacity-50 truncate">
                      {[c.set_name, c.rarity].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  <p className="text-[13px] font-bold leading-snug line-clamp-1 mt-0.5">
                    {c.name}
                  </p>
                  {c.name_en && (
                    <p className="text-[11px] opacity-50 line-clamp-1 mt-0.5">{c.name_en}</p>
                  )}
                  <div className="mt-1.5 flex items-baseline gap-2">
                    <p className="text-[15px] font-extrabold tracking-tight">
                      {formatKRW(c.price_krw)}
                    </p>
                    {ch && (
                      <span
                        className={`text-[11px] font-semibold ${
                          ch.dir === "up"
                            ? "text-red-600"
                            : ch.dir === "down"
                              ? "text-blue-600"
                              : "opacity-50"
                        }`}
                      >
                        {ch.dir === "up" ? "▲" : ch.dir === "down" ? "▼" : "·"}{" "}
                        {Math.abs(ch.pct).toFixed(1)}%
                      </span>
                    )}
                  </div>
                  {c.notes && (
                    <p className="text-[10px] opacity-50 mt-0.5 line-clamp-1">{c.notes}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
