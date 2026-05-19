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
  // jp-sv2a (포켓몬카드 151) 의 리자몽 ex 모든 변형
  const { data } = await supabase
    .from("cards")
    .select("id, name, number, rarity, image_small")
    .eq("set_id", "jp-sv2a")
    .or("name.ilike.%リザードン%,name.ilike.%charizard%,name.ilike.%리자몽%");
  console.log("jp-sv2a (포켓몬카드 151) 리자몽:");
  for (const c of data ?? []) {
    console.log(`  #${c.number} | ${c.name} | ${c.rarity}`);
    console.log(`    ${c.image_small}`);
  }

  // 영문판도 (sv3pt5)
  const { data: en } = await supabase
    .from("cards")
    .select("id, name, number, rarity, image_small")
    .eq("set_id", "sv3pt5")
    .ilike("name", "%charizard%");
  console.log("\nsv3pt5 (151 EN) 리자몽:");
  for (const c of en ?? []) {
    console.log(`  #${c.number} | ${c.name} | ${c.rarity}`);
  }
}
main();
