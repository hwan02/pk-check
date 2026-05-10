import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import PriceChart from "@/components/price-chart";
import DeleteButton from "@/components/delete-button";
import { createServerClient } from "@/lib/supabase/server";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ id: string }>;
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
                className="object-contain"
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
          <h1 className="text-2xl font-bold">{card.name}</h1>
          {card.name_ja && (
            <p className="text-base opacity-60 mt-1">{card.name_ja}</p>
          )}

          <div className="flex flex-wrap gap-2 mt-3 text-xs">
            {card.rarity && (
              <span className="px-2 py-1 rounded bg-[var(--border)]">{card.rarity}</span>
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

          {/* Current Prices */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            <div className="rounded-lg border border-[var(--border)] p-4">
              <p className="text-xs opacity-50 mb-1">TCGPlayer (USD)</p>
              {prices?.tcg_market != null ? (
                <>
                  <p className="text-2xl font-bold text-green-600">
                    ${prices.tcg_market.toFixed(2)}
                  </p>
                  <div className="flex gap-3 mt-1 text-xs opacity-60">
                    {prices.tcg_low != null && <span>Low ${prices.tcg_low.toFixed(2)}</span>}
                    {prices.tcg_mid != null && <span>Mid ${prices.tcg_mid.toFixed(2)}</span>}
                    {prices.tcg_high != null && <span>High ${prices.tcg_high.toFixed(2)}</span>}
                  </div>
                </>
              ) : (
                <p className="text-sm opacity-40">-</p>
              )}
            </div>

            <div className="rounded-lg border border-[var(--border)] p-4">
              <p className="text-xs opacity-50 mb-1">snkrdunk (JPY)</p>
              {prices?.snkrdunk_price != null ? (
                <>
                  <p className="text-2xl font-bold text-blue-600">
                    ¥{prices.snkrdunk_price.toLocaleString()}
                  </p>
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
                <p className="text-xs opacity-50 mb-1">박스 시세 (snkrdunk)</p>
                <p className="text-2xl font-bold text-purple-600">
                  ¥{set.snkrdunk_box_price.toLocaleString()}
                </p>
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
            {prices?.snkrdunk_url ? (
              <a
                href={prices.snkrdunk_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition"
              >
                snkrdunk 상품 페이지 &rarr;
              </a>
            ) : card.name_ja ? (
              <a
                href={`https://snkrdunk.com/search?keyword=${encodeURIComponent(card.name_ja)}&searchCategoryIds=6`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[var(--primary)] text-[var(--primary)] text-sm font-medium hover:bg-[var(--primary)] hover:text-white transition"
              >
                snkrdunk에서 검색 &rarr;
              </a>
            ) : null}
            <a
              href={`https://www.tcgplayer.com/search/pokemon/product?q=${encodeURIComponent(card.name)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-green-600 text-green-600 text-sm font-medium hover:bg-green-600 hover:text-white transition"
            >
              TCGPlayer &rarr;
            </a>
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
