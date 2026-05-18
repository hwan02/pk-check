/**
 * 메가덱 listing 에 피카츄 ex 카드를 image_urls index 2 자리에 삽입.
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
const SRC = "/Users/ssh/workspace/pk-check/supabase/image/random/ChatGPT Image 2026년 5월 15일 오후 02_58_29.png";
const INSERT_AT = 2; // 0=메가리자몽, 1=릴리에 삐삐, [여기에 피카츄], 2=장크로다일...

async function main() {
  const buf = readFileSync(SRC);
  const path = `mega-deck/${Date.now()}-pikachu.png`;
  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, buf, {
    contentType: "image/png",
    upsert: false,
  });
  if (upErr) {
    console.error(upErr.message);
    process.exit(1);
  }
  const url = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  console.log(`업로드 → ${url}`);

  const { data: cur, error: getErr } = await supabase
    .from("listings")
    .select("image_urls")
    .eq("id", LISTING_ID)
    .single();
  if (getErr || !cur) {
    console.error(getErr?.message);
    process.exit(1);
  }
  const urls = (cur.image_urls ?? []) as string[];
  const next = [...urls.slice(0, INSERT_AT), url, ...urls.slice(INSERT_AT)];

  const { error: updErr } = await supabase
    .from("listings")
    .update({ image_urls: next })
    .eq("id", LISTING_ID);
  if (updErr) {
    console.error(updErr.message);
    process.exit(1);
  }
  console.log(`완료. image_urls: ${urls.length} → ${next.length}장`);
}

main();
