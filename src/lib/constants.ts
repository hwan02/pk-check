export const RARITY_MAP: Record<string, string> = {
  "Illustration Rare": "AR",
  "Special Illustration Rare": "SAR",
  "Hyper Rare": "HR",
  "Ultra Rare": "UR",
  "Secret Rare": "SR",
  "Art Rare": "AR",
  "Double Rare": "RR",
  "Rare Holo V": "V",
  "Rare Holo VSTAR": "VSTAR",
  "Rare Holo VMAX": "VMAX",
  "Rare": "R",
  "Uncommon": "U",
  "Common": "C",
  "Amazing Rare": "AR",
  "Shiny Rare": "S",
  "Trainer Gallery Rare Holo": "CHR",
  "ACE SPEC Rare": "ACE",
};

export const POKEMON_TCG_API_BASE = "https://api.pokemontcg.io/v2";
export const POKEAPI_BASE = "https://pokeapi.co/api/v2/pokemon-species";

export const ITEMS_PER_PAGE = 24;

// 환율 (2026-05 기준 근사치) - 모든 가격을 KRW로 통일 표시할 때 사용
export const USD_TO_KRW = 1380;
export const JPY_TO_KRW = 9;
export const USD_TO_JPY = USD_TO_KRW / JPY_TO_KRW;

interface PriceLike {
  tcg_market?: number | null;
  snkrdunk_price?: number | null;
}

/**
 * 카드의 대표 시세를 KRW로 환산.
 * - snkrdunk_price(JPY)가 있으면 우선 (일본/한국 시장)
 * - 없으면 tcg_market(USD) 환산
 */
export function toKRW(prices: PriceLike | null | undefined): number | null {
  if (!prices) return null;
  if (prices.snkrdunk_price != null) return Math.round(prices.snkrdunk_price * JPY_TO_KRW);
  if (prices.tcg_market != null) return Math.round(prices.tcg_market * USD_TO_KRW);
  return null;
}

export function formatKRW(amount: number | null): string {
  if (amount == null) return "-";
  return `₩${amount.toLocaleString("ko-KR")}`;
}
