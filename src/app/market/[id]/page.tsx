export const revalidate = 60;

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createSsrClient } from "@/lib/supabase/ssr";
import {
  formatKRW,
  latestByGrade,
  MARKET_CATEGORY_LABEL,
  priceChangePct,
  type MarketCard,
  type MarketPriceRow,
} from "@/lib/market";
import { formatUSD } from "@/lib/shop";
import MarketChart from "@/components/market-chart";

interface Props {
  params: Promise<{ id: string }>;
}

async function getCard(id: string): Promise<MarketCard | null> {
  const supabase = await createSsrClient();
  const { data } = await supabase
    .from("market_cards")
    .select("*")
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();
  return (data ?? null) as MarketCard | null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const card = await getCard(id);
  if (!card) return { title: "시세를 찾을 수 없습니다" };

  // 최신가 한 줄로 추가
  const supabase = await createSsrClient();
  const { data: latestRow } = await supabase
    .from("market_price_history")
    .select("grade, price_krw")
    .eq("card_id", id)
    .order("recorded_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const priceLine = latestRow
    ? `${latestRow.grade} ${formatKRW(latestRow.price_krw)}`
    : "시세 정보 준비 중";
  const meta = [card.set_name, card.rarity].filter(Boolean).join(" · ");

  return {
    title: `${card.name} 시세 — KIKIDULT`,
    description: `${card.name} · ${priceLine} · ${MARKET_CATEGORY_LABEL[card.category]}${meta ? ` · ${meta}` : ""}`,
    openGraph: {
      title: `${card.name} 시세`,
      description: `${priceLine}${meta ? ` · ${meta}` : ""}`,
      images: card.image_url ? [{ url: card.image_url }] : [],
    },
  };
}

export default async function MarketDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createSsrClient();

  const { data: cardRow } = await supabase
    .from("market_cards")
    .select("*")
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();
  if (!cardRow) notFound();
  const card = cardRow as MarketCard;

  const { data: histRows } = await supabase
    .from("market_price_history")
    .select("*")
    .eq("card_id", id)
    .order("recorded_at", { ascending: false })
    .limit(2000);
  const history = (histRows ?? []) as MarketPriceRow[];
  const grades = latestByGrade(history);

  // 관련 매물 (이름으로 느슨하게 매칭)
  const { data: listingRows } = await supabase
    .from("listings")
    .select("id, short_id, title, title_en, image_url, price_usd, stock")
    .or(
      `title.ilike.%${card.name}%${card.name_en ? `,title_en.ilike.%${card.name_en}%` : ""}`,
    )
    .eq("is_active", true)
    .gt("stock", 0)
    .limit(3);
  type RelatedListing = {
    id: string;
    short_id: string | null;
    title: string;
    title_en: string | null;
    image_url: string | null;
    price_usd: number;
    stock: number;
  };
  const listings = (listingRows ?? []) as RelatedListing[];

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* breadcrumb */}
      <nav className="text-xs opacity-60 mb-4 flex items-center gap-1.5">
        <Link href="/market" className="hover:opacity-100">
          MARKET
        </Link>
        <span>/</span>
        <Link href={`/market?category=${card.category}`} className="hover:opacity-100">
          {MARKET_CATEGORY_LABEL[card.category]}
        </Link>
        <span>/</span>
        <span className="opacity-80 truncate">{card.name}</span>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_1.4fr] gap-6 lg:gap-10">
        {/* 이미지 */}
        <div>
          <div className="aspect-square relative rounded-2xl overflow-hidden bg-[var(--card-bg)] border border-[var(--border)]">
            {card.image_url ? (
              <Image
                src={card.image_url}
                alt={card.name}
                fill
                className="object-contain"
                sizes="(max-width: 768px) 100vw, 40vw"
                priority
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm opacity-40">
                이미지 없음
              </div>
            )}
          </div>
        </div>

        {/* 정보 + 등급별 최신가 */}
        <div className="space-y-4">
          <div>
            <p className="text-xs tracking-widest opacity-50 uppercase">
              {MARKET_CATEGORY_LABEL[card.category]}
              {card.set_name && <> · {card.set_name}</>}
              {card.rarity && <> · {card.rarity}</>}
            </p>
            <h1 className="text-2xl md:text-3xl font-bold leading-tight tracking-tight mt-1">
              {card.name}
            </h1>
            {card.name_en && (
              <p className="text-sm opacity-60 mt-1">{card.name_en}</p>
            )}
            {card.notes && (
              <p className="text-xs opacity-70 mt-3 whitespace-pre-line">{card.notes}</p>
            )}
          </div>

          {/* 등급별 최신가 */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4">
            <p className="text-xs opacity-60 mb-3">등급별 최신가</p>
            {grades.length === 0 ? (
              <p className="text-sm opacity-50 py-6 text-center">시세 데이터가 아직 없어요.</p>
            ) : (
              <ul className="divide-y divide-[var(--border)]">
                {grades.map((g) => {
                  const ch = priceChangePct(g.latest, g.prev);
                  return (
                    <li key={g.grade} className="flex items-center justify-between py-2.5">
                      <div>
                        <p className="text-sm font-semibold">{g.grade}</p>
                        <p className="text-[10px] opacity-50 mt-0.5">{g.recorded_at}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-base font-extrabold tracking-tight">
                          {formatKRW(g.latest)}
                        </p>
                        {ch && (
                          <p
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
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* 시세 추이 차트 */}
      <section className="mt-10">
        <h2 className="text-sm font-semibold tracking-widest uppercase opacity-70 mb-3">
          시세 추이
        </h2>
        <MarketChart history={history} />
      </section>

      {/* 관련 매물 (listings) */}
      {listings.length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm font-semibold tracking-widest uppercase opacity-70 mb-3">
            관련 매물
          </h2>
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {listings.map((l) => (
              <li key={l.id}>
                <Link
                  href={`/shop/${l.short_id ?? l.id}`}
                  className="block rounded-xl border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden group"
                >
                  <div className="aspect-square relative bg-white">
                    {l.image_url ? (
                      <Image
                        src={l.image_url}
                        alt={l.title}
                        fill
                        sizes="(max-width: 640px) 50vw, 33vw"
                        className="object-contain p-3 group-hover:scale-[1.03] transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs opacity-40">
                        no image
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-[12px] font-semibold line-clamp-1">
                      {l.title_en || l.title}
                    </p>
                    <p className="text-[14px] font-extrabold mt-1 tracking-tight">
                      {formatUSD(l.price_usd)}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 전체 기록 테이블 */}
      {history.length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm font-semibold tracking-widest uppercase opacity-70 mb-3">
            전체 기록 ({history.length})
          </h2>
          <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
            <table className="w-full text-sm">
              <thead className="bg-[var(--surface)]/40 text-xs opacity-70">
                <tr>
                  <th className="text-left py-2 px-3">날짜</th>
                  <th className="text-left py-2 px-3">등급</th>
                  <th className="text-right py-2 px-3">가격</th>
                </tr>
              </thead>
              <tbody>
                {history.slice(0, 200).map((r) => (
                  <tr key={r.id} className="border-t border-[var(--border)]">
                    <td className="py-2 px-3 opacity-70">{r.recorded_at}</td>
                    <td className="py-2 px-3">{r.grade}</td>
                    <td className="py-2 px-3 text-right font-mono">
                      {formatKRW(r.price_krw)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {history.length > 200 && (
              <p className="text-[11px] opacity-50 text-center py-2">최근 200건만 표시</p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
