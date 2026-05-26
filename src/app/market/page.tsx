export const dynamic = "force-dynamic";

import { createServerClient } from "@/lib/supabase/server";
import type { MarketCard, MarketPriceRow } from "@/lib/market";
import MarketBrowse from "./market-browse";

export const metadata = {
  title: "Hit · Kikidult",
  description: "포켓몬 · 원피스 트레이딩 카드 히트 카드",
};

export default async function MarketPage() {
  // 어드민에서 노출 토글이 완료될 때까지 일단 박스/팩/카드 모두 로드 (비활성 포함).
  // RLS 우회를 위해 service-role 사용.
  const admin = createServerClient();
  const { data: cardRows } = await admin
    .from("market_cards")
    .select("*")
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });
  const cards = (cardRows ?? []) as MarketCard[];

  // 박스만 별도 추출 — 헤더용
  const boxes = cards.filter((c) => c.product_type === "box");

  let history: MarketPriceRow[] = [];
  if (cards.length > 0) {
    const { data: histRows } = await admin
      .from("market_price_history")
      .select("*")
      .in("card_id", cards.map((c) => c.id))
      .order("recorded_at", { ascending: false })
      .limit(3000);
    history = (histRows ?? []) as MarketPriceRow[];
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <header className="mb-6 text-center">
        <p className="text-[10px] tracking-[0.3em] opacity-50 uppercase">HIT</p>
        <h1 className="mt-2 text-2xl md:text-3xl font-black tracking-tight">Hit 카드</h1>
        <p className="mt-2 text-xs opacity-60">박스 · 팩 · 히트 카드 모음</p>
      </header>

      <MarketBrowse cards={cards} boxes={boxes} history={history} />
    </div>
  );
}
