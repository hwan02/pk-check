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

const TARGETS = [
  { prefix: "BS2026002", label: "kr-M3 (니힐제로)" },
  { prefix: "BS2025014", label: "kr-M2 (인페르노X)" },
  { prefix: "BS2025001", label: "kr-SV9 (배틀파트너즈)" },
  { prefix: "BS2026003", label: "kr-M4 (닌자스피너)" },
];

async function main() {
  for (const t of TARGETS) {
    const { data } = await supabase
      .from("cards")
      .select("id, name, number, rarity, set_id")
      .gte("id", `kr-${t.prefix}081`)
      .lte("id", `kr-${t.prefix}200`)
      .order("id")
      .limit(10);
    console.log(`\n${t.label} — 081~200 카드 (앞 10장):`);
    if (!data || data.length === 0) {
      console.log("  없음");
      continue;
    }
    for (const c of data) {
      console.log(`  ${c.id} | #${c.number} | ${c.name} | ${c.rarity} | set_id=${c.set_id}`);
    }
  }
}

main();
