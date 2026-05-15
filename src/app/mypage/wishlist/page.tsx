export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { createSsrClient } from "@/lib/supabase/ssr";
import ShopGrid from "@/components/shop-grid";
import type { Listing } from "@/lib/shop";

export default async function WishlistPage() {
  const supabase = await createSsrClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/mypage/wishlist");

  const { data } = await supabase
    .from("wishlists")
    .select("listing_id, created_at, listing:listings(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const rows = (data ?? []) as unknown as { listing_id: string; listing: Listing | null }[];
  const listings = rows
    .map((r) => r.listing)
    .filter((l): l is Listing => !!l);
  const wishlistedIds = new Set(listings.map((l) => l.id));

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <nav className="text-xs opacity-60 mb-4 flex items-center gap-1.5">
        <Link href="/mypage" className="hover:opacity-100">My Page</Link>
        <span>/</span>
        <span className="opacity-80">찜한 상품</span>
      </nav>

      <h1 className="text-2xl font-bold tracking-tight mb-6">
        찜한 상품
        <span className="ml-2 text-base opacity-50 font-normal">{listings.length}</span>
      </h1>

      {listings.length === 0 ? (
        <div className="py-20 text-center text-sm opacity-50">
          찜한 상품이 없습니다.
          <div className="mt-4">
            <Link
              href="/shop"
              className="inline-block px-4 py-2 rounded-lg border border-[var(--border)] text-xs font-semibold hover:border-[var(--primary)]"
            >
              상품 둘러보기
            </Link>
          </div>
        </div>
      ) : (
        <ShopGrid listings={listings} wishlistedIds={wishlistedIds} loggedIn={true} />
      )}
    </div>
  );
}
