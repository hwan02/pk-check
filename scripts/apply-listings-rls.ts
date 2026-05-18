/**
 * 018_listings_public_select.sql 을 service-role 로 직접 적용.
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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const stmts = [
  `ALTER TABLE listings ENABLE ROW LEVEL SECURITY`,
  `DROP POLICY IF EXISTS "listings_public_select" ON listings`,
  `CREATE POLICY "listings_public_select" ON listings FOR SELECT TO anon, authenticated USING (is_active = true)`,
];

async function exec(sql: string) {
  // Supabase JS 에 raw SQL exec 없음. PostgREST 의 RPC 사용 또는 pg-meta API.
  // Supabase Management API의 /database/query 엔드포인트는 service role 로 동작.
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sql }),
  });
  if (!resp.ok) throw new Error(`${resp.status} ${await resp.text()}`);
}

async function main() {
  for (const s of stmts) {
    console.log("→", s);
    await exec(s);
  }
  console.log("\n적용 완료. anon SELECT 재확인:");

  const anon = createClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data, count } = await anon
    .from("listings")
    .select("*", { count: "exact" })
    .eq("is_active", true);
  console.log(`  anon으로 조회 가능한 active 상품: ${count} 개`);
  for (const l of data ?? []) console.log(`    - ${l.title}`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
