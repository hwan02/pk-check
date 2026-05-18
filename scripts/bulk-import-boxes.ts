/**
 * 사용자가 매거진/상품에서 자주 다루는 박스 10개를 한 번에 import.
 * service-role 직접 사용 (어드민 API 우회).
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

const BOXES = [
  "kr-SV9",   // 배틀파트너즈
  "kr-SV9a",  // 열풍의 아레나
  "kr-SV10",  // 로켓단의 영광
  "kr-M2",    // 인페르노X
  "kr-M4",    // 닌자스피너
  "kr-SV7a",  // 낙원드래고나
  "kr-M1L",   // 메가브레이브
  "kr-M1S",   // 메가심포니아
  "kr-M2a",   // MEGA 드림 ex
  "kr-M3",    // 니힐제로
];

// 가치 있는 등급만
const RARITY_KEEP = [
  "SAR", "SR", "AR", "UR", "RR",
  "Double Rare",
  "Special Illustration Rare",
  "Illustration Rare",
  "Hyper Rare",
  "Ultra Rare",
];

function upscaleImageUrl(url: string): string {
  return url.replace(/\?w=\d+/, "?w=1024");
}

interface CardRow {
  id: string;
  name: string;
  rarity: string | null;
  rarity_ja: string | null;
  image_small: string | null;
  image_large: string | null;
}

async function importOne(setId: string): Promise<{ added: number; skipped: number; setName: string }> {
  const { data: setRow } = await supabase
    .from("sets")
    .select("id, name, name_ja")
    .eq("id", setId)
    .maybeSingle();
  if (!setRow) {
    console.warn(`  세트 없음: ${setId}`);
    return { added: 0, skipped: 0, setName: setId };
  }
  const setLabel = setRow.name_ja || setRow.name || setId;

  // 카드 페이지네이션 전체 수집
  const all: CardRow[] = [];
  let from = 0;
  const STEP = 1000;
  while (true) {
    const { data: page, error } = await supabase
      .from("cards")
      .select("id, name, rarity, rarity_ja, image_small, image_large")
      .eq("set_id", setId)
      .in("rarity", RARITY_KEEP)
      .range(from, from + STEP - 1);
    if (error) {
      console.error(`  ${setId} 쿼리 실패:`, error.message);
      return { added: 0, skipped: 0, setName: setLabel };
    }
    const rows = (page ?? []) as CardRow[];
    all.push(...rows);
    if (rows.length < STEP) break;
    from += STEP;
  }

  if (all.length === 0) return { added: 0, skipped: 0, setName: setLabel };

  // 중복 확인 (cat: 토큰)
  const tokens = all.map((c) => `cat:${c.id}`);
  const { data: existing } = await supabase
    .from("market_cards")
    .select("notes")
    .in("notes", tokens);
  const dup = new Set(((existing ?? []) as { notes: string | null }[]).map((r) => r.notes));

  const inserts = all
    .filter((c) => !dup.has(`cat:${c.id}`))
    .map((c, i) => ({
      category: "pokemon" as const,
      product_type: "single" as const,
      parent_id: null,
      name: c.name,
      name_en: null,
      set_name: setLabel,
      rarity: c.rarity_ja || c.rarity || null,
      image_url: upscaleImageUrl(c.image_large || c.image_small || "") || null,
      notes: `cat:${c.id}`,
      is_active: false,
      display_order: i,
    }));

  if (inserts.length === 0) return { added: 0, skipped: all.length, setName: setLabel };

  for (let i = 0; i < inserts.length; i += 500) {
    const chunk = inserts.slice(i, i + 500);
    const { error: insErr } = await supabase.from("market_cards").insert(chunk);
    if (insErr) {
      console.error(`  ${setId} insert 실패:`, insErr.message);
      return { added: i, skipped: all.length - i, setName: setLabel };
    }
  }
  return { added: inserts.length, skipped: all.length - inserts.length, setName: setLabel };
}

async function main() {
  console.log(`박스 ${BOXES.length}개 일괄 import (rarity 필터: ${RARITY_KEEP.length}종)\n`);
  let totalAdded = 0;
  let totalSkipped = 0;
  for (const id of BOXES) {
    const r = await importOne(id);
    console.log(`  [${id.padEnd(8)}] +${r.added.toString().padStart(3)} 추가 / ${r.skipped.toString().padStart(3)} 건너뜀 — ${r.setName}`);
    totalAdded += r.added;
    totalSkipped += r.skipped;
  }
  console.log(`\n합계: +${totalAdded} 추가 / ${totalSkipped} 건너뜀`);
}

main();
