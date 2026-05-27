/**
 * DB 에 없는 포켓몬 박스/카드 placeholder 생성.
 * - 변환의가면 / 크림슨헤이즈 / 스타트덱100
 * - 카드 이미지/상세 정보는 비워둠 (어드민에서 추후 채움)
 * - 모두 region='kr' / is_active=true
 * - notes 키로 멱등성 보장 (cat:kr-mock-{...})
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

for (const line of readFileSync("/Users/ssh/workspace/pk-check/.env.local", "utf-8").split("\n")) {
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

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

interface NewBox {
  setName: string;       // 박스명 = set_name
  notesKey: string;      // 멱등성 키
  singles: { name: string; rarity: string | null }[];
}

const NEW_BOXES: NewBox[] = [
  {
    setName: "스칼렛&바이올렛 강화확장팩 「변환의 가면」",
    notesKey: "cat:kr-mock-byeonhwan",
    singles: [
      { name: "시유", rarity: "SAR" },
      { name: "절친 포핀", rarity: "SAR" },
    ],
  },
  {
    setName: "스칼렛&바이올렛 강화확장팩 「크림슨 헤이즈」",
    notesKey: "cat:kr-mock-crimson",
    singles: [
      { name: "개굴닌자 ex", rarity: "SAR" },
      { name: "세류", rarity: "SAR" },
    ],
  },
  {
    setName: "MEGA 스타트 덱 100 배틀컬렉션",
    notesKey: "cat:kr-mock-mega-startdeck-100",
    singles: [
      { name: "메가리자몽 ex", rarity: null },
      { name: "피카츄 ex", rarity: null },
      { name: "릴리에의 삐삐 ex", rarity: null },
    ],
  },
];

async function main() {
  for (const box of NEW_BOXES) {
    console.log(`\n[${box.setName}]`);

    // 1) 박스 upsert
    const boxNoteKey = `${box.notesKey}-box`;
    const { data: existingBox } = await admin
      .from("market_cards")
      .select("id")
      .eq("notes", boxNoteKey)
      .maybeSingle();

    let boxId: string;
    if (existingBox) {
      boxId = existingBox.id;
      console.log(`  박스 존재 → id=${boxId}`);
    } else {
      const { data: created, error } = await admin
        .from("market_cards")
        .insert({
          category: "pokemon",
          product_type: "box",
          parent_id: null,
          name: box.setName,
          set_name: box.setName,
          notes: boxNoteKey,
          is_active: true,
          display_order: 0,
        })
        .select("id")
        .single();
      if (error) { console.error(`  박스 생성 실패: ${error.message}`); continue; }
      boxId = created.id;
      console.log(`  박스 생성 → id=${boxId}`);
    }

    // 2) 싱글들 upsert
    for (const s of box.singles) {
      const singleNoteKey = `${box.notesKey}-${s.name.replace(/\s+/g, "")}`;
      const { data: existing } = await admin
        .from("market_cards")
        .select("id")
        .eq("notes", singleNoteKey)
        .maybeSingle();
      if (existing) {
        // 이미 있으면 활성화만
        await admin.from("market_cards").update({ is_active: true, parent_id: boxId, set_name: box.setName }).eq("id", existing.id);
        console.log(`    [skip] ${s.name} ${s.rarity ? `(${s.rarity})` : ""} — 이미 존재, 활성화`);
        continue;
      }
      const { error } = await admin
        .from("market_cards")
        .insert({
          category: "pokemon",
          product_type: "single",
          parent_id: boxId,
          name: s.name,
          set_name: box.setName,
          rarity: s.rarity,
          notes: singleNoteKey,
          is_active: true,
          display_order: 0,
        });
      if (error) { console.error(`    × ${s.name} 실패: ${error.message}`); continue; }
      console.log(`    + ${s.name} ${s.rarity ? `(${s.rarity})` : "(등급 미지정)"}`);
    }
  }

  console.log("\n완료 — 어드민에서 이미지·시세 등 채우면 됨");
}

main();
