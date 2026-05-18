export interface MarketCard {
  id: string;
  category: "pokemon" | "onepiece";
  name: string;
  name_en: string | null;
  set_name: string | null;
  rarity: string | null;
  image_url: string | null;
  price_krw: number;
  prev_price_krw: number | null;
  notes: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export const MARKET_CATEGORY_LABEL: Record<MarketCard["category"], string> = {
  pokemon: "포켓몬",
  onepiece: "원피스",
};

export function formatKRW(n: number | null | undefined): string {
  if (n == null) return "-";
  return `₩${n.toLocaleString("ko-KR")}`;
}

export function priceChange(card: Pick<MarketCard, "price_krw" | "prev_price_krw">): {
  diff: number;
  pct: number;
  dir: "up" | "down" | "flat";
} | null {
  if (card.prev_price_krw == null || card.prev_price_krw <= 0) return null;
  const diff = card.price_krw - card.prev_price_krw;
  const pct = (diff / card.prev_price_krw) * 100;
  const dir = diff > 0 ? "up" : diff < 0 ? "down" : "flat";
  return { diff, pct, dir };
}
