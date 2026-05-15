/**
 * ONE PIECE magazine Vol.20 (루피 프로모 카드 포함) 1회성 등록 스크립트
 *
 * 사용법: npx tsx scripts/insert-onepiece-mag-vol20.ts
 */

import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

const envPath = [
  resolve(process.cwd(), ".env.local"),
  resolve(process.cwd(), "../../../.env.local"),
  "/Users/ssh/workspace/pk-check/.env.local",
].find((p) => existsSync(p));
if (!envPath) {
  console.error(".env.local 찾을 수 없음");
  process.exit(1);
}
const envContent = readFileSync(envPath, "utf-8");
for (const line of envContent.split("\n")) {
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

const description = `ONE PIECE magazine Vol.20
출판: 集英社 · ISBN 978-4-08-102439-1 · 정가 ¥1,650 · 128p

특집: ジャンプとワンピ大特集 — 주간 소년 점프와 ONE PIECE의 28년 항로

【부록 · 미개봉】
· ONE PIECE 카드게임 한정 프로모 「몽키 D. 루피」
  Power 6000 / 속공 / 2024.7.18 오다 에이치로 친필 디자인 · 봉투 미개봉

【본편 수록】
· 오다 에이치로, 점프를 말하다 (롱 인터뷰 13p)
· 시마부쿠로 미츠토시 「오다 씨와의 추억 만화!」
· 마우에 히로타카 「실록! 어시스턴트가 본 오다 에이치로」
· 점프 합병호 번외편 만화집 (코믹스 미수록 레어 원고)
· 점프&원피의 157년사 / 역대 일러스트·코멘트 셀렉션
· ONE PIECE NOTE COLLECTION 「EGGHEAD」
· ONE PIECE PREMIUM SUMMER 2025 리포트 · SBS
· ONE PIECE novel 동시연재: 「LAW 鬼哭の刻」 · 「ZORO」

신품 / 미개봉 상태로 발송됩니다.`;

const descriptionEn = `ONE PIECE magazine Vol.20
Publisher: Shueisha · ISBN 978-4-08-102439-1 · ¥1,650 · 128 pages

Feature: "Jump x One Piece Mega Special" — celebrating 28 years.

[Bundled · Sealed]
· ONE PIECE Card Game Limited Promo "Monkey D. Luffy"
  Power 6000 / Rush / Eiichiro Oda 2024.7.18 sketch design — sealed envelope

[Inside]
· Eiichiro Oda on Jump (13-page long interview)
· Mitsutoshi Shimabukuro: "Memories with Oda-san"
· Hirotaka Maue: "An assistant's record of Oda Eiichiro"
· Jump x One Piece 157-year history; classic illustrations & comments
· ONE PIECE NOTE COLLECTION "EGGHEAD"
· ONE PIECE PREMIUM SUMMER 2025 report · SBS
· ONE PIECE novels: "LAW Kikoku no Toki" / "ZORO"

Brand new, sealed.`;

async function main() {
  const { data, error } = await supabase
    .from("listings")
    .insert({
      title: "ONE PIECE magazine Vol.20 [루피 프로모 카드 동봉]",
      title_en: "ONE PIECE magazine Vol.20 (w/ Monkey D. Luffy Promo Card)",
      category: "onepiece",
      language: "jp",
      condition: "mint",
      price_usd: 140.0,
      stock: 1,
      description,
      description_en: descriptionEn,
      image_url: null,
      is_active: true,
      card_id: null,
    })
    .select("id, title, price_usd")
    .single();

  if (error) {
    console.error("등록 실패:", error.message);
    process.exit(1);
  }

  console.log("등록 완료:");
  console.log(`  id        ${data.id}`);
  console.log(`  title     ${data.title}`);
  console.log(`  price_usd $${data.price_usd}`);
  console.log(`\n이미지는 /admin/listings 페이지나 별도 UPDATE로 추가하세요.`);
}

main();
