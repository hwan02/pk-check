/**
 * snkrdunk 시세 일괄 백필.
 * jp/kr 카드 중 snkrdunk_price가 비어있는 포켓몬 카드를 찾아 키워드 검색 → upsert.
 *
 * 시간이 오래 걸리는 작업이라 로컬에서 백그라운드로 돌리는 용도.
 * 요청당 2초 sleep, 약 1800회/시간 처리. 10000장이면 ~6시간.
 *
 * 사용법:
 *   npx tsx scripts/backfill-snkr-prices.ts                  # jp + kr
 *   npx tsx scripts/backfill-snkr-prices.ts --region jp
 *   npx tsx scripts/backfill-snkr-prices.ts --region kr
 *   npx tsx scripts/backfill-snkr-prices.ts --limit 500      # 일부만 시험
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";
import { searchSnkrdunk } from "../src/lib/snkrdunk";

const envPath = resolve(process.cwd(), ".env.local");
for (const line of readFileSync(envPath, "utf-8").split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const i = trimmed.indexOf("=");
  if (i <= 0) continue;
  let v = trimmed.slice(i + 1);
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  if (!process.env[trimmed.slice(0, i)]) process.env[trimmed.slice(0, i)] = v;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function parseArgs() {
  const args = process.argv.slice(2);
  let region: "jp" | "kr" | null = null;
  let limit: number | null = null;
  const rIdx = args.indexOf("--region");
  if (rIdx >= 0) {
    const v = args[rIdx + 1];
    if (v === "jp" || v === "kr") region = v;
  }
  const lIdx = args.indexOf("--limit");
  if (lIdx >= 0) limit = parseInt(args[lIdx + 1] ?? "0", 10) || null;
  return { region, limit };
}

/**
 * 일본어 마켓 검색용 키워드 빌드.
 *  - name_ja(또는 name)에서 영문/숫자/괄호 노이즈 제거
 *  - 의미있는 일본어 글자 2자 미만이면 원본 사용
 */
function buildKeyword(card: { name: string; name_ja: string | null }): string | null {
  const base = card.name_ja ?? card.name;
  if (!base) return null;
  if (!/[぀-ゟ゠-ヿ一-鿿]/.test(base)) return null; // 일본어가 전혀 없으면 검색 의미 없음
  const stripped = base.replace(/[A-Za-z0-9]+/g, "").trim();
  const meaningful = stripped.replace(/[（）()・〜~ー\s\[\]]/g, "");
  return meaningful.length >= 2 ? stripped : base;
}

async function main() {
  const { region, limit } = parseArgs();
  console.log("=".repeat(50));
  console.log(`  snkrdunk 시세 백필 (region=${region ?? "jp+kr"}${limit ? `, limit=${limit}` : ""})`);
  console.log("=".repeat(50));

  // 대상 카드 로드 (페이지네이션). 포켓몬 카드 + 빈 snkrdunk_price
  console.log("\n[1/2] 대상 카드 조회 중...");
  const targets: { id: string; name: string; name_ja: string | null; region: string }[] = [];
  const PAGE = 1000;
  for (let off = 0; ; off += PAGE) {
    let q = supabase
      .from("cards")
      .select("id, name, name_ja, region, prices(snkrdunk_price)")
      .eq("supertype", "Pokémon");
    if (region) q = q.eq("region", region);
    else q = q.in("region", ["jp", "kr"]);
    const { data, error } = await q.range(off, off + PAGE - 1);
    if (error) {
      console.error("조회 에러:", error.message);
      return;
    }
    if (!data || data.length === 0) break;
    for (const c of data) {
      const p = Array.isArray(c.prices) ? c.prices[0] : c.prices;
      if (p?.snkrdunk_price != null) continue;
      targets.push({ id: c.id, name: c.name, name_ja: c.name_ja, region: c.region });
    }
    if (data.length < PAGE) break;
  }
  console.log(`  대상: ${targets.length}장`);

  const work = limit ? targets.slice(0, limit) : targets;
  const start = Date.now();
  let hit = 0, miss = 0, skip = 0;

  console.log(`\n[2/2] snkrdunk 검색 시작 (요청당 2초 sleep)...`);
  for (let i = 0; i < work.length; i++) {
    const c = work[i];
    const keyword = buildKeyword(c);
    if (!keyword) {
      skip++;
      continue;
    }

    try {
      const result = await searchSnkrdunk(keyword);
      if (result.price != null) {
        await supabase.from("prices").upsert(
          {
            card_id: c.id,
            snkrdunk_price: result.price,
            snkrdunk_title: result.title,
            fetched_at: new Date().toISOString(),
          },
          { onConflict: "card_id" }
        );
        hit++;
      } else {
        miss++;
      }
    } catch (e) {
      console.error(`  ${c.id}: 에러`, e instanceof Error ? e.message : String(e));
      miss++;
    }

    if ((i + 1) % 25 === 0 || i === work.length - 1) {
      const elapsed = Math.round((Date.now() - start) / 1000);
      const eta = work.length === i + 1 ? 0 : Math.round((work.length - i - 1) * (elapsed / (i + 1)));
      console.log(
        `  ${i + 1}/${work.length} | hit=${hit} miss=${miss} skip=${skip} | 경과 ${elapsed}s, ETA ~${Math.round(eta / 60)}분`
      );
    }

    await sleep(2000);
  }

  console.log(`\n${"=".repeat(50)}`);
  console.log(`  완료! hit=${hit}, miss=${miss}, skip=${skip}`);
  console.log("=".repeat(50));
}

main().catch(console.error);
