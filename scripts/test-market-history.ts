/**
 * 026 적용 후 검증:
 * 1) market_cards.price_krw 컬럼이 없는지 (있으면 마이그레이션 미적용)
 * 2) 기존 placeholder 48장 살아있는지
 * 3) market_price_history insert + RLS SELECT
 * 4) anon 으로 history join 가능한지
 * 5) 정리
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
  console.log("[1] market_cards 컬럼 상태");
  const { data: sample } = await admin.from("market_cards").select("*").limit(1).maybeSingle();
  if (sample) {
    const keys = Object.keys(sample);
    const hasPrice = keys.includes("price_krw") || keys.includes("prev_price_krw");
    console.log(`  컬럼: ${keys.join(", ")}`);
    console.log(`  price_krw/prev_price_krw 제거됨: ${!hasPrice ? "✓" : "× 마이그레이션 미적용"}`);
  } else {
    console.log("  카드 0장 (placeholder 모두 제거됨?)");
  }

  console.log("\n[2] 카드 개수");
  const { count } = await admin.from("market_cards").select("*", { count: "exact", head: true });
  console.log(`  market_cards: ${count}장`);

  // 테스트용 카드 1장
  console.log("\n[3] market_price_history insert");
  const { data: card } = await admin
    .from("market_cards")
    .insert({
      category: "pokemon",
      name: "(테스트) 검증용",
      is_active: true,
    })
    .select("id")
    .single();
  const cardId = card!.id;

  const rows = [
    { card_id: cardId, grade: "PSA 10", price_krw: 500000, recorded_at: "2026-04-01" },
    { card_id: cardId, grade: "PSA 10", price_krw: 520000, recorded_at: "2026-04-15" },
    { card_id: cardId, grade: "PSA 10", price_krw: 540000, recorded_at: "2026-05-01" },
    { card_id: cardId, grade: "PSA 9", price_krw: 200000, recorded_at: "2026-04-01" },
    { card_id: cardId, grade: "PSA 9", price_krw: 230000, recorded_at: "2026-05-01" },
    { card_id: cardId, grade: "raw", price_krw: 80000, recorded_at: "2026-05-10" },
  ];
  const { error: histErr } = await admin.from("market_price_history").insert(rows);
  if (histErr) { console.error("  insert 실패:", histErr.message); process.exit(1); }
  console.log(`  ${rows.length}건 insert ✓`);

  console.log("\n[4] anon SELECT (RLS)");
  const { data: pubHist } = await anon
    .from("market_price_history")
    .select("grade, price_krw, recorded_at")
    .eq("card_id", cardId)
    .order("recorded_at", { ascending: false });
  console.log(`  anon 조회: ${(pubHist ?? []).length}건`);
  for (const r of (pubHist ?? []).slice(0, 3)) {
    console.log(`    ${r.recorded_at} | ${r.grade} | ₩${r.price_krw.toLocaleString()}`);
  }

  console.log("\n[5] 비활성 토글 후 anon 차단 확인");
  await admin.from("market_cards").update({ is_active: false }).eq("id", cardId);
  const { data: hidden } = await anon
    .from("market_price_history")
    .select("id")
    .eq("card_id", cardId);
  console.log(`  비활성 카드 history: ${(hidden ?? []).length === 0 ? "차단됨 ✓" : "노출됨 ×"}`);

  console.log("\n[6] 정리");
  await admin.from("market_cards").delete().eq("id", cardId);
  console.log("  완료");
}

main();
