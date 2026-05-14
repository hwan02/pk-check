import Link from "next/link";
import { createSsrClient } from "@/lib/supabase/ssr";

export default async function TopNav() {
  const supabase = await createSsrClient();
  const { data: { user } } = await supabase.auth.getUser();

  let cartCount = 0;
  let isAdmin = false;
  if (user) {
    const [cart, profile] = await Promise.all([
      supabase.from("cart_items").select("quantity").eq("user_id", user.id),
      supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
    ]);
    cartCount = (cart.data ?? []).reduce((sum, c) => sum + (c.quantity ?? 0), 0);
    isAdmin = profile.data?.role === "admin";
  }

  return (
    <header className="border-b border-[var(--border)] bg-[var(--card-bg)]/95 backdrop-blur-sm sticky top-0 z-50">
      <nav className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-6">
        {/* 로고 */}
        <Link href="/" className="flex items-center shrink-0">
          <span
            className="text-2xl font-black tracking-tight"
            style={{ fontFamily: "var(--font-brand), sans-serif", letterSpacing: "-0.04em" }}
          >
            KIKIDULT
          </span>
        </Link>

        {/* PC 메인 메뉴 */}
        <div className="hidden md:flex items-center gap-7 text-sm font-semibold tracking-wide ml-4">
          <Link href="/shop" className="opacity-80 hover:opacity-100">SHOP</Link>
          <Link href="/shop?category=pokemon" className="opacity-80 hover:opacity-100">POKÉMON</Link>
          <Link href="/shop?category=onepiece" className="opacity-80 hover:opacity-100">ONE PIECE</Link>
          <Link href="/content" className="opacity-80 hover:opacity-100">MAGAZINE</Link>
        </div>

        {/* PC 우측 — 장바구니/계정 */}
        <div className="hidden md:flex items-center gap-4 ml-auto text-sm">
          <Link href="/cart" className="relative flex items-center opacity-80 hover:opacity-100" aria-label="장바구니">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" />
            </svg>
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-2 min-w-[16px] h-[16px] px-1 rounded-full bg-[var(--accent)] text-white text-[10px] font-bold flex items-center justify-center">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </Link>
          {user ? (
            <Link href="/orders" className="opacity-80 hover:opacity-100">내 주문</Link>
          ) : (
            <Link href="/login" className="px-3 py-1.5 rounded-full bg-[var(--primary)] text-white text-xs font-semibold">
              로그인
            </Link>
          )}
          {isAdmin && (
            <Link href="/admin/listings" className="opacity-60 hover:opacity-100 text-xs">관리</Link>
          )}
        </div>

        {/* 모바일은 워드마크만 (네비는 하단 BottomNav가 담당) */}
      </nav>
    </header>
  );
}
