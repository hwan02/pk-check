export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createSsrClient } from "@/lib/supabase/ssr";
import { CATEGORY_LABEL, formatUSD, type Listing } from "@/lib/shop";
import NewListingForm from "./new-listing-form";
import DeleteListingButton from "./delete-button";

export default async function AdminListingsPage() {
  const supabase = await createSsrClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "admin") {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-xl font-bold mb-2">접근 권한 없음</h1>
        <p className="text-sm opacity-60">
          이 페이지는 관리자만 접근 가능합니다. Supabase의 <code>profiles</code> 테이블에서{" "}
          <code>role</code>을 <code>admin</code>으로 설정해주세요.
        </p>
      </div>
    );
  }

  const { data } = await supabase
    .from("listings")
    .select("*")
    .order("created_at", { ascending: false });
  const listings = (data ?? []) as Listing[];

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">상품 관리</h1>
        <Link href="/shop" className="text-sm opacity-70 hover:opacity-100">
          쇼핑 페이지로 →
        </Link>
      </div>

      <NewListingForm />

      <h2 className="text-sm font-semibold mt-8 mb-3">등록 상품 ({listings.length})</h2>
      <div className="space-y-2">
        {listings.length === 0 && (
          <p className="text-sm opacity-50 py-6 text-center">등록된 상품이 없습니다.</p>
        )}
        {listings.map((l) => (
          <div
            key={l.id}
            className="flex items-center gap-3 p-3 rounded-lg border border-[var(--border)] bg-[var(--card-bg)]"
          >
            <div className="w-16 h-16 relative shrink-0 rounded overflow-hidden bg-gray-50">
              {l.image_url ? (
                <Image src={l.image_url} alt={l.title} fill className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs opacity-40">
                  없음
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--primary)] text-white">
                  {CATEGORY_LABEL[l.category]}
                </span>
                {!l.is_active && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-200">비활성</span>
                )}
                <span className="text-sm font-medium truncate">{l.title}</span>
              </div>
              {l.title_en && (
                <p className="text-xs opacity-60 truncate">{l.title_en}</p>
              )}
              <p className="text-xs opacity-60">
                {formatUSD(l.price_usd)} · 재고 {l.stock}
              </p>
            </div>
            <DeleteListingButton id={l.id} />
          </div>
        ))}
      </div>
    </div>
  );
}