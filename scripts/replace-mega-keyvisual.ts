/**
 * 메가덱 키비주얼을 정사각형 버전으로 교체.
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
const SRC = "/Users/ssh/workspace/pk-check/supabase/image/processed/mega-deck/keyvisual-square.png";

async function main() {
  const { data: cur, error: getErr } = await supabase
    .from("listings")
    .select("image_url")
    .eq("id", LISTING_ID)
    .single();
  if (getErr || !cur?.image_url) {
    console.error(getErr?.message);
    process.exit(1);
  }
  const oldPath = cur.image_url.split(`/${BUCKET}/`)[1];

  const buf = readFileSync(SRC);
  const newPath = `mega-deck/${Date.now()}-keyvisual-sq.png`;
  const { error: upErr } = await supabase.storage.from(BUCKET).upload(newPath, buf, {
    contentType: "image/png",
    upsert: false,
  });
  if (upErr) {
    console.error(upErr.message);
    process.exit(1);
  }
  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(newPath);

  const { error: updErr } = await supabase
    .from("listings")
    .update({ image_url: pub.publicUrl })
    .eq("id", LISTING_ID);
  if (updErr) {
    console.error(updErr.message);
    process.exit(1);
  }

  if (oldPath) {
    const { error: rmErr } = await supabase.storage.from(BUCKET).remove([oldPath]);
    if (rmErr) console.warn(rmErr.message);
    else console.log(`기존 storage 삭제: ${oldPath}`);
  }
  console.log(`교체 완료 → ${pub.publicUrl}`);
}

main();
