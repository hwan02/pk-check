export const dynamic = "force-dynamic";

import { createSsrClient } from "@/lib/supabase/ssr";
import { createServerClient } from "@/lib/supabase/server";
import type { MarketCard, MarketPriceRow } from "@/lib/market";
import MarketBrowse from "./market-browse";

export const metadata = {
  title: "MARKET · Kikidult",
  description: "포켓몬 · 원피스 트레이딩 카드 등급별 시세",
};

export default async function MarketPage() {
  const supabase = await createSsrClient();

  // 활성 카드 (그리드에 노출)
  const { data: cardRows } = await supabase
    .from("market_cards")
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });
  const cards = (cardRows ?? []) as MarketCard[];

  // 박스는 비활성도 포함해서 별도 로드 (그룹 헤더로 사용) — RLS 우회
  const admin = createServerClient();
  const { data: boxRows } = await admin
    .from("market_cards")
    .select("*")
    .eq("product_type", "box");
  const boxes = (boxRows ?? []) as MarketCard[];

  let history: MarketPriceRow[] = [];
  const targetIds = [...cards.map((c) => c.id), ...boxes.map((c) => c.id)];
  if (targetIds.length > 0) {
    const { data: histRows } = await supabase
      .from("market_price_history")
      .select("*")
      .in("card_id", targetIds)
      .order("recorded_at", { ascending: false })
      .limit(3000);
    history = (histRows ?? []) as MarketPriceRow[];
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <header className="mb-6 text-center">
        <p className="text-[10px] tracking-[0.3em] opacity-50 uppercase">MARKET</p>
        <h1 className="mt-2 text-2xl md:text-3xl font-black tracking-tight">시세</h1>
        <p className="mt-2 text-xs opacity-60">트레이딩 카드 등급별 시세 (원화)</p>
      </header>

      <MarketBrowse cards={cards} boxes={boxes} history={history} />
    </div>
  );
}
