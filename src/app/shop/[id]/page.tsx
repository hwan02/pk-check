export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { createSsrClient } from "@/lib/supabase/ssr";
import { CATEGORY_LABEL, CONDITION_LABEL, LANGUAGE_LABEL, formatUSD, type Listing } from "@/lib/shop";
import AddToCartButton from "./add-to-cart";
import PriceTrend from "@/components/price-trend";
import ProductVideo from "@/components/product-video";
import ProductGallery from "@/components/product-gallery";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ListingDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createSsrClient();

  const { data } = await supabase
    .from("listings")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  const item = data as Listing | null;
  if (!item) notFound();

  const { data: { user } } = await supabase.auth.getUser();

  // 시세 추이: card_id 연결돼있으면 price_history 조회
  let priceHistory: { recorded_at: string; tcg_market: number | null; snkrdunk_price: number | null }[] = [];
  if (item.card_id) {
    const { data: hist } = await supabase
      .from("price_history")
      .select("recorded_at, tcg_market, snkrdunk_price")
      .eq("card_id", item.card_id)
      .order("recorded_at", { ascending: true })
      .limit(400);
    priceHistory = hist ?? [];
  }

  return (
    <div className="max-w-6xl mx-auto px-4 pt-4 pb-12">
      {/* breadcrumb */}
      <nav className="text-xs opacity-60 mb-4 flex items-center gap-1.5">
        <Link href="/shop" className="hover:opacity-100">SHOP</Link>
        <span>/</span>
        <Link href={`/shop?category=${item.category}`} className="hover:opacity-100">
          {CATEGORY_LABEL[item.category]}
        </Link>
        <span>/</span>
        <span className="opacity-80 truncate">{item.title}</span>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-[1.1fr_1fr] gap-8 lg:gap-12">
        {/* Image */}
        <div>
          <ProductGallery
            images={[item.image_url, ...(item.image_urls ?? [])].filter(
              (s): s is string => !!s,
            )}
            title={item.title}
          />
        </div>

        {/* Info / Price */}
        <div className="md:sticky md:top-20 md:self-start">
          {/* 영문/카테고리 라인 (작게) */}
          <div className="text-xs tracking-widest opacity-50 uppercase mb-1">
            {CATEGORY_LABEL[item.category]}
            {item.title_en && <> · {item.title_en}</>}
          </div>

          {/* 메인 타이틀 */}
          <h1 className="text-2xl md:text-3xl font-bold leading-tight tracking-tight">
            {item.title}
          </h1>

          {/* 옵션 칩 */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {item.language && LANGUAGE_LABEL[item.language] && (
              <span className="text-[11px] px-2 py-1 rounded-full border border-[var(--border)]">
                {LANGUAGE_LABEL[item.language]}
              </span>
            )}
            {item.condition && CONDITION_LABEL[item.condition] && (
              <span className="text-[11px] px-2 py-1 rounded-full border border-[var(--border)]">
                {CONDITION_LABEL[item.condition]}
              </span>
            )}
          </div>

          {/* 가격 박스 (KREAM 시그니처) */}
          <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5">
            <p className="text-xs opacity-60 mb-1">즉시 구매가</p>
            <p className="text-3xl md:text-4xl font-extrabold tracking-tight">
              {formatUSD(item.price_usd)}
            </p>
            <p className="text-xs opacity-60 mt-1">Worldwide shipping · PayPal</p>

            <dl className="grid grid-cols-2 gap-y-2 mt-5 pt-4 border-t border-[var(--border)] text-xs">
              <dt className="opacity-60">재고</dt>
              <dd className="text-right font-medium">{item.stock}개</dd>

              <dt className="opacity-60">카테고리</dt>
              <dd className="text-right font-medium">{CATEGORY_LABEL[item.category]}</dd>

              {item.language && LANGUAGE_LABEL[item.language] && (
                <>
                  <dt className="opacity-60">언어</dt>
                  <dd className="text-right font-medium">{LANGUAGE_LABEL[item.language]}</dd>
                </>
              )}

              {item.condition && CONDITION_LABEL[item.condition] && (
                <>
                  <dt className="opacity-60">상태</dt>
                  <dd className="text-right font-medium">{CONDITION_LABEL[item.condition]}</dd>
                </>
              )}
            </dl>
          </div>

          {/* CTA */}
          <div className="mt-5">
            <AddToCartButton
              listingId={item.id}
              disabled={item.stock <= 0}
              loggedIn={!!user}
            />
          </div>
        </div>
      </div>

      {/* 상품 영상 */}
      {item.video_url && (
        <section className="mt-12 max-w-3xl">
          <h2 className="text-sm font-semibold tracking-widest uppercase opacity-70 mb-3">
            상품 영상
          </h2>
          <ProductVideo url={item.video_url} title={item.title} />
        </section>
      )}

      {/* 시세 추이 (연결된 카드일 때) */}
      {priceHistory.length > 0 && (
        <section className="mt-12 max-w-3xl">
          <h2 className="text-sm font-semibold tracking-widest uppercase opacity-70 mb-3">시세 추이</h2>
          <PriceTrend data={priceHistory} />
        </section>
      )}

      {/* 상품 정보 / 배송 안내 — 아래에 펼침 */}
      {(item.description || item.description_en) && (
        <section className="mt-12 max-w-3xl">
          <h2 className="text-sm font-semibold tracking-widest uppercase opacity-70 mb-3">상품 정보</h2>
          {item.description && (
            <p className="text-sm whitespace-pre-line opacity-90 leading-relaxed">{item.description}</p>
          )}
          {item.description_en && item.description_en !== item.description && (
            <>
              <h3 className="text-xs font-semibold tracking-widest uppercase opacity-60 mt-6 mb-2">INFO (EN)</h3>
              <p className="text-sm whitespace-pre-line opacity-80 leading-relaxed">{item.description_en}</p>
            </>
          )}
        </section>
      )}

      <section className="mt-12 max-w-3xl">
        <h2 className="text-sm font-semibold tracking-widest uppercase opacity-70 mb-3">배송 & 결제</h2>
        <ul className="text-sm opacity-80 space-y-1.5">
          <li>· 전 세계 배송 (Worldwide shipping)</li>
          <li>· PayPal 결제 지원</li>
          <li>· 영업일 기준 1–3일 내 발송</li>
        </ul>
      </section>
    </div>
  );
}
