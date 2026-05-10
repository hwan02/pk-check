/**
 * DB 초기 적재 스크립트
 * Pokemon TCG API → PokeAPI(일본어 번역) → Supabase
 *
 * 사용법: npx tsx scripts/seed.ts
 * 환경변수: .env.local 필요 (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env.local
const envPath = resolve(process.cwd(), ".env.local");
const envContent = readFileSync(envPath, "utf-8");
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx > 0) {
    const key = trimmed.slice(0, eqIdx);
    const value = trimmed.slice(eqIdx + 1);
    if (!process.env[key]) process.env[key] = value;
  }
}

const POKEMON_TCG_API = "https://api.pokemontcg.io/v2";
const POKEAPI_BASE = "https://pokeapi.co/api/v2/pokemon-species";

const RARITY_MAP: Record<string, string> = {
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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const jaNameCache = new Map<string, string | null>();

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractBaseName(name: string): string {
  let base = name.split(/\s+(ex|EX|V|VSTAR|VMAX|GX|Tag Team|MEGA|BREAK|δ)/)[0].trim();
  if (base.includes("'s ")) base = base.split("'s ").pop()!;
  return base;
}

async function getJapaneseName(englishName: string): Promise<string | null> {
  const base = extractBaseName(englishName);
  const cacheKey = base.toLowerCase();
  if (jaNameCache.has(cacheKey)) return jaNameCache.get(cacheKey)!;

  try {
    const slug = base.toLowerCase().replace(/ /g, "-").replace(/\./g, "").replace(/'/g, "");
    const resp = await fetch(`${POKEAPI_BASE}/${slug}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (resp.ok) {
      const data = await resp.json();
      const ja = data.names?.find(
        (n: { language: { name: string }; name: string }) => n.language.name === "ja"
      );
      if (ja) {
        jaNameCache.set(cacheKey, ja.name);
        return ja.name;
      }
    }
  } catch {
    // timeout
  }
  jaNameCache.set(cacheKey, null);
  return null;
}

function extractPrice(card: Record<string, any>) {
  const prices = card.tcgplayer?.prices;
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

const GOOGLE_TRANSLATE_URL = "https://translate.googleapis.com/translate_a/single";

async function translateToJa(text: string): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      client: "gtx", sl: "en", tl: "ja", dt: "t", q: text,
    });
    const resp = await fetch(`${GOOGLE_TRANSLATE_URL}?${params}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return data?.[0]?.[0]?.[0] ?? null;
  } catch {
    return null;
  }
}

async function seedSets() {
  console.log("\n[1/3] 세트 데이터 로딩...");
  const headers: Record<string, string> = {};
  if (process.env.POKEMONTCG_API_KEY) headers["X-Api-Key"] = process.env.POKEMONTCG_API_KEY;

  const resp = await fetch(`${POKEMON_TCG_API}/sets?pageSize=250&orderBy=-releaseDate`, { headers });
  const data = await resp.json();
  const sets = data.data as Record<string, any>[];

  console.log(`  ${sets.length}개 세트 발견`);
  console.log(`  세트 이름 일본어 번역 중...`);

  const rows = [];
  for (let i = 0; i < sets.length; i++) {
    const s = sets[i];
    const nameJa = await translateToJa(s.name);
    rows.push({
      id: s.id,
      name: s.name,
      name_ja: nameJa,
      series: s.series ?? null,
      printed_total: s.printedTotal ?? null,
      release_date: s.releaseDate ?? null,
      logo_url: s.images?.logo ?? null,
      symbol_url: s.images?.symbol ?? null,
      updated_at: new Date().toISOString(),
    });
    if ((i + 1) % 20 === 0) {
      console.log(`  -> ${i + 1}/${sets.length} 번역 완료`);
      await sleep(300);
    }
  }

  // Upsert in batches of 100
  for (let i = 0; i < rows.length; i += 100) {
    const batch = rows.slice(i, i + 100);
    const { error } = await supabase.from("sets").upsert(batch, { onConflict: "id" });
    if (error) {
      console.error(`  세트 upsert 에러:`, error.message);
      return;
    }
  }
  console.log(`  -> ${rows.length}개 세트 저장 완료 (일본어 이름 포함)`);
}

async function seedCards() {
  console.log("\n[2/3] 카드 데이터 로딩...");
  const headers: Record<string, string> = {};
  if (process.env.POKEMONTCG_API_KEY) headers["X-Api-Key"] = process.env.POKEMONTCG_API_KEY;

  const allCards: Record<string, any>[] = [];
  let page = 1;
  const pageSize = 250;

  while (true) {
    console.log(`  페이지 ${page} 로딩 중...`);
    const resp = await fetch(
      `${POKEMON_TCG_API}/cards?page=${page}&pageSize=${pageSize}`,
      { headers }
    );
    const data = await resp.json();
    const cards = data.data as Record<string, any>[];
    if (!cards.length) break;

    allCards.push(...cards);
    console.log(`  -> ${cards.length}장 로드 (누적: ${allCards.length}/${data.totalCount})`);

    if (allCards.length >= data.totalCount) break;
    page++;
    await sleep(300); // rate limit
  }

  console.log(`\n  총 ${allCards.length}장 카드 로드 완료`);

  // Japanese name translation
  console.log("\n  일본어 이름 변환 중...");
  const uniqueNames = new Set<string>();
  for (const card of allCards) {
    if (card.supertype === "Pokémon") {
      uniqueNames.add(extractBaseName(card.name));
    }
  }

  let translated = 0;
  let i = 0;
  for (const name of uniqueNames) {
    const ja = await getJapaneseName(name);
    if (ja) translated++;
    i++;
    if (i % 50 === 0) {
      console.log(`  -> ${i}/${uniqueNames.size} 변환 (성공: ${translated})`);
      await sleep(500);
    }
  }
  console.log(`  -> 변환 완료: ${translated}/${uniqueNames.size}`);

  // Upsert cards + prices in batches
  console.log("\n  DB에 저장 중...");
  const cardRows = [];
  const priceRows = [];

  for (const card of allCards) {
    const jaName = card.supertype === "Pokémon" ? await getJapaneseName(card.name) : null;

    cardRows.push({
      id: card.id,
      name: card.name,
      name_ja: jaName,
      supertype: card.supertype ?? null,
      types: card.types ?? null,
      subtypes: card.subtypes ?? null,
      hp: card.hp ?? null,
      rarity: card.rarity ?? null,
      rarity_ja: card.rarity ? (RARITY_MAP[card.rarity] ?? null) : null,
      set_id: card.set?.id ?? null,
      number: card.number ?? null,
      artist: card.artist ?? null,
      attacks: card.attacks ?? null,
      weaknesses: card.weaknesses ?? null,
      resistances: card.resistances ?? null,
      retreat_cost: card.retreatCost ?? null,
      image_small: card.images?.small ?? null,
      image_large: card.images?.large ?? null,
      updated_at: new Date().toISOString(),
    });

    const price = extractPrice(card);
    priceRows.push({
      card_id: card.id,
      tcg_market: price.market,
      tcg_low: price.low,
      tcg_mid: price.mid,
      tcg_high: price.high,
      snkrdunk_price: null,
      snkrdunk_title: null,
      fetched_at: new Date().toISOString(),
    });
  }

  // Batch upsert cards
  const BATCH = 500;
  for (let i = 0; i < cardRows.length; i += BATCH) {
    const batch = cardRows.slice(i, i + BATCH);
    const { error } = await supabase.from("cards").upsert(batch, { onConflict: "id" });
    if (error) {
      console.error(`  카드 upsert 에러 (${i}):`, error.message);
      return;
    }
    if ((i + BATCH) % 2000 === 0 || i + BATCH >= cardRows.length) {
      console.log(`  -> 카드 ${Math.min(i + BATCH, cardRows.length)}/${cardRows.length} 저장`);
    }
  }

  // Batch upsert prices
  for (let i = 0; i < priceRows.length; i += BATCH) {
    const batch = priceRows.slice(i, i + BATCH);
    const { error } = await supabase.from("prices").upsert(batch, { onConflict: "card_id" });
    if (error) {
      console.error(`  가격 upsert 에러 (${i}):`, error.message);
      return;
    }
  }
  console.log(`  -> ${priceRows.length}건 가격 저장 완료`);
}

async function main() {
  console.log("=".repeat(50));
  console.log("  Pokemon TCG DB Seed");
  console.log("=".repeat(50));

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("ERROR: .env.local에 Supabase 환경변수를 설정해주세요.");
    process.exit(1);
  }

  await seedSets();
  await seedCards();

  console.log("\n" + "=".repeat(50));
  console.log("  Seed 완료!");
  console.log("=".repeat(50));
}

main().catch(console.error);
