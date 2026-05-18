/**
 * 메가 스타트덱 100 배틀컬렉션 (랜덤덱 + 랜덤팩 1팩 증정) 등록
 */

import { createClient } from "@supabase/supabase-js";
import { existsSync, readdirSync, readFileSync } from "fs";
import { resolve } from "path";

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
const KEYVISUAL = "/Users/ssh/workspace/pk-check/supabase/image/random/ChatGPT Image 2026년 5월 15일 오후 02_33_00.png";
const CARDS_DIR = "/Users/ssh/workspace/pk-check/supabase/image/processed/mega-deck";

async function upload(src: string, name: string): Promise<string> {
  const buf = readFileSync(src);
  const path = `mega-deck/${Date.now()}-${name}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, buf, {
    contentType: "image/png",
    upsert: false,
  });
  if (error) throw new Error(`업로드 실패 [${name}]: ${error.message}`);
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

const description = `🎁 메가 스타트덱 100 배틀컬렉션

무려 100종 이상의 다양한 덱 중 어떤 덱이 등장할지 모르는 랜덤 구성!
개봉하는 순간까지 기대감과 설렘을 느낄 수 있는 포켓몬 카드의 랜덤 개봉 재미를 경험해보세요 ⚡

실전 배틀이 가능한 60장 덱 구성으로 입문자부터 컬렉터까지 모두 만족할 수 있는 제품입니다.

✨ 랜덤 팩 1팩 무료 증정!

구매 고객 전원에게 랜덤 포켓몬 카드 팩 1팩을 추가 증정해드립니다 🎉
어떤 팩이 들어있을지는 랜덤! 운이 좋다면 특별한 히트 카드가 등장할 수도 있습니다 👀

· 증정 가능 팩 종류
   - 배틀파트너즈
   - 열풍의아레나
   - 로켓단의영광
   - 인페르노X
   - 스칼렛
   - 바이올렛

🔥 히트 카드 등장 가능!
인기 카드 / 레어 카드 / 시크릿 카드 등 다양한 히트 카드가 포함될 수 있습니다.
(상품 이미지의 메가리자몽Y·메가장크로다일·메가염무왕·메가메가니움·릴리에의 삐삐·피카츄 ex 등은 등장 가능 히트 카드 예시입니다.)

지금 바로 나만의 행운의 덱을 만나보세요!`;

const descriptionEn = `🎁 Pokemon Mega Start Deck 100 — Battle Collection (Random Deck + Free Bonus Pack)

A surprise random deck drawn from 100+ unique decks — you don't know which one you'll get until you open it!
Each contains a 60-card competitive deck, perfect for beginners and collectors alike.

✨ FREE Bonus Pack
Every order includes one additional random Pokemon TCG pack.
Possible bonus packs: Battle Partners / Heat Wave Arena / Team Rocket's Glory / Inferno X / Scarlet / Violet.

🔥 Hit cards possible — popular / rare / secret rare ex cards may appear.
Cards shown in the listing photos (Mega Charizard Y ex, Mega Feraligatr ex, Mega Emboar ex, Mega Meganium ex, Lillie's Clefairy ex, Pikachu ex, etc.) are examples of hit cards that can appear.

Brand new, sealed Korean-edition product.`;

async function main() {
  console.log("키비주얼 업로드...");
  const mainUrl = await upload(KEYVISUAL, "keyvisual.png");
  console.log(`  → ${mainUrl}`);

  console.log("\n카드 이미지 업로드...");
  const cardFiles = readdirSync(CARDS_DIR)
    .filter((f) => /^\d+\.png$/.test(f))
    .sort();
  const cardUrls: string[] = [];
  for (const file of cardFiles) {
    const u = await upload(resolve(CARDS_DIR, file), file);
    cardUrls.push(u);
    console.log(`  [${cardUrls.length}/${cardFiles.length}] ${file}`);
  }

  console.log("\nlistings INSERT 중...");
  const { data, error } = await supabase
    .from("listings")
    .insert({
      title: "메가 스타트덱 100 배틀컬렉션 (랜덤 + 랜덤팩 1팩 증정)",
      title_en: "Pokemon Mega Start Deck 100 Battle Collection (Random + Bonus Pack)",
      category: "pokemon",
      language: "kr",
      condition: "mint",
      price_usd: 13.33,
      stock: 600,
      description,
      description_en: descriptionEn,
      image_url: mainUrl,
      image_urls: cardUrls,
      is_active: true,
      card_id: null,
    })
    .select("id, title, price_usd, stock")
    .single();

  if (error) {
    console.error("INSERT 실패:", error.message);
    process.exit(1);
  }

  console.log("\n등록 완료:");
  console.log(`  id        ${data.id}`);
  console.log(`  title     ${data.title}`);
  console.log(`  price_usd $${data.price_usd}`);
  console.log(`  stock     ${data.stock}`);
  console.log(`  /shop/${data.id}`);
}

main();
