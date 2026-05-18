/**
 * all.png 종합컷을 image_urls 맨 앞에 추가.
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

const LISTING_ID = "9dd312b5-ec88-4f44-bce6-a117cdffed4b";
const BUCKET = "listing-images";
const SRC = "/Users/ssh/workspace/pk-check/supabase/image/all.png";

async function main() {
  console.log("all.png 업로드 중...");
  const buf = readFileSync(SRC);
  const path = `postcards/${Date.now()}-all.png`;
  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, buf, {
    contentType: "image/png",
    upsert: false,
  });
  if (upErr) {
    console.error(upErr.message);
    process.exit(1);
  }
  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const newUrl = pub.publicUrl;
  console.log(`  → ${newUrl}`);

  const { data: cur, error: getErr } = await supabase
    .from("listings")
    .select("image_urls")
    .eq("id", LISTING_ID)
    .single();
  if (getErr || !cur) {
    console.error(getErr?.message);
    process.exit(1);
  }

  const next = [newUrl, ...((cur.image_urls ?? []) as string[])];
  const { error: updErr } = await supabase
    .from("listings")
    .update({ image_urls: next })
    .eq("id", LISTING_ID);
  if (updErr) {
    console.error(updErr.message);
    process.exit(1);
  }

  console.log(`\n완료. image_urls: ${next.length}장 (맨 앞에 all 추가)`);
}

main();
