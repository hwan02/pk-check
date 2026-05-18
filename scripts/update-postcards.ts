/**
 * 포스트카드 박스 상품 이름/설명 업데이트 (제주 한정판 정보 반영, Pokémon→Pokemon)
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

const description = `포켓몬 제주 한정판 엽서 박스 세트

· 슈링크 그대로, 자석 케이스에 보관된 미개봉 새 상품
· 제주도 한정판으로 출시된 박스 세트
· 총 15종의 엽서 수록
· 제주도의 다양한 관광 명소를 배경으로 한 일러스트

박스를 그대로 디스플레이용으로 사용하기에도 좋고, 엽서 한 장 한 장이 컬렉터블한 한정 굿즈입니다.`;

const descriptionEn = `Pokemon Jeju Limited Edition Postcards Box

· Brand new, factory shrink-wrapped and stored in a magnetic case
· Released exclusively in Jeju Island as a limited edition
· Contains 15 unique postcards
· Each card features scenic Jeju Island landmarks as the backdrop

A perfect collector's item — display the box as-is or enjoy the individual postcards. Released only on Jeju Island in limited quantities.`;

async function main() {
  const { data, error } = await supabase
    .from("listings")
    .update({
      title: "포켓몬 제주 한정판 엽서 박스 (15종, 미개봉)",
      title_en: "Pokemon Jeju Limited Edition Postcards Box (15 Cards, Sealed)",
      description,
      description_en: descriptionEn,
    })
    .eq("id", LISTING_ID)
    .select("id, title")
    .single();

  if (error) {
    console.error("UPDATE 실패:", error.message);
    process.exit(1);
  }

  console.log("업데이트 완료:");
  console.log(`  ${data.title}`);
  console.log(`  /shop/${data.id}`);
}

main();
