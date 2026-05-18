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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function walk(prefix = ""): Promise<{ total: number; count: number }> {
  let total = 0;
  let count = 0;
  const { data } = await supabase.storage.from("listing-images").list(prefix, { limit: 1000 });
  for (const f of data ?? []) {
    if ((f as any).id === null) {
      const r = await walk(prefix ? `${prefix}/${f.name}` : f.name);
      total += r.total;
      count += r.count;
    } else {
      total += (f as any).metadata?.size || 0;
      count++;
    }
  }
  return { total, count };
}

async function main() {
  const r = await walk();
  console.log(`listing-images: ${r.count}개 파일, ${(r.total / 1024 / 1024).toFixed(1)} MB`);
}
main();
