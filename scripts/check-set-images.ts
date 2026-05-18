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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const IDS = ["kr-SV9", "kr-SV9a", "kr-SV10", "kr-M2", "kr-M4", "kr-SV7a", "kr-M1L", "kr-M1S", "kr-M2a", "kr-M3"];

async function main() {
  const { data } = await supabase
    .from("sets")
    .select("id, name, logo_url, symbol_url, snkrdunk_box_title")
    .in("id", IDS);
  for (const s of data ?? []) {
    console.log(`\n[${s.id}] ${s.name}`);
    console.log(`  logo  : ${s.logo_url ?? "-"}`);
    console.log(`  symbol: ${s.symbol_url ?? "-"}`);
    console.log(`  snkr  : ${s.snkrdunk_box_title ?? "-"}`);
  }
}

main();
