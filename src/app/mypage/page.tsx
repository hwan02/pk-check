export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { createSsrClient } from "@/lib/supabase/ssr";

export default async function MyPage() {
  const supabase = await createSsrClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/mypage");

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, email, role")
    .eq("id", user.id)
    .maybeSingle();

  const displayName = profile?.name || user.email?.split("@")[0] || "회원";

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* 회원 카드 */}
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 mb-4 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-lg font-bold">
          {displayName.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold truncate">{displayName}</p>
          <p className="text-xs opacity-60 truncate mt-0.5">
            {profile?.email ?? user.email}
          </p>
        </div>
        {profile?.role === "admin" && (
          <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-amber-50 text-amber-700">
            ADMIN
          </span>
        )}
      </section>

      {/* 메뉴 */}
      <h2 className="text-xs font-semibold tracking-widest uppercase opacity-60 px-1 mb-2">
        My Page
      </h2>
      <ul className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden divide-y divide-[var(--border)] mb-4">
        <MenuItem href="/orders" label="주문/배송 조회" icon={<ReceiptIcon />} />
        <MenuItem href="/support" label="고객센터 채팅" icon={<ChatIcon />} />
        <MenuItem href="/cart" label="장바구니" icon={<CartIcon />} />
        <MenuItem
          href="/mypage/profile"
          label="회원정보 수정"
          icon={<UserIcon />}
        />
        {profile?.role === "admin" && (
          <MenuItem
            href="/admin/listings"
            label="관리자 콘솔"
            icon={<CogIcon />}
          />
        )}
      </ul>

      {/* 로그아웃 */}
      <form action="/api/auth/signout" method="POST">
        <button
          type="submit"
          className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] py-4 text-sm font-semibold opacity-70 hover:opacity-100 hover:border-[var(--border-strong)] transition"
        >
          로그아웃
        </button>
      </form>
    </div>
  );
}

function MenuItem({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        className="flex items-center gap-3 px-5 py-4 hover:bg-[var(--surface)] transition"
      >
        <span className="opacity-70">{icon}</span>
        <span className="text-sm font-medium flex-1">{label}</span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="opacity-40"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </Link>
    </li>
  );
}

function ReceiptIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 2v20l3-2 3 2 3-2 3 2 3-2 1 2V2H4Z" />
      <line x1="8" y1="7" x2="16" y2="7" />
      <line x1="8" y1="11" x2="16" y2="11" />
      <line x1="8" y1="15" x2="13" y2="15" />
    </svg>
  );
}
function CartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" />
    </svg>
  );
}
function UserIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
function ChatIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
function CogIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
