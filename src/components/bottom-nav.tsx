import Link from "next/link";
import { createSsrClient } from "@/lib/supabase/ssr";
import LoginLink from "@/components/login-link";

export default async function BottomNav() {
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

  const items: {
    href: string;
    label: string;
    icon: React.ReactNode;
    isLogin?: boolean;
  }[] = [
    { href: "/", label: "홈", icon: <HomeIcon /> },
    { href: "/shop", label: "상품", icon: <BagIcon /> },
    { href: "/market", label: "Hit", icon: <FlameIcon /> },
    { href: "/cart", label: "장바구니", icon: <CartIcon count={cartCount} /> },
    user
      ? { href: "/mypage", label: "MY", icon: <UserIcon /> }
      : { href: "/login", label: "로그인", icon: <UserIcon />, isLogin: true },
  ];
  if (isAdmin) items.push({ href: "/admin/listings", label: "관리", icon: <CogIcon /> });

  const itemCls =
    "flex flex-col items-center gap-0.5 py-2 text-[10px] opacity-70 hover:opacity-100";

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--card-bg)] border-t border-[var(--border)] pb-[env(safe-area-inset-bottom)]">
      <ul className={`grid max-w-md mx-auto ${items.length <= 4 ? "grid-cols-4" : items.length <= 5 ? "grid-cols-5" : "grid-cols-6"}`}>
        {items.map((it) => (
          <li key={it.href}>
            {it.isLogin ? (
              <LoginLink className={itemCls}>
                {it.icon}
                <span>{it.label}</span>
              </LoginLink>
            ) : (
              <Link href={it.href} className={itemCls}>
                {it.icon}
                <span>{it.label}</span>
              </Link>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}

function FlameIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
  );
}
function HomeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}
function BagIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}
function CartIcon({ count }: { count: number }) {
  return (
    <span className="relative">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" />
      </svg>
      {count > 0 && (
        <span className="absolute -top-1 -right-1.5 min-w-[16px] h-[16px] px-1 rounded-full bg-[var(--accent)] text-white text-[9px] font-bold flex items-center justify-center">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </span>
  );
}
function UserIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
function CogIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
