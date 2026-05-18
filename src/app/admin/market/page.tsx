export const dynamic = "force-dynamic";

import Image from "next/image";
import { redirect } from "next/navigation";
import { createSsrClient } from "@/lib/supabase/ssr";
import { createServerClient } from "@/lib/supabase/server";
import {
  formatKRW,
  MARKET_CATEGORY_LABEL,
  priceChange,
  type MarketCard,
} from "@/lib/market";
import NewMarketCardForm from "./new-market-form";
import { DeleteMarketButton, PriceInline, ToggleActiveButton } from "./row-actions";

export default async function AdminMarketPage() {
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
        <p className="text-sm opacity-60">관리자만 접근 가능합니다.</p>
      </div>
    );
  }

  // service-role 로 비활성 카드도 같이 조회
  const admin = createServerClient();
  const { data } = await admin
    .from("market_cards")
    .select("*")
    .order("category", { ascending: true })
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });
  const cards = (data ?? []) as MarketCard[];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight">시세 관리</h1>
      </div>

      <NewMarketCardForm />

      <h2 className="text-sm font-semibold mt-8 mb-3">등록 카드 ({cards.length})</h2>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs opacity-60 border-b border-[var(--border)]">
              <th className="text-left py-2 px-2">이미지</th>
              <th className="text-left py-2 px-2">카테고리</th>
              <th className="text-left py-2 px-2">이름 / 세트</th>
              <th className="text-right py-2 px-2">현재가</th>
              <th className="text-right py-2 px-2">직전가</th>
              <th className="text-right py-2 px-2">변동</th>
              <th className="text-left py-2 px-2">노출</th>
              <th className="text-right py-2 px-2"></th>
            </tr>
          </thead>
          <tbody>
            {cards.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center text-xs opacity-50 py-8">
                  등록된 시세 카드가 없습니다.
                </td>
              </tr>
            )}
            {cards.map((c) => {
              const ch = priceChange(c);
              return (
                <tr key={c.id} className="border-b border-[var(--border)] hover:bg-[var(--surface)]/40">
                  <td className="py-2 px-2 w-14">
                    <div className="w-12 h-12 relative rounded overflow-hidden bg-gray-50">
                      {c.image_url ? (
                        <Image src={c.image_url} alt={c.name} fill className="object-cover" sizes="48px" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] opacity-40">x</div>
                      )}
                    </div>
                  </td>
                  <td className="py-2 px-2 text-xs">
                    <span className="px-1.5 py-0.5 rounded bg-[var(--primary)] text-white text-[10px]">
                      {MARKET_CATEGORY_LABEL[c.category]}
                    </span>
                  </td>
                  <td className="py-2 px-2">
                    <p className="font-medium truncate max-w-[280px]">{c.name}</p>
                    <p className="text-[11px] opacity-60 truncate max-w-[280px]">
                      {[c.set_name, c.rarity].filter(Boolean).join(" · ")}
                    </p>
                  </td>
                  <td className="py-2 px-2 text-right">
                    <PriceInline id={c.id} initial={c.price_krw} />
                  </td>
                  <td className="py-2 px-2 text-right text-xs opacity-60">
                    {c.prev_price_krw != null ? formatKRW(c.prev_price_krw) : "-"}
                  </td>
                  <td className="py-2 px-2 text-right text-xs">
                    {ch ? (
                      <span
                        className={
                          ch.dir === "up"
                            ? "text-red-600"
                            : ch.dir === "down"
                              ? "text-blue-600"
                              : "opacity-60"
                        }
                      >
                        {ch.dir === "up" ? "▲" : ch.dir === "down" ? "▼" : "·"}{" "}
                        {ch.pct.toFixed(1)}%
                      </span>
                    ) : (
                      <span className="opacity-50">-</span>
                    )}
                  </td>
                  <td className="py-2 px-2">
                    <ToggleActiveButton id={c.id} active={c.is_active} />
                  </td>
                  <td className="py-2 px-2 text-right">
                    <DeleteMarketButton id={c.id} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
