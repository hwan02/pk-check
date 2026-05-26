/**
 * 시세 있는 싱글카드 조사용: market_cards (product_type='single') + 최신 price history
 * 매거진 글에 넣을 후보 카드 추리려고 한 번 돌려보는 스크립트.
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

interface Card {
  id: string;
  category: "pokemon" | "onepiece";
  product_type: string;
  name: string;
  name_en: string | null;
  set_name: string | null;
  rarity: string | null;
  image_url: string | null;
  notes: string | null;
  is_active: boolean;
}

interface Price {
  id: string;
  card_id: string;
  grade: string;
  price_krw: number;
  recorded_at: string;
}

async function main() {
  const { data: cards, error } = await admin
    .from("market_cards")
    .select("*")
    .eq("product_type", "single")
    .eq("is_active", true)
    .order("category")
    .order("set_name");
  if (error) { console.error(error.message); process.exit(1); }
  const singles = (cards ?? []) as Card[];

  if (singles.length === 0) {
    console.log("싱글카드 없음");
    return;
  }
  const ids = singles.map((c) => c.id);
  const { data: hist, error: hErr } = await admin
    .from("market_price_history")
    .select("*")
    .in("card_id", ids)
    .order("recorded_at", { ascending: false });
  if (hErr) { console.error(hErr.message); process.exit(1); }

  const byCard = new Map<string, Price[]>();
  for (const r of (hist ?? []) as Price[]) {
    const arr = byCard.get(r.card_id) ?? [];
    arr.push(r);
    byCard.set(r.card_id, arr);
  }

  console.log(`전체 싱글: ${singles.length}장, 시세 있는: ${byCard.size}장\n`);
  for (const c of singles) {
    const ph = byCard.get(c.id);
    if (!ph || ph.length === 0) continue;
    // 등급별 최신가
    const byGrade = new Map<string, Price>();
    for (const r of ph) {
      const cur = byGrade.get(r.grade);
      if (!cur || cur.recorded_at < r.recorded_at) byGrade.set(r.grade, r);
    }
    const grades = [...byGrade.values()].sort((a, b) => b.price_krw - a.price_krw);
    const topGradeStr = grades.map((g) => `${g.grade} ₩${g.price_krw.toLocaleString()}`).join(" / ");
    console.log(`[${c.category}] ${c.name}${c.name_en ? ` (${c.name_en})` : ""}`);
    console.log(`  id: ${c.id}`);
    console.log(`  set: ${c.set_name ?? "-"} / rarity: ${c.rarity ?? "-"}`);
    console.log(`  img: ${c.image_url ? "○" : "×"}`);
    console.log(`  notes: ${c.notes ?? "-"}`);
    console.log(`  prices: ${topGradeStr}`);
    console.log();
  }
}

main();
