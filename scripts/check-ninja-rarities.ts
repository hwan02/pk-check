import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "fs";

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

async function main() {
  // kr-M4 (닌자스피너) 카드들의 rarity 분포
  const { data } = await supabase
    .from("cards")
    .select("name, rarity, rarity_ja, number")
    .in("set_id", ["kr-M4", "kr-M2", "kr-M2a", "kr-SV4a"])
    .order("number");
  const rows = data ?? [];
  console.log(`닌자스피너 총 ${rows.length}장\n`);
  const map = new Map<string, number>();
  for (const r of rows as { rarity: string | null; rarity_ja: string | null }[]) {
    const k = `${r.rarity ?? "(null)"} | ${r.rarity_ja ?? "-"}`;
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  console.log("rarity (영문) | rarity_ja (한글)");
  for (const [k, n] of [...map.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${n.toString().padStart(3)} | ${k}`);
  }

  // SAR / SR 등 비싼 카드 샘플
  console.log("\n비싼 rarity 샘플:");
  const expensive = rows.filter((r) => {
    const ra = r.rarity ?? "";
    const ja = r.rarity_ja ?? "";
    return /SAR|SR|AR|UR|HR|Special Illustration/i.test(ra) || /SAR|SR|AR|UR|HR/.test(ja);
  });
  for (const r of expensive.slice(0, 15)) {
    console.log(`  #${r.number} | ${r.name} | rarity=${r.rarity} / ja=${r.rarity_ja}`);
  }
}

main();
