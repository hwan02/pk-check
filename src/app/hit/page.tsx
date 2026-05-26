export const dynamic = "force-dynamic";

import { createSsrClient } from "@/lib/supabase/ssr";
import type { MarketCard } from "@/lib/market";
import MarketBrowse from "./market-browse";

export const metadata = {
  title: "Hit · Kikidult",
};

export default async function MarketPage() {
  const supabase = await createSsrClient();
  // 활성 박스 + 활성 팩 + 활성 single 모두 로드 (서로 부모-자식 따라 매핑)
  const { data: rows } = await supabase
    .from("market_cards")
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });
  const all = (rows ?? []) as MarketCard[];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <header className="mb-4 text-center">
        <h1 className="text-2xl md:text-3xl font-black tracking-tight">Hit</h1>
      </header>

      <MarketBrowse all={all} />
    </div>
  );
}
