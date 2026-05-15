export const dynamic = "force-dynamic";

import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { createSsrClient } from "@/lib/supabase/ssr";
import ShopGrid from "@/components/shop-grid";
import ShopSearchBar from "@/components/shop-search-bar";
import type { Listing } from "@/lib/shop";

export default async function HomePage() {
  const supabase = await createSsrClient();

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

  const newest = (newestRes.data ?? []) as Listing[];
  const priciest = (priciestRes.data ?? []) as Listing[];

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
          {/* Pokemon — 카드 3장 펼친 모양 */}
          <Link
            href="/shop?category=pokemon"
            className="group relative aspect-[16/9] sm:aspect-[4/3] rounded-2xl overflow-hidden border border-[var(--border)] hover:border-[var(--border-strong)] transition isolate"
          >
            {/* 배경 그라데이션: 따뜻한 옐로우 → 오렌지 */}
            <div className="absolute inset-0 bg-gradient-to-br from-amber-200 via-yellow-100 to-orange-100" />

            {/* 포켓볼 큰 워터마크 */}
            <div className="absolute -right-12 -top-12 w-64 h-64 opacity-25 group-hover:opacity-35 transition-opacity">
              <PokeballSVG />
            </div>

            {/* 카드 3장 펼친 모양 (실제 Pokemon TCG 이미지) */}
            <div className="absolute right-4 sm:right-6 bottom-0 flex items-end pointer-events-none">
              <div className="relative w-20 sm:w-24 md:w-28 aspect-[5/7] -mr-6 sm:-mr-7 rotate-[-14deg] translate-y-2 drop-shadow-xl transition-transform duration-300 group-hover:rotate-[-18deg] group-hover:-translate-y-1">
                <Image
                  src="https://images.pokemontcg.io/sv4pt5/238_hires.png"
                  alt="Pikachu"
                  fill
                  sizes="120px"
                  className="object-contain"
                  priority
                />
              </div>
              <div className="relative w-24 sm:w-28 md:w-32 aspect-[5/7] -mr-6 sm:-mr-7 z-10 drop-shadow-2xl transition-transform duration-300 group-hover:-translate-y-2">
                <Image
                  src="https://images.pokemontcg.io/sv3pt5/199_hires.png"
                  alt="Charizard ex"
                  fill
                  sizes="140px"
                  className="object-contain"
                  priority
                />
              </div>
              <div className="relative w-20 sm:w-24 md:w-28 aspect-[5/7] rotate-[12deg] translate-y-2 drop-shadow-xl transition-transform duration-300 group-hover:rotate-[16deg] group-hover:-translate-y-1">
                <Image
                  src="https://images.pokemontcg.io/sv4pt5/231_hires.png"
                  alt="Pokémon card"
                  fill
                  sizes="120px"
                  className="object-contain"
                />
              </div>
            </div>

            {/* 텍스트 */}
            <div className="absolute inset-0 p-6 md:p-8 flex flex-col justify-end">
              <p className="text-[11px] font-bold tracking-[0.3em] uppercase text-amber-900/80">
                Pokémon
              </p>
              <h2 className="text-2xl md:text-3xl font-black mt-1 text-amber-950">
                포켓몬 카드
              </h2>
              <p className="text-xs font-semibold text-amber-900/80 mt-2 group-hover:translate-x-1 transition-transform">
                바로 보기 →
              </p>
            </div>
          </Link>

          {/* One Piece — 빨강 그라데이션 + 졸리 로저 */}
          <Link
            href="/shop?category=onepiece"
            className="group relative aspect-[16/9] sm:aspect-[4/3] rounded-2xl overflow-hidden border border-[var(--border)] hover:border-[var(--border-strong)] transition isolate"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-red-200 via-rose-100 to-orange-100" />
            <div className="absolute -right-10 -top-10 w-56 h-56 opacity-25 group-hover:opacity-35 transition-opacity">
              <JollyRogerSVG />
            </div>
            <div className="absolute right-6 bottom-6 text-[80px] md:text-[110px] leading-none opacity-90 group-hover:scale-110 transition-transform duration-300 select-none">
              🏴‍☠️
            </div>
            <div className="absolute inset-0 p-6 md:p-8 flex flex-col justify-end">
              <p className="text-[11px] font-bold tracking-[0.3em] uppercase text-red-900/80">
                One Piece
              </p>
              <h2 className="text-2xl md:text-3xl font-black mt-1 text-red-950">
                원피스 카드
              </h2>
              <p className="text-xs font-semibold text-red-900/80 mt-2 group-hover:translate-x-1 transition-transform">
                바로 보기 →
              </p>
            </div>
          </Link>
        </div>
      </section>

      {/* 신규 입고 */}
      {newest.length > 0 && (
        <Section title="신규 입고" subtitle="JUST ARRIVED" href="/shop?sort=newest">
          <ShopGrid listings={newest} />
        </Section>
      )}

      {/* 프리미엄 */}
      {priciest.length > 0 && (
        <Section title="프리미엄" subtitle="HIGH VALUE" href="/shop?sort=price_desc">
          <ShopGrid listings={priciest} />
        </Section>
      )}

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

function PokeballSVG() {
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
      <circle cx="50" cy="50" r="48" fill="#fff" stroke="#1a1a1a" strokeWidth="3" />
      <path
        d="M2 50 A48 48 0 0 1 98 50 Z"
        fill="#ef4444"
        stroke="#1a1a1a"
        strokeWidth="3"
      />
      <line x1="2" y1="50" x2="98" y2="50" stroke="#1a1a1a" strokeWidth="3" />
      <circle cx="50" cy="50" r="12" fill="#fff" stroke="#1a1a1a" strokeWidth="3" />
      <circle cx="50" cy="50" r="5" fill="#1a1a1a" />
    </svg>
  );
}

function JollyRogerSVG() {
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full" fill="#1a1a1a">
      {/* 해골 + 두 개의 검 (straw hat pirates 분위기) */}
      <path
        d="M50 18c-13 0-24 9-24 22 0 8 4 14 10 19v6c0 2 1 3 3 3h22c2 0 3-1 3-3v-6c6-5 10-11 10-19 0-13-11-22-24-22z"
        opacity="0.95"
      />
      <circle cx="42" cy="42" r="5" fill="#fff" />
      <circle cx="58" cy="42" r="5" fill="#fff" />
      <path
        d="M44 56 l3 6 l3-6 l3 6 l3-6"
        stroke="#fff"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
      {/* 가로로 가로지르는 두 막대 (검 느낌) */}
      <rect x="12" y="74" width="76" height="3" transform="rotate(-12 50 76)" />
      <rect x="12" y="74" width="76" height="3" transform="rotate(12 50 76)" />
    </svg>
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
