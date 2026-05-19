/**
 * 위계 정정: 박스 직접 자식 single 들을 같은 박스 아래 팩으로 다시 연결.
 *  - 박스 → 팩 → 싱글 구조 일관성 확보
 *  - 박스 직속 자식 중 첫 번째 pack 행을 사용, 없으면 박스명 + " 팩" 으로 새 팩 자동 생성
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

interface Row {
  id: string;
  category: "pokemon" | "onepiece";
  product_type: "box" | "pack" | "single";
  parent_id: string | null;
  name: string;
  set_name: string | null;
  image_url: string | null;
  is_active: boolean;
}

async function main() {
  // 모든 박스 가져옴
  const { data: boxes } = await supabase
    .from("market_cards")
    .select("id, category, product_type, parent_id, name, set_name, image_url, is_active")
    .eq("product_type", "box");
  const boxRows = (boxes ?? []) as Row[];
  console.log(`박스 ${boxRows.length}개\n`);

  let totalReparented = 0;

  for (const box of boxRows) {
    // 박스 직접 자식들
    const { data: children } = await supabase
      .from("market_cards")
      .select("id, product_type, name, set_name, image_url, category, is_active")
      .eq("parent_id", box.id);
    const cs = (children ?? []) as Row[];
    const directSingles = cs.filter((c) => c.product_type === "single");
    const packs = cs.filter((c) => c.product_type === "pack");

    if (directSingles.length === 0) {
      console.log(`  [skip] ${box.name} — 박스 직속 single 0장`);
      continue;
    }

    // 팩 1개 확보 (없으면 생성)
    let packId: string;
    if (packs.length > 0) {
      packId = packs[0].id;
      console.log(`  [재사용] ${box.name} → pack: ${packs[0].name}`);
    } else {
      const packName = `${box.name} 팩`;
      const { data: newPack, error: insErr } = await supabase
        .from("market_cards")
        .insert({
          category: box.category,
          product_type: "pack",
          parent_id: box.id,
          name: packName,
          set_name: box.set_name,
          image_url: box.image_url,
          is_active: box.is_active,
          display_order: 0,
        })
        .select("id")
        .single();
      if (insErr || !newPack) {
        console.error(`  ✗ ${box.name} 팩 생성 실패: ${insErr?.message}`);
        continue;
      }
      packId = newPack.id;
      console.log(`  [생성] ${box.name} → pack 신규: ${packName}`);
    }

    // 직속 single 들의 parent_id 를 그 팩으로
    const singleIds = directSingles.map((s) => s.id);
    const { error: updErr } = await supabase
      .from("market_cards")
      .update({ parent_id: packId })
      .in("id", singleIds);
    if (updErr) {
      console.error(`    ✗ 재연결 실패: ${updErr.message}`);
    } else {
      console.log(`    ✓ ${singleIds.length}장 → pack 으로 재연결`);
      totalReparented += singleIds.length;
    }
  }

  console.log(`\n총 ${totalReparented}장 single 재연결`);
}

main();
