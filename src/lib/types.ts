export interface CardSet {
  id: string;
  name: string;
  name_ja: string | null;
  series: string | null;
  printed_total: number | null;
  release_date: string | null;
  logo_url: string | null;
  symbol_url: string | null;
  snkrdunk_box_price: number | null;
  snkrdunk_box_title: string | null;
  region: string | null;
  updated_at: string | null;
}

export interface Card {
  id: string;
  name: string;
  name_ja: string | null;
  supertype: string | null;
  types: string[] | null;
  subtypes: string[] | null;
  hp: string | null;
  rarity: string | null;
  rarity_ja: string | null;
  set_id: string | null;
  number: string | null;
  artist: string | null;
  attacks: Attack[] | null;
  weaknesses: TypeValue[] | null;
  resistances: TypeValue[] | null;
  retreat_cost: string[] | null;
  region: string | null; // "en" = 북미판, "jp" = 일본판, "kr" = 한국판
  image_small: string | null;
  image_large: string | null;
  updated_at: string | null;
}

export interface Attack {
  name: string;
  cost: string[];
  damage: string;
  text: string;
}

export interface TypeValue {
  type: string;
  value: string;
}

export interface Price {
  card_id: string;
  tcg_market: number | null;
  tcg_low: number | null;
  tcg_mid: number | null;
  tcg_high: number | null;
  snkrdunk_price: number | null;
  snkrdunk_title: string | null;
  snkrdunk_url: string | null;
  fetched_at: string | null;
}

export interface PriceHistory {
  id: number;
  card_id: string;
  tcg_market: number | null;
  snkrdunk_price: number | null;
  recorded_at: string;
}

export interface CardWithPrice extends Card {
  prices: Price | null;
  set: CardSet | null;
}

export interface SearchParams {
  q?: string;
  rarity?: string;
  type?: string;
  set_id?: string;
  sort?: "price_asc" | "price_desc" | "name" | "newest";
  page?: number;
  limit?: number;
}

export interface SearchResult {
  cards: CardWithPrice[];
  total: number;
  page: number;
  totalPages: number;
}
