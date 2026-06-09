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

async function main() {
  const { data, error, count } = await supabase
    .from("raffles")
    .select("category, title, display_order, is_active, image_url, amazon_url", { count: "exact" })
    .order("display_order");
  if (error) {
    console.error("❌ raffles 테이블 조회 실패:", error.message);
    process.exit(1);
  }
  console.log(`✅ raffles 총 ${count}건\n`);

  const byCat = new Map<string, number>();
  for (const r of data ?? []) byCat.set(r.category, (byCat.get(r.category) ?? 0) + 1);
  for (const [c, n] of byCat) console.log(`  · ${c}: ${n}건`);

  console.log("\n전체 목록:");
  for (const r of data ?? []) {
    const img = r.image_url ? "🖼" : "📭";
    const act = r.is_active ? "🟢" : "⚪";
    console.log(`  ${act} ${img} [ord=${String(r.display_order).padStart(3)}] ${r.title}`);
  }
}
main();
