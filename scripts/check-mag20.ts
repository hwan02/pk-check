import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

const envPath = ["/Users/ssh/workspace/pk-check/.env.local"].find((p) => existsSync(p));
if (!envPath) process.exit(1);
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

async function main() {
  const { data } = await supabase
    .from("listings")
    .select("id, title, category, price_usd, stock, is_active, image_url, image_urls, card_id, created_at")
    .order("created_at", { ascending: false })
    .limit(10);
  console.log(`총 ${data?.length ?? 0}개:`);
  for (const l of data ?? []) {
    console.log(`  ${l.is_active ? "✓" : "×"} stock=${l.stock} ${l.category} $${l.price_usd}`);
    console.log(`    ${l.title}`);
    console.log(`    id=${l.id} card_id=${l.card_id ?? "null"} img=${l.image_url ? "yes" : "no"} extra=${(l.image_urls ?? []).length}`);
  }
}

main();
