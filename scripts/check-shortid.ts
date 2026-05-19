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

async function main() {
  const { count: total } = await s.from("market_cards").select("*", { count: "exact", head: true });
  const { count: withShort } = await s.from("market_cards").select("*", { count: "exact", head: true }).not("short_id", "is", null);
  console.log(`market_cards: 총 ${total}장 / short_id 있음 ${withShort}장`);

  // 리자몽 ex SAR 카드 (이전 문제 그 카드)
  const { data } = await s
    .from("market_cards")
    .select("id, short_id, name")
    .eq("id", "1851d4f7-1eb7-41a6-8b7f-24b3c3ccb33e")
    .maybeSingle();
  if (data) {
    console.log(`\n리자몽 ex SAR:`);
    console.log(`  UUID: ${data.id}`);
    console.log(`  short: ${data.short_id}`);
    console.log(`  → /market/${data.short_id}`);
  }

  // 닌자스피너 박스
  const { data: box } = await s
    .from("market_cards")
    .select("id, short_id, name")
    .eq("id", "74487c10-4c13-48a7-9a6a-4079ce6849fc")
    .maybeSingle();
  if (box) {
    console.log(`\n닌자스피너 박스:`);
    console.log(`  short: ${box.short_id}`);
    console.log(`  → /market/${box.short_id}`);
  }
}
main();
