/**
 * 시세 페이지 노출에 영향 미치는 요소를 점검:
 * 1) active 카드 전체 (anon 키로) — RLS 통과 여부
 * 2) product_type 별 분포
 * 3) 최근 활성화된 카드 샘플
 */

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

const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  // [1] anon 으로 활성 카드 전체
  const { data: pub, count } = await anon
    .from("market_cards")
    .select("id, name, product_type, is_active, parent_id, set_name, category, updated_at", { count: "exact" })
    .eq("is_active", true)
    .order("updated_at", { ascending: false });
  console.log(`[anon] is_active=true 카드: ${count}장\n`);

  const byType = new Map<string, number>();
  const byCat = new Map<string, number>();
  for (const c of (pub ?? []) as { product_type: string; category: string }[]) {
    byType.set(c.product_type, (byType.get(c.product_type) ?? 0) + 1);
    byCat.set(c.category, (byCat.get(c.category) ?? 0) + 1);
  }
  console.log("product_type 분포:");
  for (const [t, n] of byType) console.log(`  ${t}: ${n}`);
  console.log("category 분포:");
  for (const [c, n] of byCat) console.log(`  ${c}: ${n}`);

  console.log("\n최근 활성 카드 10장:");
  for (const c of (pub ?? []).slice(0, 10) as Record<string, unknown>[]) {
    console.log(
      `  [${c.product_type}] ${c.name} | ${c.set_name ?? "-"} | parent=${c.parent_id ?? "null"} | ${c.updated_at}`,
    );
  }

  // [2] 한 가지 더 — 노출중 singles 가 진짜 없나
  const { data: singles, count: sc } = await admin
    .from("market_cards")
    .select("id, name, set_name, parent_id", { count: "exact" })
    .eq("product_type", "single")
    .eq("is_active", true);
  console.log(`\n[admin] 활성 single: ${sc}장`);
  for (const s of (singles ?? []).slice(0, 5) as Record<string, unknown>[]) {
    console.log(`  ${s.name} | ${s.set_name ?? "-"}`);
  }
}

main();
