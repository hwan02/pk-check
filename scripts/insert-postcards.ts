/**
 * Pokémon Postcards 박스 세트 — 18장 이미지 업로드 + listing INSERT.
 */

import { createClient } from "@supabase/supabase-js";
import { existsSync, readdirSync, readFileSync } from "fs";
import { resolve } from "path";

const envPath = "/Users/ssh/workspace/pk-check/.env.local";
if (!existsSync(envPath)) {
  console.error(".env.local 없음");
  process.exit(1);
}
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
const IMG_DIR = "/Users/ssh/workspace/pk-check/supabase/image/processed/postcards";

async function uploadAll(): Promise<string[]> {
  const files = readdirSync(IMG_DIR)
    .filter((f) => /^\d+\.png$/.test(f))
    .sort();

  const urls: string[] = [];
  const ts = Date.now();
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const buf = readFileSync(resolve(IMG_DIR, file));
    const path = `postcards/${ts}-${file}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, buf, {
      contentType: "image/png",
      upsert: false,
    });
    if (error) throw new Error(`업로드 실패 [${file}]: ${error.message}`);
    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
    urls.push(pub.publicUrl);
    console.log(`  [${i + 1}/${files.length}] ${file}`);
  }
  return urls;
}

const description = `포켓몬 포스트카드 박스 세트
박스 안에 라티오스/라티아스, 피카츄, 치코리타·파치리스, 푸치자, 시기리트 등 다양한 일러스트 포스트카드가 들어있는 컬렉션입니다.

· 박스 표지: 핑크/보라 그라데이션의 "Pokémon Postcards" 디자인
· 포스트카드 일러스트: 총 18가지 장면 (라티 형제, 피카츄 들판, 해변, 절벽 등)
· 박스 디자인이 인테리어/컬렉션용으로도 훌륭

신품 / 박스 미개봉 상태 또는 컬렉션 보관 상태로 발송됩니다.`;

const descriptionEn = `Pokémon Postcards Box Set
A collection of beautifully illustrated postcards featuring Latios/Latias, Pikachu, Chikorita & Pachirisu, and more — all packed inside a pink/purple "Pokémon Postcards" display box.

· Box artwork: pink/purple gradient with starry detail
· 18 distinct postcard illustrations (Lati duo, Pikachu fields, seaside, cliffs, and more)
· Great for collectors and display

Brand new condition.`;

async function main() {
  console.log("이미지 18장 업로드 중...");
  const urls = await uploadAll();
  const [main, ...rest] = urls;

  console.log("\nlistings INSERT 중...");
  const { data, error } = await supabase
    .from("listings")
    .insert({
      title: "포켓몬 포스트카드 박스 세트",
      title_en: "Pokémon Postcards Box Set",
      category: "pokemon",
      language: "en",
      condition: "mint",
      price_usd: 58.0,
      stock: 1,
      description,
      description_en: descriptionEn,
      image_url: main,
      image_urls: rest,
      is_active: true,
      card_id: null,
    })
    .select("id, title, price_usd")
    .single();

  if (error) {
    console.error("INSERT 실패:", error.message);
    process.exit(1);
  }

  console.log("\n등록 완료:");
  console.log(`  id        ${data.id}`);
  console.log(`  title     ${data.title}`);
  console.log(`  price_usd $${data.price_usd}`);
  console.log(`  /shop/${data.id}`);
}

main();
