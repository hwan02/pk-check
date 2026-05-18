import type { SupabaseClient } from "@supabase/supabase-js";
import type { MarketCard, MarketPriceRow, ProductType } from "@/lib/market";

/**
 * 활성 카드 + 해당 카드들의 가격 history 를 한 번에 가져와서 메모리에서 묶음.
 */
export async function fetchActiveMarketCards(
  supabase: SupabaseClient,
  category?: MarketCard["category"],
  productType?: ProductType,
): Promise<{ cards: MarketCard[]; historyByCard: Map<string, MarketPriceRow[]> }> {
  let q = supabase
    .from("market_cards")
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (category) q = q.eq("category", category);
  if (productType) q = q.eq("product_type", productType);
  const { data: cardRows } = await q;
  const cards = (cardRows ?? []) as MarketCard[];

  if (cards.length === 0) {
    return { cards, historyByCard: new Map() };
  }

  const ids = cards.map((c) => c.id);
  const { data: histRows } = await supabase
    .from("market_price_history")
    .select("*")
    .in("card_id", ids)
    .order("recorded_at", { ascending: false })
    .limit(2000);
  const history = (histRows ?? []) as MarketPriceRow[];
  const historyByCard = new Map<string, MarketPriceRow[]>();
  for (const r of history) {
    const arr = historyByCard.get(r.card_id) ?? [];
    arr.push(r);
    historyByCard.set(r.card_id, arr);
  }
  return { cards, historyByCard };
}
