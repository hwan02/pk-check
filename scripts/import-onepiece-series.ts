/**
 * 일본 공식 onepiece-cardgame.com 의 시리즈를 market_cards 위계로 import.
 *
 * 사용법:
 *   npx tsx scripts/import-onepiece-series.ts OP-16
 *   npx tsx scripts/import-onepiece-series.ts ST-30 EB-04
 *   npx tsx scripts/import-onepiece-series.ts --all-boosters
 *   npx tsx scripts/import-onepiece-series.ts --all
 *
 * 위계:
 *   - booster / extra / premium  → box → pack → singles  (3 단계)
 *   - start                       → box → singles         (2 단계, 팩 없음)
 *
 * 멱등성: notes 컬럼의 키로 중복 판단
 *   - box:   `cat:op-box-{CODE}`   (예: cat:op-box-OP-16)
 *   - pack:  `cat:op-pack-{CODE}`  (예: cat:op-pack-OP-16)
 *   - single: `cat:op-{CARDID}`    (예: cat:op-OP16-001)
 *
 * is_active 는 false 로 들어옴 — 어드민에서 검수 후 활성화.
 */

import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "fs";
import { fetchSeriesList, fetchSeriesCards, type OpSeries, type OpCard } from "../src/lib/onepiece-jp";

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

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function boxNoteKey(code: string): string { return `cat:op-box-${code}`; }
function packNoteKey(code: string): string { return `cat:op-pack-${code}`; }
function singleNoteKey(cardId: string): string { return `cat:op-${cardId}`; }

/** 카드 id (예: OP16-001) → 정수 (1) — display_order 용 */
function cardOrder(id: string): number {
  const m = id.match(/-(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

/** 이미지 URL 캐시 쿼리 파라미터(?260518) 제거. */
function cleanImage(url: string): string {
  return url.replace(/\?[^?]*$/, "");
}

interface ImportStat {
  code: string;
  type: OpSeries["type"];
  boxAdded: boolean;
  packAdded: boolean;
  singlesAdded: number;
  singlesSkipped: number;
}

async function ensureBox(series: OpSeries): Promise<string> {
  const code = series.code!;
  const noteKey = boxNoteKey(code);
  const { data: existing } = await admin
    .from("market_cards")
    .select("id")
    .eq("notes", noteKey)
    .maybeSingle();
  if (existing) return existing.id;

  const { data, error } = await admin
    .from("market_cards")
    .insert({
      category: "onepiece",
      product_type: "box",
      parent_id: null,
      name: `${series.name}【${code}】`,
      name_en: code,
      set_name: series.name,
      rarity: null,
      image_url: null,
      notes: noteKey,
      is_active: false,
      display_order: 0,
    })
    .select("id")
    .single();
  if (error) throw new Error(`box insert 실패 (${code}): ${error.message}`);
  return data.id;
}

async function ensurePack(series: OpSeries, boxId: string): Promise<string> {
  const code = series.code!;
  const noteKey = packNoteKey(code);
  const { data: existing } = await admin
    .from("market_cards")
    .select("id")
    .eq("notes", noteKey)
    .maybeSingle();
  if (existing) return existing.id;

  const { data, error } = await admin
    .from("market_cards")
    .insert({
      category: "onepiece",
      product_type: "pack",
      parent_id: boxId,
      name: `${series.name}【${code}】팩`,
      name_en: `${code} pack`,
      set_name: series.name,
      rarity: null,
      image_url: null,
      notes: noteKey,
      is_active: false,
      display_order: 0,
    })
    .select("id")
    .single();
  if (error) throw new Error(`pack insert 실패 (${code}): ${error.message}`);
  return data.id;
}

async function importSingles(
  series: OpSeries,
  parentId: string,
  cards: OpCard[],
): Promise<{ added: number; skipped: number }> {
  if (cards.length === 0) return { added: 0, skipped: 0 };

  const noteKeys = cards.map((c) => singleNoteKey(c.id));
  const { data: existing } = await admin
    .from("market_cards")
    .select("notes")
    .in("notes", noteKeys);
  const dup = new Set((existing ?? []).map((r) => r.notes as string));

  const inserts = cards
    .filter((c) => !dup.has(singleNoteKey(c.id)))
    .map((c) => ({
      category: "onepiece" as const,
      product_type: "single" as const,
      parent_id: parentId,
      name: c.name,
      name_en: c.id,
      set_name: series.name,
      rarity: c.rarity || null,
      image_url: cleanImage(c.imageUrl) || null,
      notes: singleNoteKey(c.id),
      is_active: false,
      display_order: cardOrder(c.id),
    }));

  if (inserts.length === 0) return { added: 0, skipped: cards.length };

  for (let i = 0; i < inserts.length; i += 500) {
    const chunk = inserts.slice(i, i + 500);
    const { error } = await admin.from("market_cards").insert(chunk);
    if (error) throw new Error(`single insert 실패 (${series.code}): ${error.message}`);
  }
  return { added: inserts.length, skipped: cards.length - inserts.length };
}

async function importSeries(series: OpSeries): Promise<ImportStat> {
  if (!series.code) throw new Error(`시리즈 코드 미상: ${series.name}`);

  const cards = await fetchSeriesCards(series.value);
  const boxId = await ensureBox(series);

  let packId: string | null = null;
  if (series.type !== "start") {
    packId = await ensurePack(series, boxId);
  }
  const parentId = packId ?? boxId;
  const { added, skipped } = await importSingles(series, parentId, cards);

  return {
    code: series.code,
    type: series.type,
    boxAdded: true,  // ensure 함수가 idempotent 라 추가 여부 구분이 없음 — 일단 true
    packAdded: !!packId,
    singlesAdded: added,
    singlesSkipped: skipped,
  };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("사용법: import-onepiece-series.ts <CODE...> | --all | --all-boosters | --all-starts");
    process.exit(1);
  }

  console.log("시리즈 목록 가져오는 중…");
  const all = await fetchSeriesList();
  console.log(`  총 ${all.length} 종 발견`);

  let target: OpSeries[] = [];
  if (args.includes("--all")) {
    target = all.filter((s) => !!s.code);
  } else if (args.includes("--all-boosters")) {
    target = all.filter((s) => s.type === "booster");
  } else if (args.includes("--all-starts")) {
    target = all.filter((s) => s.type === "start");
  } else {
    const codes = new Set(args);
    target = all.filter((s) => s.code && codes.has(s.code));
    const missing = [...codes].filter((c) => !target.some((s) => s.code === c));
    if (missing.length > 0) {
      console.error(`인식 안 됨: ${missing.join(", ")}`);
      process.exit(1);
    }
  }

  if (target.length === 0) {
    console.error("import 대상 없음");
    process.exit(1);
  }

  console.log(`\nimport 대상 ${target.length} 종:`);
  for (const s of target) console.log(`  - [${s.type}] ${s.code}  ${s.name}`);
  console.log();

  let totalAdded = 0;
  let totalSkipped = 0;
  for (const s of target) {
    process.stdout.write(`  ${s.code!.padEnd(8)} ${s.name} … `);
    try {
      const stat = await importSeries(s);
      console.log(`+${stat.singlesAdded} 추가 / ${stat.singlesSkipped} 건너뜀 (pack=${stat.packAdded ? "○" : "×"})`);
      totalAdded += stat.singlesAdded;
      totalSkipped += stat.singlesSkipped;
    } catch (e) {
      console.log(`× 실패: ${(e as Error).message}`);
    }
    await sleep(800); // 일본 공식 사이트 매너
  }
  console.log(`\n합계: +${totalAdded} 추가 / ${totalSkipped} 건너뜀`);
  console.log("\n어드민(/admin/market) 에서 is_active 토글로 노출 검수해주세요.");
}

main().catch((e) => { console.error(e); process.exit(1); });
