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

const RARITY_KEEP = [
  "SAR", "SR", "AR", "UR", "RR",
  "Double Rare", "Special Illustration Rare", "Illustration Rare",
  "Hyper Rare", "Ultra Rare",
];

async function main() {
  const SETS = ["kr-M4", "kr-M3", "kr-M2", "kr-M2a", "kr-SV9"];
  for (const setId of SETS) {
    // 카탈로그 cards 의 RARITY 분포
    const { data: all } = await supabase
      .from("cards")
      .select("rarity, number")
      .eq("set_id", setId);
    const cards = (all ?? []) as { rarity: string | null; number: string }[];
    const matched = cards.filter((c) => c.rarity && RARITY_KEEP.includes(c.rarity));

    // 이미 import 된 market_cards
    const { count: imported } = await supabase
      .from("market_cards")
      .select("*", { count: "exact", head: true })
      .eq("set_name", setId === "kr-M4" ? "MEGA 확장팩 「닌자스피너」" :
        setId === "kr-M3" ? "MEGA 확장팩 「니힐제로」" :
        setId === "kr-M2" ? "MEGA 확장팩 「인페르노X」" :
        setId === "kr-M2a" ? "MEGA 하이클래스팩 「MEGA 드림 ex」" :
        setId === "kr-SV9" ? "스칼렛&바이올렛 확장팩 「배틀파트너즈」" : "");

    const rarityMap = new Map<string, number>();
    for (const c of matched) rarityMap.set(c.rarity!, (rarityMap.get(c.rarity!) ?? 0) + 1);

    console.log(`\n[${setId}] cards 총 ${cards.length}장 / 필터 매칭 ${matched.length}장 / market_cards import ${imported}장`);
    for (const [r, n] of [...rarityMap.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${n.toString().padStart(3)} | ${r}`);
    }
  }
}

main();
