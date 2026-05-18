/**
 * /supabase/image/market/ 디렉토리의 이미지들을 시세 placeholder 카드로 일괄 등록.
 * - is_active=false 비활성 상태로 등록 (어드민에서 가격 채우고 노출 토글)
 * - category=pokemon
 * - price_krw=0 (어드민 inline 에서 채울 것)
 * - name: 파일명에서 "AhaConvert_" prefix 제거 + 확장자 제거
 */

import { createClient } from "@supabase/supabase-js";
import { existsSync, readdirSync, readFileSync } from "fs";
import { extname, resolve } from "path";

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

const BUCKET = "listing-images";
const SRC_DIR = "/Users/ssh/workspace/pk-check/supabase/image/market";

function nameFromFile(file: string): string {
  let n = file.replace(/\.[^.]+$/, "");
  n = n.replace(/^AhaConvert_/, "");
  // 공백 처리: 언더스코어를 공백으로
  n = n.replace(/_/g, " ").trim();
  return n || file;
}

function contentTypeFor(ext: string): string {
  const e = ext.toLowerCase();
  if (e === ".png") return "image/png";
  if (e === ".webp") return "image/webp";
  return "image/jpeg";
}

async function main() {
  const files = readdirSync(SRC_DIR)
    .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
    .sort();

  console.log(`업로드 대상 ${files.length}장\n`);
  const ts = Date.now();
  const rows: {
    category: "pokemon";
    name: string;
    price_krw: number;
    is_active: boolean;
    image_url: string;
    display_order: number;
  }[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const ext = extname(file);
    const buf = readFileSync(resolve(SRC_DIR, file));
    // 파일명에 한글/특수문자 있으니 안전한 경로 사용
    const safePath = `market/${ts}-${i.toString().padStart(2, "0")}${ext}`;
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(safePath, buf, {
      contentType: contentTypeFor(ext),
      upsert: false,
    });
    if (upErr) {
      console.error(`  [${i + 1}/${files.length}] 업로드 실패 [${file}]: ${upErr.message}`);
      continue;
    }
    const url = supabase.storage.from(BUCKET).getPublicUrl(safePath).data.publicUrl;
    rows.push({
      category: "pokemon",
      name: nameFromFile(file),
      price_krw: 0,
      is_active: false,
      image_url: url,
      display_order: i,
    });
    console.log(`  [${i + 1}/${files.length}] ${file} → ${nameFromFile(file)}`);
  }

  console.log(`\nmarket_cards INSERT ${rows.length}장...`);
  const { error } = await supabase.from("market_cards").insert(rows);
  if (error) {
    console.error("INSERT 실패:", error.message);
    process.exit(1);
  }
  console.log("완료. /admin/market 에서 가격 입력 후 노출 토글하세요.");
}

main();
