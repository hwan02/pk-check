import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

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
  // kr-M4 카드 ID 패턴
  const { data: m4 } = await supabase
    .from("cards")
    .select("id, name, number, image_small")
    .eq("set_id", "kr-M4")
    .order("number")
    .limit(5);
  console.log("kr-M4 첫 5장:");
  for (const c of m4 ?? []) {
    console.log(`  id=${c.id}`);
    console.log(`    name=${c.name} number=${c.number}`);
    console.log(`    img=${c.image_small}`);
  }
  const { data: last } = await supabase
    .from("cards")
    .select("id, name, number, rarity")
    .eq("set_id", "kr-M4")
    .order("number", { ascending: false })
    .limit(5);
  console.log("\nkr-M4 마지막 5장 (번호 큰 순):");
  for (const c of last ?? []) {
    console.log(`  id=${c.id} #${c.number} | ${c.name} (${c.rarity})`);
  }
}

main();
