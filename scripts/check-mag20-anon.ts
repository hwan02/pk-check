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
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

async function main() {
  console.log("[anon key 사용 — SSR 조건 동일]\n");

  // shop/page.tsx 와 동일한 쿼리 (기본 정렬: newest)
  const { data, count, error } = await supabase
    .from("listings")
    .select("*", { count: "exact" })
    .eq("is_active", true)
    .gt("stock", 0)
    .order("created_at", { ascending: false })
    .range(0, 23);

  console.log(`SHOP 쿼리 결과: count=${count} error=${error?.message ?? "none"}`);
  for (const l of data ?? []) {
    console.log(`  - ${l.title} (${l.category}, $${l.price_usd}, stock=${l.stock})`);
  }

  // home page 쿼리
  console.log("\nHOME newest 쿼리:");
  const { data: home, error: homeErr } = await supabase
    .from("listings")
    .select("*")
    .eq("is_active", true)
    .gt("stock", 0)
    .order("created_at", { ascending: false })
    .limit(8);
  console.log(`  count=${home?.length ?? 0} error=${homeErr?.message ?? "none"}`);

  // 직접 ID 조회
  console.log("\n특정 ID 조회:");
  const { data: byId, error: idErr } = await supabase
    .from("listings")
    .select("*")
    .eq("id", "0b5fa787-2b2c-4b33-8678-ccca385b22d2")
    .maybeSingle();
  console.log(`  found=${!!byId} error=${idErr?.message ?? "none"}`);
}

main();
