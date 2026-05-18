/**
 * 현재 박스 행의 image_url 이 카드 이미지로 잘못 들어가있음.
 * sets.symbol_url(없으면 null) 로 교체하고, 사용자가 추후 어드민에서 박스 패키지 이미지 업로드 권장.
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

async function main() {
  // 모든 박스 행 (product_type=box) 가져옴
  const { data: boxes } = await supabase
    .from("market_cards")
    .select("id, name, set_name, image_url")
    .eq("product_type", "box");
  const boxRows = (boxes ?? []) as { id: string; name: string; set_name: string | null; image_url: string | null }[];
  console.log(`박스 ${boxRows.length}개\n`);

  for (const box of boxRows) {
    // set_name으로 sets 테이블에서 매칭 (kr- prefix)
    const { data: setRow } = await supabase
      .from("sets")
      .select("id, symbol_url")
      .eq("name", box.set_name || box.name)
      .like("id", "kr-%")
      .maybeSingle();

    const newImg = setRow?.symbol_url ?? null;
    const { error } = await supabase
      .from("market_cards")
      .update({ image_url: newImg })
      .eq("id", box.id);
    const label = newImg ? `symbol → ${setRow!.id}` : "(이미지 없음 — 어드민에서 업로드 권장)";
    console.log(`  ${error ? "✗" : "✓"} ${box.name} ${label}`);
  }
  console.log("\n완료. 박스 패키지 이미지는 어드민에서 별도 업로드해주세요.");
}

main();
