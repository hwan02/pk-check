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

const ID = "1851d4f7-1eb7-41a6-8b7f-24b3c3ccb33e";

async function main() {
  const { data: card } = await s.from("market_cards").select("*").eq("id", ID).maybeSingle();
  console.log("== 카드 본인 ==");
  console.log(JSON.stringify(card, null, 2));

  if (!card) return;

  if (card.parent_id) {
    const { data: parent } = await s.from("market_cards").select("id, name, product_type, is_active, parent_id").eq("id", card.parent_id).maybeSingle();
    console.log("\n== 부모 ==");
    console.log(parent);

    // 형제 (같은 parent 의 다른 활성 카드)
    const { data: sib, count } = await s.from("market_cards").select("id, name, is_active", { count: "exact" }).eq("parent_id", card.parent_id).neq("id", card.id);
    console.log(`\n== 형제 (모두, 카운트=${count}) ==`);
    for (const c of sib ?? []) console.log(`  ${c.is_active ? "✓" : "×"} ${c.id} | ${c.name}`);

    // is_active=true 만
    const { count: activeSib } = await s.from("market_cards").select("*", { count: "exact", head: true }).eq("parent_id", card.parent_id).eq("is_active", true).neq("id", card.id);
    console.log(`  활성 형제: ${activeSib}장`);
  }

  // 자식
  if (card.product_type !== "single") {
    const { data: ch } = await s.from("market_cards").select("id, name, is_active").eq("parent_id", card.id);
    console.log(`\n== 자식 (${ch?.length ?? 0}장) ==`);
    for (const c of ch ?? []) console.log(`  ${c.is_active ? "✓" : "×"} ${c.id} | ${c.name}`);
  }
}
main();
