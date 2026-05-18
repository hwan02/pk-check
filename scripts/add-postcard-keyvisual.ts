/**
 * 포켓몬 제주 한정판 엽서 박스에 공식 키비주얼 이미지를 메인으로 추가.
 * 기존 메인은 image_urls 맨 앞으로 이동.
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
const NEW_IMG = "/Users/ssh/workspace/pk-check/supabase/image/ChatGPT Image 2026년 5월 15일 오후 02_09_34.png";

async function main() {
  console.log("키비주얼 업로드 중...");
  const buf = readFileSync(NEW_IMG);
  const path = `postcards/${Date.now()}-keyvisual.png`;
  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, buf, {
    contentType: "image/png",
    upsert: false,
  });
  if (upErr) {
    console.error("업로드 실패:", upErr.message);
    process.exit(1);
  }
  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const newMain = pub.publicUrl;
  console.log(`  → ${newMain}`);

  console.log("\n기존 listing 조회 중...");
  const { data: cur, error: getErr } = await supabase
    .from("listings")
    .select("image_url, image_urls")
    .eq("id", LISTING_ID)
    .single();
  if (getErr || !cur) {
    console.error("조회 실패:", getErr?.message);
    process.exit(1);
  }
  console.log(`  현재 메인: ...${cur.image_url?.slice(-30)}`);
  console.log(`  현재 추가: ${(cur.image_urls ?? []).length}장`);

  const nextUrls = [cur.image_url, ...(cur.image_urls ?? [])].filter(
    (s): s is string => !!s,
  );

  console.log("\nlisting UPDATE 중...");
  const { error: updErr } = await supabase
    .from("listings")
    .update({ image_url: newMain, image_urls: nextUrls })
    .eq("id", LISTING_ID);
  if (updErr) {
    console.error("UPDATE 실패:", updErr.message);
    process.exit(1);
  }

  console.log(`\n완료. 메인 1 + 추가 ${nextUrls.length}장`);
  console.log(`  /shop/${LISTING_ID}`);
}

main();
