import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "fs";

const envPath = "/Users/ssh/workspace/pk-check/.env.local";
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

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  // 우리 cards 테이블에 '개굴닌자' 검색 — 한국판 카드 전체
  const { data: korean } = await supabase
    .from("cards")
    .select("id, name, rarity, rarity_ja, number, set_id, image_small")
    .ilike("name", "%개굴닌자%")
    .like("set_id", "kr-%")
    .order("set_id")
    .order("number");
  console.log("한국판 cards 중 '개굴닌자' 매칭:");
  for (const c of (korean ?? []) as { id: string; name: string; rarity: string | null; rarity_ja: string | null; number: string; set_id: string; image_small: string | null }[]) {
    console.log(`  [${c.set_id}] #${c.number} | ${c.name} | rarity=${c.rarity} (ja=${c.rarity_ja})`);
  }

  // kr-M4 전체 카드 번호 범위
  const { data: m4 } = await supabase
    .from("cards")
    .select("number, rarity, rarity_ja, name")
    .eq("set_id", "kr-M4")
    .order("number");
  const m4Rows = (m4 ?? []) as { number: string; rarity: string | null; name: string; rarity_ja: string | null }[];
  const nums = m4Rows.map((r) => r.number).filter(Boolean);
  console.log(`\nkr-M4 카드 번호 범위: ${nums[0]} ~ ${nums[nums.length - 1]} (총 ${nums.length}장)`);
  // 마지막 5개 카드 표시 (시크릿이 끝쪽에 있는지 확인)
  console.log("마지막 10장 (시크릿 확인):");
  for (const r of m4Rows.slice(-10)) {
    console.log(`  #${r.number} | ${r.name} | rarity=${r.rarity} (ja=${r.rarity_ja})`);
  }
}

main();
