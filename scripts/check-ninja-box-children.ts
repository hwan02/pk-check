import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
for (const line of readFileSync("/Users/ssh/workspace/pk-check/.env.local","utf-8").split("\n")) {
  const t = line.trim(); if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("="); if (i<=0) continue;
  const k = t.slice(0,i); let v = t.slice(i+1);
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1,-1);
  if (!process.env[k]) process.env[k] = v;
}
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const BOX_ID = "74487c10-4c13-48a7-9a6a-4079ce6849fc"; // 닌자스피너 박스 (직전에 확인)

async function main() {
  const { data: box } = await s.from("market_cards").select("id, name, product_type, is_active").eq("id", BOX_ID).maybeSingle();
  console.log("== 박스 ==");
  console.log(box);

  const { data: children } = await s
    .from("market_cards")
    .select("id, name, product_type, is_active, parent_id")
    .eq("parent_id", BOX_ID)
    .order("display_order");
  console.log(`\n== 박스 직접 자식 ${children?.length} 장 ==`);
  for (const c of children ?? []) {
    console.log(`  ${c.is_active ? "✓" : "×"} [${c.product_type}] ${c.name} | ${c.id}`);
  }

  // 자식 중 pack 이 있으면 그 pack 의 자식도 확인
  const packs = (children ?? []).filter((c) => c.product_type === "pack");
  for (const p of packs) {
    const { data: gch } = await s
      .from("market_cards")
      .select("id, name, product_type")
      .eq("parent_id", p.id);
    console.log(`\n  [팩 ${p.name}] 의 자식 ${gch?.length}장:`);
    for (const c of gch ?? []) console.log(`    [${c.product_type}] ${c.name}`);
  }
}
main();
