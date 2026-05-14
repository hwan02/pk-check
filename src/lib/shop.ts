export interface Listing {
  id: string;
  title: string;
  title_en: string | null;
  category: "pokemon" | "onepiece";
  language: string | null;
  condition: string | null;
  price_usd: number;
  stock: number;
  description: string | null;
  description_en: string | null;
  image_url: string | null;
  image_urls: string[] | null;
  is_active: boolean;
  card_id: string | null;
  created_at: string;
  updated_at: string;
}

export const CATEGORY_LABEL: Record<Listing["category"], string> = {
  pokemon: "포켓몬",
  onepiece: "원피스",
};

export const CONDITION_LABEL: Record<string, string> = {
  mint: "M (Mint)",
  "near-mint": "NM (Near Mint)",
  excellent: "EX (Excellent)",
  good: "GD (Good)",
  played: "PL (Played)",
};

export const LANGUAGE_LABEL: Record<string, string> = {
  jp: "일본판",
  en: "북미판",
  kr: "한국판",
};

export function formatUSD(n: number): string {
  return `$${n.toFixed(2)}`;
}