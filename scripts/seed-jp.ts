/**
 * TCGdex API에서 일본판 카드/세트 전체 시드 → Supabase
 * 한국판/북미판과 region 컬럼으로 구분.
 *
 * 사용법:
 *   npx tsx scripts/seed-jp.ts            # SV 시리즈만 (기본)
 *   npx tsx scripts/seed-jp.ts --all      # 전 시리즈
 *   npx tsx scripts/seed-jp.ts --series sv,sm  # 특정 시리즈
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

const envPath = resolve(process.cwd(), ".env.local");
const envContent = readFileSync(envPath, "utf-8");
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx > 0) {
    const key = trimmed.slice(0, eqIdx);
    let value = trimmed.slice(eqIdx + 1);
    // Vercel CLI는 값을 "..."로 감싸서 저장 → 양끝 따옴표 제거
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const API = "https://api.tcgdex.net/v2/ja";

// 영문 정규명 → 일본판 약자 (rarity_ja에 보존)
const RARITY_JA_MAP: Record<string, string> = {
  Common: "C",
  Uncommon: "U",
  Rare: "R",
  "Double Rare": "RR",
  "Illustration Rare": "AR",
  "Secret Rare": "SR",
  "Special Illustration Rare": "SAR",
  "Ultra Rare": "UR",
  "Hyper Rare": "HR",
  "ACE SPEC Rare": "ACE",
  "Shiny Rare": "S",
  "Trainer Gallery Rare Holo": "CHR",
  Promo: "P",
};

interface TcgSetSummary {
  id: string;
  name: string;
  serie?: { id: string; name: string };
  cardCount: { total: number; official: number };
  symbol?: string;
  logo?: string;
}

interface TcgSetDetail extends TcgSetSummary {
  releaseDate?: string;
  cards: { id: string; localId: string; name: string; image?: string }[];
  serie: { id: string; name: string };
}

interface TcgCard {
  id: string;
  localId: string;
  name: string;
  image?: string;
  category?: "Pokemon" | "Trainer" | "Energy";
  rarity?: string;
  hp?: number;
  types?: string[];
  illustrator?: string;
  set: { id: string; name: string };
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJson<T>(url: string, retries = 2): Promise<T | null> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const resp = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (resp.ok) return (await resp.json()) as T;
      if (resp.status === 404) return null;
    } catch {
      // retry
    }
    if (attempt < retries) await sleep(500 * (attempt + 1));
  }
  return null;
}

// 동시 N개 제한 병렬 처리
async function parallelMap<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency = 10
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let idx = 0;
  async function worker() {
    while (true) {
      const i = idx++;
      if (i >= items.length) break;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  return results;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const all = args.includes("--all");
  let series: string[] | null = null;
  const seriesIdx = args.indexOf("--series");
  if (seriesIdx >= 0 && args[seriesIdx + 1]) {
    series = args[seriesIdx + 1].split(",").map((s) => s.toLowerCase());
  }
  if (!all && !series) series = ["sv"]; // 기본: SV 시대만
  return { all, series };
}

async function main() {
  console.log("=".repeat(50));
  console.log("  TCGdex 일본판 카드 시드");
  console.log("=".repeat(50));

  const { all, series } = parseArgs();
  console.log(all ? "  대상: 전 시리즈" : `  대상 시리즈 prefix: ${series!.join(", ")}`);

  // 1. 세트 목록
  console.log("\n[1/3] 세트 목록 로딩...");
  const sets = await fetchJson<TcgSetSummary[]>(`${API}/sets`);
  if (!sets) {
    console.error("세트 목록 조회 실패");
    return;
  }
  console.log(`  전체 ${sets.length}개 세트 발견`);

  // 시리즈 필터 (id prefix 기준)
  const targetSets = all
    ? sets
    : sets.filter((s) => series!.some((p) => s.id.toLowerCase().startsWith(p)));
  console.log(`  처리 대상: ${targetSets.length}개 세트`);

  // 2. 세트별 카드 정보 fetch
  // TCGdex가 동일 세트를 케이스 다르게 반환하는 경우가 있어 소문자 키로 dedupe
  const dedup = new Map<string, TcgSetSummary>();
  for (const s of targetSets) {
    const key = s.id.toLowerCase();
    if (!dedup.has(key)) dedup.set(key, s);
  }
  const uniqueSets = [...dedup.values()];
  console.log(`  중복 제거 후 처리 대상: ${uniqueSets.length}개`);

  let totalCards = 0;
  let savedCards = 0;
  const setRows: Record<string, unknown>[] = [];
  const allCardJobs: { setDetail: TcgSetDetail; cardSummary: { id: string } }[] = [];

  console.log("\n[2/3] 세트 상세 로딩...");
  for (let i = 0; i < uniqueSets.length; i++) {
    const s = uniqueSets[i];
    const detail = await fetchJson<TcgSetDetail>(`${API}/sets/${s.id}`);
    if (!detail) {
      console.log(`  [${i + 1}/${uniqueSets.length}] ${s.id}: 스킵 (조회 실패)`);
      continue;
    }
    if (detail.cards.length === 0) {
      console.log(`  [${i + 1}/${uniqueSets.length}] ${s.id}: 스킵 (0장)`);
      continue;
    }
    const setKey = s.id.toLowerCase(); // FK 매칭을 위해 set_id는 소문자 통일
    setRows.push({
      id: `jp-${setKey}`,
      name: detail.name,
      name_ja: detail.name,
      series: detail.serie?.name ?? null,
      printed_total: detail.cardCount.official ?? detail.cardCount.total ?? null,
      release_date: detail.releaseDate ?? null,
      logo_url: detail.logo ? `${detail.logo}.png` : null,
      symbol_url: detail.symbol ? `${detail.symbol}.png` : null,
      region: "jp",
      updated_at: new Date().toISOString(),
    });
    totalCards += detail.cards.length;
    for (const c of detail.cards) {
      allCardJobs.push({ setDetail: detail, cardSummary: c });
    }
    console.log(`  [${i + 1}/${uniqueSets.length}] ${s.id} (${detail.cards.length}장)`);
  }

  // 세트 upsert
  if (setRows.length > 0) {
    const { error } = await supabase.from("sets").upsert(setRows, { onConflict: "id" });
    if (error) console.error(`  세트 upsert 에러: ${error.message}`);
    else console.log(`  -> ${setRows.length}개 세트 저장`);
  }

  // 3. 카드 상세 병렬 fetch + 배치 upsert
  console.log(`\n[3/3] 카드 상세 로딩 (총 ${totalCards}장, 동시 10)...`);
  const BATCH_SIZE = 200;
  let batch: Record<string, unknown>[] = [];

  await parallelMap(
    allCardJobs,
    async (job) => {
      const card = await fetchJson<TcgCard>(`${API}/cards/${job.cardSummary.id}`);
      if (!card) return;

      const supertype =
        card.category === "Pokemon"
          ? "Pokémon"
          : card.category === "Trainer"
          ? "Trainer"
          : card.category === "Energy"
          ? "Energy"
          : null;

      const rarityEn = card.rarity ?? null;
      const rarityJa = rarityEn ? (RARITY_JA_MAP[rarityEn] ?? null) : null;

      batch.push({
        id: `jp-${card.id.toLowerCase()}`,
        name: card.name,
        name_ja: card.name,
        supertype,
        types: card.types ?? null,
        subtypes: null,
        hp: card.hp != null ? String(card.hp) : null,
        rarity: rarityEn,
        rarity_ja: rarityJa,
        set_id: `jp-${card.set.id.toLowerCase()}`,
        number: card.localId,
        artist: card.illustrator ?? null,
        attacks: null,
        weaknesses: null,
        resistances: null,
        retreat_cost: null,
        region: "jp",
        image_small: card.image ? `${card.image}/low.png` : null,
        image_large: card.image ? `${card.image}/high.png` : null,
        updated_at: new Date().toISOString(),
      });

      if (batch.length >= BATCH_SIZE) {
        const toSave = batch;
        batch = [];
        const { error } = await supabase.from("cards").upsert(toSave, { onConflict: "id" });
        if (error) console.error(`  카드 upsert 에러: ${error.message}`);
        else {
          savedCards += toSave.length;
          if (savedCards % 1000 < BATCH_SIZE) {
            console.log(`  -> 누적 저장: ${savedCards}/${totalCards}장`);
          }
        }
      }
    },
    10
  );

  // 남은 배치
  if (batch.length > 0) {
    const { error } = await supabase.from("cards").upsert(batch, { onConflict: "id" });
    if (error) console.error(`  카드 upsert 에러: ${error.message}`);
    else savedCards += batch.length;
  }

  console.log(`\n${"=".repeat(50)}`);
  console.log(`  완료! 세트 ${setRows.length}개, 카드 ${savedCards}장 저장`);
  console.log("=".repeat(50));
}

main().catch(console.error);
