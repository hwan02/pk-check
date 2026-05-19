import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

for (const line of readFileSync("/Users/ssh/workspace/pk-check/.env.local","utf-8").split("\n")) {
  const t = line.trim(); if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("="); if (i<=0) continue;
  const k = t.slice(0,i); let v = t.slice(i+1);
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1,-1);
  if (!process.env[k]) process.env[k] = v;
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  // 1) sets 에서 "151" 관련 박스
  const { data: sets } = await supabase
    .from("sets")
    .select("id, name, name_ja, region")
    .or("name.ilike.%151%,name_ja.ilike.%151%,id.ilike.%151%");
  console.log("'151' 관련 sets:");
  for (const s of sets ?? []) console.log(`  ${s.id} | ${s.name} | region=${s.region}`);

  // 2) cards 에서 "리자몽 ex SAR" 검색 (한국판)
  console.log("\n한국판 리자몽 ex SAR/AR 카드:");
  const { data: ko } = await supabase
    .from("cards")
    .select("id, name, set_id, rarity, rarity_ja, number")
    .ilike("name", "%리자몽%ex%")
    .like("set_id", "kr-%")
    .order("set_id");
  for (const c of ko ?? []) {
    console.log(`  [${c.set_id}] #${c.number} | ${c.name} | rarity=${c.rarity} (ja=${c.rarity_ja})`);
  }

  // 3) 일본판에서도 (참고)
  console.log("\n일본판 리자몽 SAR (sv2a == 151) :");
  const { data: jp } = await supabase
    .from("cards")
    .select("id, name, set_id, rarity, number")
    .ilike("name", "%リザードン%")
    .ilike("rarity", "%Special Illustration%")
    .like("set_id", "jp-%")
    .limit(10);
  for (const c of jp ?? []) {
    console.log(`  [${c.set_id}] #${c.number} | ${c.name} | ${c.rarity}`);
  }
}
main();
