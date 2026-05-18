/**
 * 매거진 article + 픽 카드 연결 동작 확인:
 * 1) market_cards 2장 insert (service-role)
 * 2) article 1개 insert (is_published=true)
 * 3) article_market_picks 2건 insert (연결)
 * 4) anon 키로 article + picks join SELECT 가능한지 검증
 * 5) 비공개로 토글 → anon 차단 검증
 * 6) 정리
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
  console.log("[1] market_cards 2장 insert");
  const { data: cards, error: cardErr } = await admin
    .from("market_cards")
    .insert([
      { category: "pokemon", name: "(테스트) 메가리자몽Y ex", price_krw: 120000 },
      { category: "pokemon", name: "(테스트) 피카츄 ex", price_krw: 50000 },
    ])
    .select("id, name");
  if (cardErr) { console.error(cardErr.message); process.exit(1); }
  const cardIds = cards!.map((c) => c.id);
  console.log("  ", cards!.map((c) => `${c.name}`).join(" / "));

  console.log("\n[2] article insert");
  const slug = `test-pick-${Date.now()}`;
  const { data: article, error: artErr } = await admin
    .from("articles")
    .insert({
      slug,
      title: "(테스트) 이번 주 시세 픽",
      subtitle: "테스트용 글",
      body_md: "테스트 본문",
      is_published: true,
    })
    .select("id, slug, title")
    .single();
  if (artErr) { console.error(artErr.message); process.exit(1); }
  console.log("  id:", article.id, "slug:", article.slug);

  console.log("\n[3] article_market_picks 2건");
  const { error: pickErr } = await admin
    .from("article_market_picks")
    .insert(cardIds.map((cid, i) => ({
      article_id: article.id,
      market_card_id: cid,
      display_order: i,
    })));
  if (pickErr) { console.error(pickErr.message); process.exit(1); }
  console.log("  연결 완료");

  console.log("\n[4] anon SELECT — 공개 글 + 픽 카드 join");
  const { data: pubArt } = await anon
    .from("articles")
    .select("id, title")
    .eq("slug", slug)
    .maybeSingle();
  console.log("  article 조회:", !!pubArt, pubArt?.title);

  const { data: pubPicks } = await anon
    .from("article_market_picks")
    .select("market_card_id, display_order, market_cards(name, price_krw)")
    .eq("article_id", article.id)
    .order("display_order");
  console.log("  picks 조회:", (pubPicks ?? []).length, "건");
  for (const p of pubPicks ?? []) {
    const mc = (p as { market_cards: unknown }).market_cards;
    console.log("    -", JSON.stringify(mc));
  }

  console.log("\n[5] 비공개로 토글 → anon 차단");
  await admin.from("articles").update({ is_published: false }).eq("id", article.id);
  const { data: hiddenArt } = await anon
    .from("articles")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  const { data: hiddenPicks } = await anon
    .from("article_market_picks")
    .select("article_id")
    .eq("article_id", article.id);
  console.log("  비공개 article:", hiddenArt ? "노출됨(실패!)" : "차단됨 ✓");
  console.log("  비공개 picks:", (hiddenPicks ?? []).length === 0 ? "차단됨 ✓" : "노출됨(실패!)");

  console.log("\n[6] 정리");
  await admin.from("articles").delete().eq("id", article.id); // CASCADE 로 picks 도 삭제
  await admin.from("market_cards").delete().in("id", cardIds);
  console.log("  완료");
}

main();
