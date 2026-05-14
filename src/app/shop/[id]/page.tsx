export const dynamic = "force-dynamic";

import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createSsrClient } from "@/lib/supabase/ssr";
import { CATEGORY_LABEL, CONDITION_LABEL, LANGUAGE_LABEL, formatUSD, type Listing } from "@/lib/shop";
import { getTopCardAsListing, isUuidLike, type ShopItem } from "@/lib/shop-data";
import AddToCartButton from "./add-to-cart";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ListingDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createSsrClient();

  let item: ShopItem | null = null;

  // 1) listings(uuid) 우선
  if (isUuidLike(id)) {
    const { data } = await supabase
      .from("listings")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (data) item = { ...(data as Listing), isDemo: false };
  }

  // 2) 없으면 cards 데모 fallback (id가 카드 id 형식)
  if (!item) {
    item = await getTopCardAsListing(supabase, id);
  }

  if (!item) notFound();

  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <Link href="/shop" className="text-sm opacity-60 hover:opacity-100">
        ← 상품 목록
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
        <div className="aspect-square relative rounded-xl overflow-hidden bg-gray-50 border border-[var(--border)]">
          {item.image_url ? (
            <Image
              src={item.image_url}
              alt={item.title}
              fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-sm opacity-40">
              이미지 없음
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="text-xs px-2 py-0.5 rounded bg-[var(--primary)] text-white">
              {CATEGORY_LABEL[item.category]}
            </span>
            {item.language && LANGUAGE_LABEL[item.language] && (
              <span className="text-xs px-2 py-0.5 rounded border border-[var(--border)]">
                {LANGUAGE_LABEL[item.language]}
              </span>
            )}
            {item.condition && CONDITION_LABEL[item.condition] && (
              <span className="text-xs px-2 py-0.5 rounded border border-[var(--border)]">
                {CONDITION_LABEL[item.condition]}
              </span>
            )}
            {item.isDemo && (
              <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-700">
                DEMO
              </span>
            )}
          </div>

          <h1 className="text-2xl font-bold">{item.title}</h1>
          {item.title_en && (
            <p className="text-sm opacity-60 mt-1">{item.title_en}</p>
          )}

          <p className="text-3xl font-bold text-[var(--primary)] mt-4">
            {formatUSD(item.price_usd)}
          </p>
          <p className="text-xs opacity-60 mt-1">
            재고: {item.stock}개 · Worldwide shipping via PayPal
          </p>

          {item.description && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold mb-1">상품 정보</h3>
              <p className="text-sm whitespace-pre-line opacity-80">{item.description}</p>
            </div>
          )}
          {item.description_en && item.description_en !== item.description && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold mb-1">Info (EN)</h3>
              <p className="text-sm whitespace-pre-line opacity-80">{item.description_en}</p>
            </div>
          )}

          {item.isDemo && (
            <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              샘플 상품입니다. 실제 판매는 등록 후 가능합니다.
            </div>
          )}

          <div className="mt-8">
            <AddToCartButton
              listingId={item.id}
              disabled={!user || item.stock <= 0 || item.isDemo}
              loggedIn={!!user}
              isDemo={item.isDemo}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
