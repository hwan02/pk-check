export const revalidate = 60;

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createSsrClient } from "@/lib/supabase/ssr";
import { formatKRW, MARKET_CATEGORY_LABEL, priceChange, type MarketCard } from "@/lib/market";

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
  return {
    title: `${card.name} 시세 — KIKIDULT`,
    description: `${card.name} · ${formatKRW(card.price_krw)} · ${MARKET_CATEGORY_LABEL[card.category]}`,
    openGraph: {
      title: `${card.name} 시세`,
      description: `${formatKRW(card.price_krw)} · ${[card.set_name, card.rarity].filter(Boolean).join(" · ")}`,
      images: card.image_url ? [{ url: card.image_url }] : [],
    },
  };
}

export default async function MarketDetailPage({ params }: Props) {
  const { id } = await params;
  const card = await getCard(id);
  if (!card) notFound();

  const ch = priceChange(card);
  const supabase = await createSsrClient();

  // 관련 매물 (이름으로 느슨하게 매칭 — listings.card_id 는 catalog cards.id 라 직접 연결 X)
  const { data: listings } = await supabase
    .from("listings")
    .select("id, short_id, title, title_en, image_url, price_usd, stock")
    .or(`title.ilike.%${card.name}%${card.name_en ? `,title_en.ilike.%${card.name_en}%` : ""}`)
    .eq("is_active", true)
    .gt("stock", 0)
    .limit(3);

  return (
    <div className="max-w-5xl mx-auto px-4 pt-4 pb-12">
      <nav className="text-xs opacity-60 mb-4 flex items-center gap-1.5">
        <Link href="/market" className="hover:opacity-100">MARKET</Link>
        <span>/</span>
        <Link
          href={`/market?category=${card.category}`}
          className="hover:opacity-100"
        >
          {MARKET_CATEGORY_LABEL[card.category]}
        </Link>
        <span>/</span>
        <span className="opacity-80 truncate">{card.name}</span>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_1.1fr] gap-6 md:gap-10">
        {/* 이미지 */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4">
          <div className="aspect-[3/4] rounded-lg overflow-hidden bg-white flex items-center justify-center relative">
            {card.image_url ? (
              <Image
                src={card.image_url}
                alt={card.name}
                fill
                sizes="(max-width: 768px) 100vw, 500px"
                className="object-contain p-2"
                priority
              />
            ) : (
              <span className="text-xs opacity-40">no image</span>
            )}
          </div>
        </div>

        {/* 정보 */}
        <div>
          <p className="text-[10px] tracking-widest uppercase opacity-50">
            {[MARKET_CATEGORY_LABEL[card.category], card.set_name, card.rarity]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <h1 className="mt-1 text-2xl md:text-3xl font-black tracking-tight leading-tight">
            {card.name}
          </h1>
          {card.name_en && (
            <p className="text-sm opacity-60 mt-1">{card.name_en}</p>
          )}

          {/* 가격 박스 */}
          <div className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5">
            <p className="text-xs opacity-60 mb-1">현재가</p>
            <div className="flex items-baseline gap-3 flex-wrap">
              <p className="text-3xl md:text-4xl font-extrabold tracking-tight tabular-nums">
                {formatKRW(card.price_krw)}
              </p>
              {ch && (
                <span
                  className={`text-sm font-semibold tabular-nums ${
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
            {card.prev_price_krw != null && (
              <p className="text-[11px] opacity-50 mt-1.5">
                직전가 {formatKRW(card.prev_price_krw)}
              </p>
            )}
            {card.notes && (
              <p className="text-xs opacity-70 mt-3 whitespace-pre-line">{card.notes}</p>
            )}
            <p className="text-[10px] opacity-40 mt-3">
              업데이트 {new Date(card.updated_at).toLocaleDateString("ko-KR")}
            </p>
          </div>

          {/* 관련 매물 */}
          {listings && listings.length > 0 && (
            <div className="mt-5">
              <p className="text-[10px] tracking-widest uppercase opacity-50 mb-2">
                관련 매물
              </p>
              <ul className="space-y-2">
                {listings.map((l) => (
                  <li key={l.id}>
                    <Link
                      href={`/shop/${l.short_id ?? l.id}`}
                      className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] hover:border-[var(--primary)] transition"
                    >
                      <div className="w-12 h-16 shrink-0 rounded bg-[var(--surface)] overflow-hidden flex items-center justify-center relative">
                        {l.image_url ? (
                          <Image
                            src={l.image_url}
                            alt={l.title}
                            fill
                            sizes="48px"
                            className="object-contain"
                          />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold truncate">{l.title}</p>
                        <p className="text-[11px] opacity-60 tabular-nums">
                          ${l.price_usd.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                        </p>
                      </div>
                      <span className="text-xs opacity-40">→</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
