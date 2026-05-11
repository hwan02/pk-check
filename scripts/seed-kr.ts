/**
 * 한국 공식 사이트(pokemoncard.co.kr)에서 전체 카드 스크래핑 → Supabase 저장
 * ID 패턴: BS + YYYY + SSS + NNN (년도 + 세트번호 + 카드번호)
 *
 * 사용법: npx tsx scripts/seed-kr.ts
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

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

const BASE = "https://pokemoncard.co.kr/cards/detail";
const HEADERS = { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" };

// 한국판 약자 → 영문 정규 명칭 (필터/검색은 영문 기준)
const KR_RARITY_MAP: Record<string, string> = {
  C: "Common",
  U: "Uncommon",
  R: "Rare",
  RR: "Double Rare",
  RRR: "Double Rare",
  AR: "Illustration Rare",
  SR: "Secret Rare",
  SAR: "Special Illustration Rare",
  UR: "Ultra Rare",
  HR: "Hyper Rare",
  ACE: "ACE SPEC Rare",
  P: "Promo",
  PR: "Promo",
  CHR: "Trainer Gallery Rare Holo",
  TR: "Trainer Gallery Rare Holo",
  S: "Shiny Rare",
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

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

async function main() {
  console.log("=".repeat(50));
  console.log("  한국판 카드 전체 시드");
  console.log("=".repeat(50));

  // kr-cards 세트 생성
  await supabase.from("sets").upsert({
    id: "kr-cards",
    name: "한국판 카드",
    name_ja: "韓国版カード",
    series: "Korean",
    updated_at: new Date().toISOString(),
  }, { onConflict: "id" });

  let totalSaved = 0;
  let totalFailed = 0;
  const batch: Record<string, unknown>[] = [];

  // 년도: 2023~2026, 세트: 001~020, 카드: 001~350
  for (let year = 2023; year <= 2026; year++) {
    for (let set = 1; set <= 20; set++) {
      // 세트 존재 여부 확인
      const testId = `BS${year}${String(set).padStart(3, "0")}001`;
      const testCard = await fetchCard(testId);
      if (!testCard) {
        console.log(`  ${year}-${String(set).padStart(3, "0")}: 없음 (스킵)`);
        break; // 이 년도의 다음 세트도 없을 가능성 높음
      }

      console.log(`  ${year}-${String(set).padStart(3, "0")}: 스캔 중...`);
      let consecutive_misses = 0;

      for (let card = 1; card <= 350; card++) {
        const krId = `BS${year}${String(set).padStart(3, "0")}${String(card).padStart(3, "0")}`;
        const data = await fetchCard(krId);

        if (!data) {
          consecutive_misses++;
          if (consecutive_misses >= 5) break; // 5연속 없으면 세트 끝
          continue;
        }
        consecutive_misses = 0;

        const rarityCanonical = data.rarity ? (KR_RARITY_MAP[data.rarity] ?? data.rarity) : null;

        batch.push({
          id: `kr-${krId}`,
          name: data.name,
          name_ja: data.name,
          supertype: data.supertype,
          types: null,
          subtypes: null,
          hp: data.hp || null,
          rarity: rarityCanonical,
          rarity_ja: data.rarity || null,
          set_id: "kr-cards",
          number: data.number || null,
          artist: data.artist || null,
          attacks: null,
          weaknesses: null,
          resistances: null,
          retreat_cost: null,
          region: "kr",
          image_small: data.imageUrl ? `${data.imageUrl}?w=256` : null,
          image_large: data.imageUrl ? `${data.imageUrl}?w=512` : null,
          updated_at: new Date().toISOString(),
        });

        // 100개씩 배치 저장
        if (batch.length >= 100) {
          const { error } = await supabase.from("cards").upsert(batch, { onConflict: "id" });
          if (error) console.error(`  upsert error: ${error.message}`);
          else totalSaved += batch.length;
          batch.length = 0;
          console.log(`    -> 누적 저장: ${totalSaved}장`);
        }

        // Rate limit
        if (card % 10 === 0) await sleep(200);
      }
    }
  }

  // 남은 배치 저장
  if (batch.length > 0) {
    const { error } = await supabase.from("cards").upsert(batch, { onConflict: "id" });
    if (error) console.error(`  upsert error: ${error.message}`);
    else totalSaved += batch.length;
  }

  // 빈 prices row 생성 (cron이 시세 채울 수 있도록)
  console.log("\n빈 prices row 생성...");
  const { data: krCards } = await supabase.from("cards").select("id").eq("region", "kr");
  if (krCards) {
    const priceRows = krCards.map((c) => ({ card_id: c.id, fetched_at: new Date().toISOString() }));
    for (let i = 0; i < priceRows.length; i += 500) {
      await supabase.from("prices").upsert(priceRows.slice(i, i + 500), { onConflict: "card_id" });
    }
    console.log(`  → ${priceRows.length}개 prices row 보장`);
  }

  console.log(`\n${"=".repeat(50)}`);
  console.log(`  완료! 총 ${totalSaved}장 저장`);
  console.log("=".repeat(50));
}

main().catch(console.error);
