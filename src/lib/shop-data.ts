import type { SupabaseClient } from "@supabase/supabase-js";
import type { Listing } from "@/lib/shop";

export interface ShopItem extends Listing {
  isDemo: boolean;
}

const USD_TO_JPY = 150;

interface ViewRow {
  id: string;
  name: string;
  name_ja: string | null;
  rarity: string | null;
  rarity_ja: string | null;
  image_small: string | null;
  image_large: string | null;
  updated_at: string | null;
  tcg_market: number | null;
  snkrdunk_price: number | null;
  set_name: string | null;
}

function bestUsdPrice(row: ViewRow): number | null {
  if (row.tcg_market) return Number(row.tcg_market);
  if (row.snkrdunk_price) return Number(row.snkrdunk_price) / USD_TO_JPY;
  return null;
}

function rowToShopItem(row: ViewRow): ShopItem | null {
  const usd = bestUsdPrice(row);
  if (!usd || usd <= 0) return null;
  const title = row.name_ja || row.name;
  const setLabel = row.set_name || "";
  return {
    id: row.id,
    title,
    title_en: row.name,
    category: "pokemon",
    language: "en",
    condition: "near-mint",
    price_usd: Math.round(usd * 100) / 100,
    stock: 1,
    description: [setLabel, row.rarity_ja || row.rarity].filter(Boolean).join(" · ") || null,
    description_en: [setLabel, row.rarity].filter(Boolean).join(" · ") || null,
    image_url: row.image_large || row.image_small,
    image_urls: null,
    is_active: true,
    card_id: row.id,
    created_at: row.updated_at ?? new Date().toISOString(),
    updated_at: row.updated_at ?? new Date().toISOString(),
    isDemo: true,
  };
}

const SELECT_COLS =
  "id, name, name_ja, rarity, rarity_ja, image_small, image_large, updated_at, tcg_market, snkrdunk_price, set_name";

export async function getTopPricedCardsAsListings(
  supabase: SupabaseClient,
  limit = 10,
): Promise<ShopItem[]> {
  const { data } = await supabase
    .from("cards_with_prices")
    .select(SELECT_COLS)
    .not("tcg_market", "is", null)
    .not("image_small", "is", null)
    .order("tcg_market", { ascending: false, nullsFirst: false })
    .limit(limit * 2);

  return ((data ?? []) as ViewRow[])
    .map(rowToShopItem)
    .filter((x): x is ShopItem => x !== null)
    .slice(0, limit);
}

export async function getTopCardAsListing(
  supabase: SupabaseClient,
  cardId: string,
): Promise<ShopItem | null> {
  const { data } = await supabase
    .from("cards_with_prices")
    .select(SELECT_COLS)
    .eq("id", cardId)
    .maybeSingle();
  if (!data) return null;
  return rowToShopItem(data as ViewRow);
}

export function isUuidLike(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}
