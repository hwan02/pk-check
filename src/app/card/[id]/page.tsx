import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import PriceChart from "@/components/price-chart";
import DeleteButton from "@/components/delete-button";
import { createServerClient } from "@/lib/supabase/server";
import { USD_TO_KRW, JPY_TO_KRW, formatKRW } from "@/lib/constants";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ id: string }>;
}

// 스니덩 검색용 키워드: jp 카드의 영문/라틴 문자를 제거해 일본어/CJK만 남김.
// 결과가 너무 짧으면(노이즈만 남으면) 원본으로 fallback.
function buildSnkrdunkSearchName(card: { name: string; name_ja: string | null; region: string | null }): string {
  const base = card.name_ja ?? card.name;
  if (card.region !== "jp") return base;
  const stripped = base.replace(/[A-Za-z0-9]+/g, "").trim();
  const meaningful = stripped.replace(/[（）()・〜~ー\s]/g, "");
  return meaningful.length >= 2 ? stripped : base;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = createServerClient();
  const { data: card } = await supabase.from("cards").select("name, name_ja").eq("id", id).single();
  if (!card) return { title: "카드를 찾을 수 없음" };
  return {
    title: `${card.name} ${card.name_ja ? `(${card.name_ja})` : ""} - 포포시세`,
  };
}

export default async function CardDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = createServerClient();

  const { data: card } = await supabase
    .from("cards")
    .select("*, prices(*), set:sets(*)")
    .eq("id", id)
    .single();

  if (!card) notFound();

  const prices = Array.isArray(card.prices) ? card.prices[0] : card.prices;
  const set = Array.isArray(card.set) ? card.set[0] : card.set;

  // Price history
  const { data: history } = await supabase
    .from("price_history")
    .select("*")
    .eq("card_id", id)
    .order("recorded_at", { ascending: true })
    .limit(90);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <div className="text-xs opacity-50 mb-4 flex gap-1">
        <Link href="/" className="hover:opacity-100">홈</Link>
        <span>/</span>
        {set && (
          <>
            <Link href={`/sets/${set.id}`} className="hover:opacity-100">{set.name}</Link>
            <span>/</span>
          </>
        )}
        <span className="opacity-100">{card.name}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-8">
        {/* Card Image */}
        <div className="flex justify-center">
          <div className="relative w-[280px] aspect-[2.5/3.5] rounded-lg overflow-hidden shadow-lg">
            {card.image_large ? (
              <Image
                src={card.image_large}
                alt={card.name}
                fill
                sizes="280px"
                className={card.image_large.includes("snkrdunk.com") ? "object-cover" : "object-contain"}
                priority
              />
            ) : (
              <div className="flex items-center justify-center h-full bg-gray-100 text-sm opacity-30">
                No Image
              </div>
            )}
          </div>
        </div>

        {/* Info + Prices */}
        <div>
          <h1 className="text-2xl font-bold">{card.region === "jp" ? (card.name_ja ?? card.name) : card.name}</h1>
          {card.name_ja && card.name_ja !== card.name && card.region !== "jp" && (
            <p className="text-base opacity-60 mt-1">{card.name_ja}</p>
          )}

          <div className="flex flex-wrap gap-2 mt-3 text-xs">
            {(card.rarity || card.rarity_ja) && (
              <span className="px-2 py-1 rounded bg-[var(--border)]">
                {card.region === "kr" ? (card.rarity_ja ?? card.rarity) : card.rarity}
              </span>
            )}
            {set && (
              <Link href={`/sets/${set.id}`} className="px-2 py-1 rounded bg-[var(--border)] hover:opacity-80">
                {set.name}
              </Link>
            )}
            {card.number && (
              <span className="px-2 py-1 rounded bg-[var(--border)]">#{card.number}</span>
            )}
          </div>

          {/* Current Prices (모두 KRW 환산) */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            <div className="rounded-lg border border-[var(--border)] p-4">
              <p className="text-xs opacity-50 mb-1">TCGPlayer (원화 환산)</p>
              {prices?.tcg_market != null ? (
                <>
                  <p className="text-2xl font-bold text-green-600">
                    {formatKRW(Math.round(prices.tcg_market * USD_TO_KRW))}
                  </p>
                  <p className="text-xs opacity-60 mt-1">${prices.tcg_market.toFixed(2)} USD</p>
                </>
              ) : (
                <p className="text-sm opacity-40">-</p>
              )}
            </div>

            <div className="rounded-lg border border-[var(--border)] p-4">
              <p className="text-xs opacity-50 mb-1">snkrdunk (원화 환산)</p>
              {prices?.snkrdunk_price != null ? (
                <>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatKRW(Math.round(prices.snkrdunk_price * JPY_TO_KRW))}
                  </p>
                  <p className="text-xs opacity-60 mt-1">¥{prices.snkrdunk_price.toLocaleString()} JPY</p>
                  {prices.snkrdunk_title && (
                    <p className="text-xs opacity-50 mt-1 truncate" title={prices.snkrdunk_title}>
                      {prices.snkrdunk_title}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm opacity-40">-</p>
              )}
            </div>

            {/* Box Price */}
            {set?.snkrdunk_box_price != null && (
              <div className="rounded-lg border border-[var(--border)] p-4">
                <p className="text-xs opacity-50 mb-1">박스 시세 (원화 환산)</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatKRW(Math.round(set.snkrdunk_box_price * JPY_TO_KRW))}
                </p>
                <p className="text-xs opacity-60 mt-1">¥{set.snkrdunk_box_price.toLocaleString()} JPY</p>
                {set.snkrdunk_box_title && (
                  <p className="text-xs opacity-50 mt-1 truncate" title={set.snkrdunk_box_title}>
                    {set.snkrdunk_box_title}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* External Links */}
          <div className="flex flex-wrap gap-2 mt-4">
            <a
              href={`https://www.tcgplayer.com/search/pokemon/product?q=${encodeURIComponent(card.name)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:opacity-90 transition"
            >
              TCG 검색하기 &rarr;
            </a>
            <a
              href={`https://snkrdunk.com/search?keyword=${encodeURIComponent(buildSnkrdunkSearchName(card))}&searchCategoryIds=6`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition"
            >
              스니덩 검색하기 &rarr;
            </a>
            {prices?.snkrdunk_url && (
              <a
                href={prices.snkrdunk_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[var(--primary)] text-[var(--primary)] text-sm font-medium hover:bg-[var(--primary)] hover:text-white transition"
              >
                스니덩 상품 페이지 &rarr;
              </a>
            )}
          </div>

          {prices?.fetched_at && (
            <p className="text-xs opacity-40 mt-2">
              마지막 업데이트: {new Date(prices.fetched_at).toLocaleDateString("ko-KR")}
            </p>
          )}
        </div>
      </div>

      {/* Delete button for custom cards */}
      {card.id.startsWith("snkr-") && (
        <div className="mt-6">
          <DeleteButton cardId={card.id} />
        </div>
      )}

      {/* Price History Chart */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold mb-4">시세 추이</h2>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-4">
          <PriceChart history={history ?? []} />
        </div>
      </section>
    </div>
  );
}
