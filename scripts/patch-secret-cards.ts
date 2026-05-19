/**
 * 한국판 박스의 시크릿 카드(SAR 등) 보강:
 * - 각 박스의 첫 카드 id 에서 BS prefix 추출
 * - prefix + 081 ~ 200 까지 fetch (본 세트 끝난 뒤 시크릿 슬롯)
 * - 발견되면 cards 에 upsert (set_id 는 그 박스로)
 *
 * 사용법: npx tsx scripts/patch-secret-cards.ts
 * SETS_TO_PATCH 만 손보면 다른 박스도 보강 가능
 */

import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "fs";

const envPath = "/Users/ssh/workspace/pk-check/.env.local";
if (!existsSync(envPath)) process.exit(1);
for (const line of readFileSync(envPath, "utf-8").split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i > 0) {
    const k = t.slice(0, i);
    let v = t.slice(i + 1);
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!process.env[k]) process.env[k] = v;
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const BASE = "https://pokemoncard.co.kr/cards/detail";
const HEADERS = { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" };

const KR_RARITY_MAP: Record<string, string> = {
  C: "Common", U: "Uncommon", R: "Rare", RR: "Double Rare", RRR: "Double Rare",
  AR: "Illustration Rare", SR: "Secret Rare",
  SAR: "Special Illustration Rare",
  UR: "Ultra Rare", HR: "Hyper Rare", ACE: "ACE SPEC Rare",
  P: "Promo", PR: "Promo",
  CHR: "Trainer Gallery Rare Holo", TR: "Trainer Gallery Rare Holo",
  S: "Shiny Rare",
};

// 보강할 박스 — 일단 닌자스피너 + 다른 메가 시리즈
const SETS_TO_PATCH = [
  "kr-M4",   // 닌자스피너
  "kr-M3",   // 니힐제로
  "kr-M2",   // 인페르노X
  "kr-M2a",  // MEGA 드림 ex
  "kr-M1S",  // 메가심포니아
  "kr-M1L",  // 메가브레이브
  "kr-SV9",  // 배틀파트너즈
  "kr-SV9a", // 열풍의 아레나
  "kr-SV10", // 로켓단의 영광
  "kr-SV7a", // 낙원드래고나
];

const SCAN_FROM = 81;
const SCAN_TO = 200;       // 시크릿 슬롯 충분히
const MAX_CONSECUTIVE_MISS = 30;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchCard(krId: string) {
  try {
    const resp = await fetch(`${BASE}/${krId}`, { headers: HEADERS, signal: AbortSignal.timeout(8000) });
    if (!resp.ok) return null;
    const text = await resp.text();
    if (!text.includes("feature_image")) return null;

    const imgMatch = text.match(/https:\/\/cards\.image\.pokemonkorea\.co\.kr\/data\/wmimages\/[^"?]+/);
    const imageUrl = imgMatch ? imgMatch[0] : "";

    const idx = text.indexOf("feature_image");
    const chunk = text.slice(idx, idx + 3000);
    const texts = [...chunk.matchAll(/>([^<]{1,200})</g)].map((m) => m[1].trim()).filter(Boolean);

    let number = "", rarity = "", artist = "", name = "", hp = "", cardType = "";
    for (let i = 0; i < texts.length; i++) {
      const t = texts[i];
      if (/^\d{1,3}\/\d{1,3}$/.test(t)) {
        number = t;
        if (i + 1 < texts.length && /^[A-Z]{1,4}$/.test(texts[i + 1])) rarity = texts[i + 1];
      }
      if (t === "일러스트" && i + 1 < texts.length) {
        artist = texts[i + 1];
        if (i + 2 < texts.length) name = texts[i + 2];
      }
      if (/^HP\d+$/.test(t)) hp = t.replace("HP", "");
      if (t.startsWith("카드 종류")) cardType = t.replace("카드 종류 : ", "").trim();
    }

    if (!name) return null;
    let supertype = "Trainer";
    if (cardType.includes("포켓몬")) supertype = "Pokémon";
    else if (cardType.includes("에너지")) supertype = "Energy";
    return { krId, name, number, rarity, hp, artist, supertype, imageUrl };
  } catch {
    return null;
  }
}

async function getPrefixForSet(setId: string): Promise<string | null> {
  const { data } = await supabase
    .from("cards")
    .select("id, number")
    .eq("set_id", setId)
    .order("number")
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  // id 형식: kr-BS{year}{set}{card} → BS prefix 까지 추출
  const m = /^kr-(BS\d{4}\d{3})\d{3}$/.exec(data.id);
  return m ? m[1] : null;
}

async function patchSet(setId: string): Promise<{ added: number; existed: number; missed: number }> {
  const prefix = await getPrefixForSet(setId);
  if (!prefix) {
    console.log(`  ${setId}: prefix 추출 실패 — 스킵`);
    return { added: 0, existed: 0, missed: 0 };
  }
  console.log(`\n[${setId}] prefix=${prefix}, 카드번호 ${SCAN_FROM}~${SCAN_TO} 스캔`);

  let added = 0, existed = 0, missed = 0;
  let consecutive = 0;
  for (let n = SCAN_FROM; n <= SCAN_TO; n++) {
    const krId = `${prefix}${String(n).padStart(3, "0")}`;
    const fullId = `kr-${krId}`;

    // 이미 cards 에 있으면 skip
    const { data: existing } = await supabase
      .from("cards")
      .select("id")
      .eq("id", fullId)
      .maybeSingle();
    if (existing) {
      existed++;
      consecutive = 0;
      continue;
    }

    const data = await fetchCard(krId);
    if (!data) {
      missed++;
      consecutive++;
      if (consecutive >= MAX_CONSECUTIVE_MISS) {
        console.log(`  ${MAX_CONSECUTIVE_MISS}연속 누락 → 종료 (n=${n})`);
        break;
      }
      continue;
    }
    consecutive = 0;
    const rarityCanonical = data.rarity ? (KR_RARITY_MAP[data.rarity] ?? data.rarity) : null;
    const { error } = await supabase.from("cards").insert({
      id: fullId,
      name: data.name,
      name_ja: data.name,
      supertype: data.supertype,
      hp: data.hp || null,
      rarity: rarityCanonical,
      rarity_ja: data.rarity || null,
      set_id: setId,
      number: data.number || null,
      artist: data.artist || null,
      region: "kr",
      image_small: data.imageUrl ? `${data.imageUrl}?w=256` : null,
      image_large: data.imageUrl ? `${data.imageUrl}?w=512` : null,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      console.error(`  insert 실패 #${n}: ${error.message}`);
    } else {
      added++;
      console.log(`  + #${data.number} ${data.name} (${data.rarity})`);
    }
    if (n % 10 === 0) await sleep(200);
  }
  return { added, existed, missed };
}

async function main() {
  let totalAdded = 0;
  for (const setId of SETS_TO_PATCH) {
    const r = await patchSet(setId);
    console.log(`  [${setId}] +${r.added} / 기존 ${r.existed} / 누락 ${r.missed}`);
    totalAdded += r.added;
  }
  console.log(`\n=== 합계: +${totalAdded} 장 보강 ===`);
}

main();
