/**
 * 키비주얼을 일정 박스 잘라낸 버전으로 교체.
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
const SRC = "/Users/ssh/workspace/pk-check/supabase/image/processed/keyvisual-cropped.png";

async function main() {
  const { data: cur, error: getErr } = await supabase
    .from("listings")
    .select("image_url")
    .eq("id", LISTING_ID)
    .single();
  if (getErr || !cur?.image_url) {
    console.error(getErr?.message ?? "image_url 없음");
    process.exit(1);
  }
  const oldUrl = cur.image_url;
  const oldPath = oldUrl.split(`/${BUCKET}/`)[1];

  console.log("새 키비주얼 업로드 중...");
  const buf = readFileSync(SRC);
  const newPath = `postcards/${Date.now()}-keyvisual-v2.png`;
  const { error: upErr } = await supabase.storage.from(BUCKET).upload(newPath, buf, {
    contentType: "image/png",
    upsert: false,
  });
  if (upErr) {
    console.error(upErr.message);
    process.exit(1);
  }
  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(newPath);
  console.log(`  → ${pub.publicUrl}`);

  console.log("\nlisting UPDATE 중...");
  const { error: updErr } = await supabase
    .from("listings")
    .update({ image_url: pub.publicUrl })
    .eq("id", LISTING_ID);
  if (updErr) {
    console.error(updErr.message);
    process.exit(1);
  }

  if (oldPath) {
    console.log(`\n기존 키비주얼 storage 삭제: ${oldPath}`);
    const { error: rmErr } = await supabase.storage.from(BUCKET).remove([oldPath]);
    if (rmErr) console.warn("삭제 경고:", rmErr.message);
    else console.log("  OK");
  }
  console.log("\n완료.");
}

main();
