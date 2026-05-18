/**
 * 메가덱 listing 에서 -03.png (피카츄, rembg 실패) 제거.
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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const LISTING_ID = "7d09eac0-6c31-49fc-bdd6-b56107b1ad80";
const BUCKET = "listing-images";
const MATCH = "-03.png";

async function main() {
  const { data: cur, error } = await supabase
    .from("listings")
    .select("image_urls")
    .eq("id", LISTING_ID)
    .single();
  if (error || !cur) {
    console.error(error?.message);
    process.exit(1);
  }
  const urls = (cur.image_urls ?? []) as string[];
  const target = urls.find((u) => u.includes(MATCH));
  if (!target) {
    console.log("대상 없음");
    return;
  }
  const path = target.split(`/${BUCKET}/`)[1];
  if (path) {
    const { error: rmErr } = await supabase.storage.from(BUCKET).remove([path]);
    if (rmErr) console.warn(rmErr.message);
    else console.log(`storage 삭제: ${path}`);
  }
  const next = urls.filter((u) => u !== target);
  const { error: updErr } = await supabase
    .from("listings")
    .update({ image_urls: next })
    .eq("id", LISTING_ID);
  if (updErr) {
    console.error(updErr.message);
    process.exit(1);
  }
  console.log(`완료: ${urls.length} → ${next.length}장`);
}

main();
