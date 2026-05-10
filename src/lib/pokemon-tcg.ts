import { POKEMON_TCG_API_BASE } from "./constants";

interface PokemonTCGResponse<T> {
  data: T[];
  page: number;
  pageSize: number;
  count: number;
  totalCount: number;
}

export async function fetchCards(
  query?: string,
  pageSize = 250,
  maxPages = 5
): Promise<Record<string, unknown>[]> {
  const all: Record<string, unknown>[] = [];

  for (let page = 1; page <= maxPages; page++) {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });
    if (query) params.set("q", query);

    const headers: Record<string, string> = {};
    if (process.env.POKEMONTCG_API_KEY) {
      headers["X-Api-Key"] = process.env.POKEMONTCG_API_KEY;
    }

    const resp = await fetch(`${POKEMON_TCG_API_BASE}/cards?${params}`, {
      headers,
    });
    if (!resp.ok) throw new Error(`Pokemon TCG API error: ${resp.status}`);

    const data: PokemonTCGResponse<Record<string, unknown>> = await resp.json();
    if (!data.data.length) break;

    all.push(...data.data);
    if (all.length >= data.totalCount) break;
  }

  return all;
}

export async function fetchSets(): Promise<Record<string, unknown>[]> {
  const headers: Record<string, string> = {};
  if (process.env.POKEMONTCG_API_KEY) {
    headers["X-Api-Key"] = process.env.POKEMONTCG_API_KEY;
  }

  const resp = await fetch(
    `${POKEMON_TCG_API_BASE}/sets?pageSize=250&orderBy=-releaseDate`,
    { headers }
  );
  if (!resp.ok) throw new Error(`Pokemon TCG API error: ${resp.status}`);

  const data: PokemonTCGResponse<Record<string, unknown>> = await resp.json();
  return data.data;
}

export function extractTCGPlayerPrice(card: Record<string, unknown>) {
  const tcgplayer = card.tcgplayer as Record<string, unknown> | undefined;
  const prices = tcgplayer?.prices as Record<string, Record<string, number>> | undefined;
  if (!prices) return { market: null, low: null, mid: null, high: null };

  for (const type of ["normal", "holofoil", "reverseHolofoil", "1stEditionHolofoil"]) {
    if (prices[type]) {
      return {
        market: prices[type].market ?? null,
        low: prices[type].low ?? null,
        mid: prices[type].mid ?? null,
        high: prices[type].high ?? null,
      };
    }
  }

  return { market: null, low: null, mid: null, high: null };
}
