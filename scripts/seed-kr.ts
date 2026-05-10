/**
 * 한국 공식 사이트(pokemoncard.co.kr)에서 카드 정보 스크래핑 → Supabase 저장
 *
 * 사용법: npx tsx scripts/seed-kr.ts
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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BASE_URL = "https://pokemoncard.co.kr";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchCardIds(): Promise<string[]> {
  const resp = await fetch(`${BASE_URL}/cards`, { headers: HEADERS });
  const text = await resp.text();
  const ids = [...text.matchAll(/\/cards\/detail\/([A-Za-z0-9]+)/g)].map((m) => m[1]);
  return [...new Set(ids)];
}

interface KrCard {
  krId: string;
  name: string;
  number: string;
  rarity: string;
  hp: string;
  artist: string;
  cardType: string;
  imageUrl: string;
}

async function fetchCardDetail(krId: string): Promise<KrCard | null> {
  try {
    const resp = await fetch(`${BASE_URL}/cards/detail/${krId}`, { headers: HEADERS });
    if (!resp.ok) return null;
    const text = await resp.text();

    const imgMatch = text.match(
      /https:\/\/cards\.image\.pokemonkorea\.co\.kr\/data\/wmimages\/[^"?]+/
    );
    const imageUrl = imgMatch ? imgMatch[0] : "";

    const idx = text.indexOf("feature_image");
    if (idx < 0) return null;

    const chunk = text.slice(idx, idx + 3000);
    const texts = [...chunk.matchAll(/>([^<]{1,200})</g)]
      .map((m) => m[1].trim())
      .filter(Boolean);

    let number = "", rarity = "", artist = "", name = "", hp = "", cardType = "";

    for (let i = 0; i < texts.length; i++) {
      const t = texts[i];
      if (/^\d{3}\/\d{3}$/.test(t)) {
        number = t;
        if (i + 1 < texts.length && /^[A-Z]{1,4}$/.test(texts[i + 1])) {
          rarity = texts[i + 1];
        }
      }
      if (t === "일러스트" && i + 1 < texts.length) {
        artist = texts[i + 1];
        if (i + 2 < texts.length) name = texts[i + 2];
      }
      if (/^HP\d+$/.test(t)) hp = t.replace("HP", "");
      if (t.startsWith("카드 종류")) cardType = t.replace("카드 종류 : ", "").trim();
    }

    if (!name) return null;
    return { krId, name, number, rarity, hp, artist, cardType, imageUrl };
  } catch {
    return null;
  }
}

async function main() {
  console.log("=".repeat(50));
  console.log("  한국판 카드 데이터 시드");
  console.log("=".repeat(50));

  // kr-cards 세트 생성
  await supabase.from("sets").upsert({
    id: "kr-cards",
    name: "한국판 카드",
    name_ja: "韓国版カード",
    series: "Korean",
    updated_at: new Date().toISOString(),
  }, { onConflict: "id" });

  // 카드 목록 가져오기
  console.log("\n[1/2] 카드 목록 가져오는 중...");
  const ids = await fetchCardIds();
  console.log(`  ${ids.length}개 카드 ID 발견`);

  // 상세 가져오기
  console.log("\n[2/2] 카드 상세 스크래핑 중...");
  let saved = 0;
  let failed = 0;

  for (let i = 0; i < ids.length; i++) {
    const card = await fetchCardDetail(ids[i]);
    if (!card) {
      failed++;
      continue;
    }

    const cardId = `kr-${card.krId}`;

    const { error: cardErr } = await supabase.from("cards").upsert({
      id: cardId,
      name: card.name,
      name_ja: card.name, // 한국어 이름을 name_ja에도 저장 (검색용)
      supertype: card.cardType.includes("포켓몬") ? "Pokémon" : card.cardType.includes("에너지") ? "Energy" : "Trainer",
      types: null,
      subtypes: null,
      hp: card.hp || null,
      rarity: card.rarity || null,
      rarity_ja: card.rarity || null,
      set_id: "kr-cards",
      number: card.number || null,
      artist: card.artist || null,
      attacks: null,
      weaknesses: null,
      resistances: null,
      retreat_cost: null,
      region: "kr",
      image_small: card.imageUrl ? `${card.imageUrl}?w=256` : null,
      image_large: card.imageUrl ? `${card.imageUrl}?w=512` : null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "id" });

    if (cardErr) {
      console.error(`  에러 (${cardId}):`, cardErr.message);
      failed++;
    } else {
      saved++;
    }

    if ((i + 1) % 10 === 0) {
      console.log(`  -> ${i + 1}/${ids.length} (저장: ${saved}, 실패: ${failed})`);
      await sleep(500);
    }
  }

  console.log(`\n  완료! 저장: ${saved}, 실패: ${failed}`);
}

main().catch(console.error);
