/**
 * 메가덱 listing 의 랜덤팩 사진 정리:
 * 1) 기존 닌자스피너(-pack-ninja-spinner.png) Storage + image_urls 에서 제거
 * 2) 1.jpeg~8.jpeg 처리본 8장 업로드해서 image_urls 끝에 순서대로 추가
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
const PACK_DIR = "/Users/ssh/workspace/pk-check/supabase/image/processed/mega-deck/packs";
const OLD_NINJA_MATCH = "-pack-ninja-spinner.png";

async function uploadAll(): Promise<string[]> {
  const ts = Date.now();
  const urls: string[] = [];
  for (let i = 1; i <= 8; i++) {
    const file = `pack-${i}.png`;
    const buf = readFileSync(`${PACK_DIR}/${file}`);
    const path = `mega-deck/${ts}-${file}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, buf, {
      contentType: "image/png",
      upsert: false,
    });
    if (error) throw new Error(`업로드 [${file}] 실패: ${error.message}`);
    urls.push(supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl);
    console.log(`  [${i}/8] ${file}`);
  }
  return urls;
}

async function main() {
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

  // 기존 닌자스피너 storage + array 에서 제거
  const oldNinja = urls.find((u) => u.includes(OLD_NINJA_MATCH));
  let cleaned = urls;
  if (oldNinja) {
    const path = oldNinja.split(`/${BUCKET}/`)[1];
    if (path) {
      const { error: rmErr } = await supabase.storage.from(BUCKET).remove([path]);
      if (rmErr) console.warn("storage 삭제 경고:", rmErr.message);
      else console.log(`기존 닌자스피너 storage 삭제: ${path}`);
    }
    cleaned = urls.filter((u) => u !== oldNinja);
  }

  console.log("\n새 팩 8장 업로드:");
  const packUrls = await uploadAll();

  const next = [...cleaned, ...packUrls];
  const { error: updErr } = await supabase
    .from("listings")
    .update({ image_urls: next })
    .eq("id", LISTING_ID);
  if (updErr) {
    console.error(updErr.message);
    process.exit(1);
  }
  console.log(`\n완료. image_urls: ${urls.length} → ${next.length}장`);
}

main();
