/**
 * ONE PIECE magazine Vol.20 listing 에 이미지 4장을 Supabase Storage 에 업로드하고
 * image_url + image_urls UPDATE.
 */

import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "fs";
import { basename, resolve } from "path";

const envPath = [
  resolve(process.cwd(), ".env.local"),
  "/Users/ssh/workspace/pk-check/.env.local",
].find((p) => existsSync(p));
if (!envPath) {
  console.error(".env.local 찾을 수 없음");
  process.exit(1);
}
for (const line of readFileSync(envPath, "utf-8").split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx > 0) {
    const key = trimmed.slice(0, eqIdx);
    let value = trimmed.slice(eqIdx + 1);
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const LISTING_ID = "0b5fa787-2b2c-4b33-8678-ccca385b22d2";
const BUCKET = "listing-images";
const IMAGE_DIR = "/Users/ssh/workspace/pk-check/supabase/image";

// 노출 순서: 앞표지 3장(메인) → 앞표지 클로즈업(카드) → 뒷표지 3장 → 부록 봉투
const ORDERED_FILES = [
  "ChatGPT Image 2026년 5월 15일 오전 10_49_27.png", // 앞표지 3장
  "ChatGPT Image 2026년 5월 15일 오전 10_51_25.png", // 앞표지 클로즈업 (카드)
  "ChatGPT Image 2026년 5월 15일 오전 10_45_04.png", // 뒷표지 3장
  "ChatGPT Image 2026년 5월 15일 오전 10_49_21.png", // 부록 봉투
];

async function uploadOne(file: string, idx: number): Promise<string> {
  const fullPath = resolve(IMAGE_DIR, file);
  if (!existsSync(fullPath)) throw new Error(`파일 없음: ${fullPath}`);
  const buf = readFileSync(fullPath);
  const path = `mag20/${Date.now()}-${idx}.png`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, buf, {
    contentType: "image/png",
    upsert: false,
  });
  if (error) throw new Error(`업로드 실패 [${basename(file)}]: ${error.message}`);
  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
  console.log(`  [${idx + 1}/${ORDERED_FILES.length}] ${basename(file)}`);
  console.log(`      → ${pub.publicUrl}`);
  return pub.publicUrl;
}

async function ensureBucket() {
  const { data: buckets } = await supabase.storage.listBuckets();
  if (buckets?.some((b) => b.name === BUCKET)) return;
  console.log(`버킷 [${BUCKET}] 생성 중...`);
  const { error } = await supabase.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: 10 * 1024 * 1024,
    allowedMimeTypes: ["image/png", "image/jpeg", "image/webp"],
  });
  if (error) throw new Error(`버킷 생성 실패: ${error.message}`);
}

async function main() {
  await ensureBucket();
  console.log("이미지 업로드 중...");
  const urls: string[] = [];
  for (let i = 0; i < ORDERED_FILES.length; i++) {
    urls.push(await uploadOne(ORDERED_FILES[i], i));
  }

  const [main, ...rest] = urls;

  console.log("\nlisting UPDATE 중...");
  const { error } = await supabase
    .from("listings")
    .update({ image_url: main, image_urls: rest })
    .eq("id", LISTING_ID);
  if (error) {
    console.error("UPDATE 실패:", error.message);
    process.exit(1);
  }

  console.log("\n완료. 상품 페이지에서 4장 모두 노출됩니다.");
  console.log(`  /shop/${LISTING_ID}`);
}

main();
