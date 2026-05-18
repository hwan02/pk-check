/**
 * 이미 import 된 싱글 카드들에 박스 행을 자동 생성하고 parent_id 연결.
 *
 * - 같은 set_name 을 가진 product_type='single' / parent_id IS NULL 카드들 그룹
 * - 그룹별로 product_type='box' 행 생성 (이미 있으면 재사용)
 * - 싱글들의 parent_id 를 박스 id 로 update
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

interface CardRow {
  id: string;
  category: "pokemon" | "onepiece";
  product_type: "box" | "pack" | "single";
  parent_id: string | null;
  name: string;
  set_name: string | null;
  image_url: string | null;
}

async function main() {
  // 1) parent 없는 싱글 카드 모두
  const { data: orphans } = await supabase
    .from("market_cards")
    .select("id, category, product_type, parent_id, name, set_name, image_url")
    .eq("product_type", "single")
    .is("parent_id", null);
  const all = (orphans ?? []) as CardRow[];
  console.log(`parent 없는 싱글: ${all.length}장\n`);

  // set_name 별 그룹 (없는 건 스킵)
  const byKey = new Map<string, { category: CardRow["category"]; setName: string; cards: CardRow[] }>();
  for (const c of all) {
    if (!c.set_name) continue;
    const key = `${c.category}::${c.set_name}`;
    const entry = byKey.get(key) ?? { category: c.category, setName: c.set_name, cards: [] };
    entry.cards.push(c);
    byKey.set(key, entry);
  }
  console.log(`그룹 ${byKey.size}개\n`);

  for (const [, group] of byKey) {
    // 2) 같은 set_name 의 박스 행이 이미 있는지
    const { data: existingBox } = await supabase
      .from("market_cards")
      .select("id, image_url")
      .eq("product_type", "box")
      .eq("category", group.category)
      .eq("set_name", group.setName)
      .maybeSingle();

    let boxId: string;
    if (existingBox) {
      boxId = existingBox.id;
      console.log(`  [재사용] ${group.setName} → box ${boxId}`);
    } else {
      // 박스 행 생성. 이미지는 첫 카드 이미지로 임시 (어드민에서 박스 패키지 이미지로 교체 권장)
      const { data: inserted, error } = await supabase
        .from("market_cards")
        .insert({
          category: group.category,
          product_type: "box",
          parent_id: null,
          name: group.setName,
          set_name: group.setName,
          image_url: group.cards.find((c) => c.image_url)?.image_url ?? null,
          is_active: false,
          display_order: 0,
        })
        .select("id")
        .single();
      if (error || !inserted) {
        console.error(`  ✗ ${group.setName} 박스 생성 실패: ${error?.message}`);
        continue;
      }
      boxId = inserted.id;
      console.log(`  [생성] ${group.setName} → box ${boxId}`);
    }

    // 3) 싱글들 parent_id update
    const ids = group.cards.map((c) => c.id);
    const { error: updErr } = await supabase
      .from("market_cards")
      .update({ parent_id: boxId })
      .in("id", ids);
    if (updErr) {
      console.error(`    ✗ 연결 실패: ${updErr.message}`);
    } else {
      console.log(`    ✓ ${ids.length}장 연결`);
    }
  }
  console.log("\n완료.");
}

main();
