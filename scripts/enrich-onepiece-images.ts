/**
 * market_cards 의 원피스 box/pack 행에 일본 공식 상품 페이지 이미지를 채워넣음.
 * 이미 image_url 이 있는 행은 건너뜀.
 *
 * 사용법:
 *   npx tsx scripts/enrich-onepiece-images.ts
 *   npx tsx scripts/enrich-onepiece-images.ts --force   # 기존 이미지도 덮어씀
 */

import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "fs";
import { fetchSeriesList, fetchProductImage, type OpSeries } from "../src/lib/onepiece-jp";

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

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const force = process.argv.includes("--force");

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** notes 키에서 시리즈 코드 추출.
 * `cat:op-box-OP-16` → OP-16
 * `cat:op-pack-OP-16` → OP-16
 */
function codeFromNotes(notes: string | null): string | null {
  if (!notes) return null;
  const m = notes.match(/^cat:op-(?:box|pack)-([A-Z]+-\d+)$/);
  return m ? m[1] : null;
}

interface Row {
  id: string;
  product_type: "box" | "pack";
  notes: string | null;
  image_url: string | null;
}

async function main() {
  // 시리즈 코드 → type 매핑 (booster/extra/premium/start)
  console.log("시리즈 메타 가져오는 중…");
  const series = await fetchSeriesList();
  const typeByCode = new Map<string, OpSeries["type"]>();
  for (const s of series) {
    if (s.code) typeByCode.set(s.code, s.type);
  }

  // 채울 대상: 원피스 box/pack
  let query = admin
    .from("market_cards")
    .select("id, product_type, notes, image_url")
    .eq("category", "onepiece")
    .in("product_type", ["box", "pack"]);
  if (!force) query = query.is("image_url", null);
  const { data: rows, error } = await query;
  if (error) { console.error(error.message); process.exit(1); }
  const targets = (rows ?? []) as Row[];

  console.log(`대상 ${targets.length} 건 (force=${force})\n`);

  // 시리즈 코드별로 한 번만 페치하고 캐싱
  const imageByCode = new Map<string, string | null>();

  let ok = 0;
  let miss = 0;
  let skip = 0;
  for (const r of targets) {
    const code = codeFromNotes(r.notes);
    if (!code) {
      console.log(`  [skip] ${r.product_type} id=${r.id} notes=${r.notes} (코드 파싱 실패)`);
      skip++;
      continue;
    }
    const type = typeByCode.get(code);
    if (!type) {
      console.log(`  [skip] ${code} (시리즈 메타 없음)`);
      skip++;
      continue;
    }

    if (!imageByCode.has(code)) {
      process.stdout.write(`  ${code.padEnd(8)} [${type}] … `);
      try {
        const url = await fetchProductImage(code, type);
        imageByCode.set(code, url);
        console.log(url ? "○" : "× 이미지 없음");
        await sleep(600);
      } catch (e) {
        imageByCode.set(code, null);
        console.log(`× ${(e as Error).message}`);
      }
    }

    const url = imageByCode.get(code);
    if (!url) { miss++; continue; }

    const { error: upErr } = await admin
      .from("market_cards")
      .update({ image_url: url })
      .eq("id", r.id);
    if (upErr) {
      console.log(`    update 실패 ${r.id}: ${upErr.message}`);
      miss++;
    } else {
      ok++;
    }
  }

  console.log(`\n완료: ${ok} 갱신 / ${miss} 실패 / ${skip} 건너뜀`);
}

main().catch((e) => { console.error(e); process.exit(1); });
