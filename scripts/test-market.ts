/**
 * market_cards 테이블 동작 확인:
 * 1) service-role 로 더미 카드 1장 insert
 * 2) anon 키로 SELECT 가능한지 확인 (RLS 정책 검증)
 * 3) update 시 prev_price_krw 자동 보관되는지 확인 (트리거)
 * 4) 더미 카드 정리
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

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);
const anon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

async function main() {
  console.log("[1] service-role insert");
  const { data: inserted, error: insErr } = await admin
    .from("market_cards")
    .insert({
      category: "pokemon",
      name: "(테스트) 메가리자몽Y ex",
      name_en: "Mega Charizard Y ex",
      set_name: "메가 진화 SV",
      rarity: "SAR",
      price_krw: 120000,
      display_order: 0,
      notes: "테스트 더미",
    })
    .select()
    .single();
  if (insErr) { console.error("insert 실패:", insErr.message); process.exit(1); }
  console.log("  id:", inserted.id, "price:", inserted.price_krw, "prev:", inserted.prev_price_krw);

  console.log("\n[2] anon SELECT (RLS 검증)");
  const { data: pub } = await anon
    .from("market_cards")
    .select("id, name, price_krw")
    .eq("id", inserted.id)
    .maybeSingle();
  console.log("  anon으로 조회 가능:", !!pub, pub?.name);

  console.log("\n[3] 가격 갱신 → prev 자동 보관 트리거 확인");
  await admin.from("market_cards").update({ price_krw: 135000 }).eq("id", inserted.id);
  const { data: after } = await admin.from("market_cards").select("price_krw, prev_price_krw").eq("id", inserted.id).single();
  console.log(`  price=${after?.price_krw} prev=${after?.prev_price_krw} (prev 가 120000 이면 OK)`);

  console.log("\n[4] 정리 (테스트 행 삭제)");
  await admin.from("market_cards").delete().eq("id", inserted.id);
  console.log("  완료");
}

main();
