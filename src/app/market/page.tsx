export const dynamic = "force-dynamic";

import { createSsrClient } from "@/lib/supabase/ssr";
import type { MarketCard } from "@/lib/market";
import MarketBrowse from "./market-browse";

export const metadata = {
  title: "Hit · Kikidult",
};

export default async function MarketPage() {
  const supabase = await createSsrClient();
  // 활성 박스만 노출
  const { data: rows } = await supabase
    .from("market_cards")
    .select("*")
    .eq("is_active", true)
    .eq("product_type", "box")
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });
  const boxes = (rows ?? []) as MarketCard[];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <header className="mb-4 text-center">
        <h1 className="text-2xl md:text-3xl font-black tracking-tight">Hit</h1>
      </header>

      <MarketBrowse boxes={boxes} />
    </div>
  );
}
