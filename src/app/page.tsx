export const dynamic = "force-dynamic";

import Link from "next/link";
import { Suspense } from "react";
import { createSsrClient } from "@/lib/supabase/ssr";
import ShopGrid from "@/components/shop-grid";
import ShopSearchBar from "@/components/shop-search-bar";
import type { Listing } from "@/lib/shop";
import { getTopPricedCardsAsListings, type ShopItem } from "@/lib/shop-data";

export default async function HomePage() {
  const supabase = await createSsrClient();

  // 1) 신규 입고 (최신순 8)
  // 2) 프리미엄 (가격 높은순 8)
  const [newestRes, priciestRes] = await Promise.all([
    supabase
      .from("listings")
      .select("*")
      .eq("is_active", true)
      .gt("stock", 0)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("listings")
      .select("*")
      .eq("is_active", true)
      .gt("stock", 0)
      .order("price_usd", { ascending: false })
      .limit(8),
  ]);

  let newest: ShopItem[] = ((newestRes.data ?? []) as Listing[]).map((l) => ({ ...l, isDemo: false }));
  let priciest: ShopItem[] = ((priciestRes.data ?? []) as Listing[]).map((l) => ({ ...l, isDemo: false }));

  // listings 비어있으면 cards 데모로 채움
  if (newest.length === 0) {
    const demos = await getTopPricedCardsAsListings(supabase, 8);
    newest = demos;
  }
  if (priciest.length === 0) {
    const demos = await getTopPricedCardsAsListings(supabase, 8);
    priciest = [...demos].sort((a, b) => b.price_usd - a.price_usd);
  }

  return (
    <div>
      {/* Hero */}
      <section className="border-b border-[var(--border)] bg-[var(--card-bg)]">
        <div className="max-w-7xl mx-auto px-4 py-12 md:py-20 text-center flex flex-col items-center">
          <p className="text-xs tracking-[0.3em] opacity-50 uppercase">Kikidult — TCG Market</p>
          <h1 className="mt-4 text-4xl md:text-6xl font-black tracking-tight leading-[1.05]">
            카드의 가치를,<br />
            정확하게 거래하세요.
          </h1>
          <p className="mt-5 text-sm md:text-base opacity-70 max-w-lg">
            포켓몬과 원피스 트레이딩 카드의 정품을 전 세계로. PayPal 결제와 안전 배송.
          </p>
          <div className="mt-7 w-full max-w-xl">
            <Suspense>
              <ShopSearchBar />
            </Suspense>
          </div>
        </div>
      </section>

      {/* Category dual tile */}
      <section className="max-w-7xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/shop?category=pokemon"
            className="group relative aspect-[16/9] sm:aspect-[4/3] rounded-2xl overflow-hidden bg-gradient-to-br from-yellow-100 to-yellow-50 border border-[var(--border)] hover:border-[var(--border-strong)] transition"
          >
            <div className="absolute inset-0 p-6 md:p-8 flex flex-col justify-end">
              <p className="text-xs tracking-[0.25em] opacity-60 uppercase">Pokémon</p>
              <h2 className="text-2xl md:text-3xl font-black mt-1">포켓몬 카드</h2>
              <p className="text-xs opacity-70 mt-2 group-hover:translate-x-1 transition-transform">바로 보기 →</p>
            </div>
          </Link>
          <Link
            href="/shop?category=onepiece"
            className="group relative aspect-[16/9] sm:aspect-[4/3] rounded-2xl overflow-hidden bg-gradient-to-br from-red-100 to-red-50 border border-[var(--border)] hover:border-[var(--border-strong)] transition"
          >
            <div className="absolute inset-0 p-6 md:p-8 flex flex-col justify-end">
              <p className="text-xs tracking-[0.25em] opacity-60 uppercase">One Piece</p>
              <h2 className="text-2xl md:text-3xl font-black mt-1">원피스 카드</h2>
              <p className="text-xs opacity-70 mt-2 group-hover:translate-x-1 transition-transform">바로 보기 →</p>
            </div>
          </Link>
        </div>
      </section>

      {/* 신규 입고 */}
      <Section title="신규 입고" subtitle="JUST ARRIVED" href="/shop?sort=newest">
        <ShopGrid listings={newest} />
      </Section>

      {/* 프리미엄 */}
      <Section title="프리미엄" subtitle="HIGH VALUE" href="/shop?sort=price_desc">
        <ShopGrid listings={priciest} />
      </Section>

      {/* 전체 보기 */}
      <div className="max-w-7xl mx-auto px-4 pt-2 pb-16 flex justify-center">
        <Link
          href="/shop"
          className="px-8 py-3 rounded-full bg-[var(--primary)] text-white text-sm font-semibold hover:opacity-90"
        >
          전체 상품 보기
        </Link>
      </div>
    </div>
  );
}

function Section({
  title,
  subtitle,
  href,
  children,
}: {
  title: string;
  subtitle: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <section className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-end justify-between mb-5">
        <div>
          <p className="text-[10px] tracking-[0.3em] opacity-50 uppercase">{subtitle}</p>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight">{title}</h2>
        </div>
        <Link href={href} className="text-xs opacity-60 hover:opacity-100 hover:underline">
          더보기 →
        </Link>
      </div>
      {children}
    </section>
  );
}
