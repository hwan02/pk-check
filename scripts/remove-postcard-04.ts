/**
 * 포켓몬 제주 한정판 엽서 상품에서 -04.png 이미지 제거 (image_urls + storage 모두).
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
const MATCH = "-04.png";

async function main() {
  const { data: cur, error } = await supabase
    .from("listings")
    .select("image_urls")
    .eq("id", LISTING_ID)
    .single();
  if (error || !cur) {
    console.error("조회 실패:", error?.message);
    process.exit(1);
  }

  const urls = (cur.image_urls ?? []) as string[];
  const target = urls.find((u) => u.includes(MATCH));
  if (!target) {
    console.log(`'${MATCH}' 포함된 URL 없음. image_urls=${urls.length}장`);
    return;
  }

  console.log(`제거 대상: ${target}`);

  // storage 경로 추출: ".../listing-images/<path>" → <path>
  const storagePath = target.split(`/${BUCKET}/`)[1];
  if (storagePath) {
    const { error: rmErr } = await supabase.storage.from(BUCKET).remove([storagePath]);
    if (rmErr) console.warn("storage 삭제 경고:", rmErr.message);
    else console.log(`  storage 삭제 OK: ${storagePath}`);
  }

  const next = urls.filter((u) => u !== target);
  const { error: updErr } = await supabase
    .from("listings")
    .update({ image_urls: next })
    .eq("id", LISTING_ID);
  if (updErr) {
    console.error("UPDATE 실패:", updErr.message);
    process.exit(1);
  }

  console.log(`\n완료. image_urls: ${urls.length} → ${next.length}장`);
}

main();
