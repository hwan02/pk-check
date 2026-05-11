/**
 * 한국판 카드들이 단일 'kr-cards' 세트에 묶여있는 걸 실제 세트별로 분리.
 *  - 카드 image_small URL에서 세트 코드 추출 (예: "SVI", "M4")
 *  - pokemoncard.co.kr 카드 상세 페이지에서 세트 한국어 이름 추출
 *  - 새 세트(`kr-{code}`) 생성, 카드들의 set_id 갱신
 *
 * 사용법: npx tsx scripts/fix-kr-sets.ts
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

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

const HEADERS = { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" };
const SYMBOL_BASE = "https://cards.image.pokemonkorea.co.kr/data/images/symbol";

function extractSetCode(imageUrl: string | null): string | null {
  if (!imageUrl) return null;
  const m = imageUrl.match(/wmimages\/(?:[A-Z]+\/)?([A-Za-z0-9]+)\//);
  return m ? m[1] : null;
}

async function fetchSetNameFromCard(krId: string): Promise<string | null> {
  try {
    const resp = await fetch(`https://pokemoncard.co.kr/cards/detail/${krId}`, {
      headers: HEADERS,
      signal: AbortSignal.timeout(10000),
    });
    if (!resp.ok) return null;
    const text = await resp.text();
    // <a href="/cards?s=..." class="search_href">{세트명}</a>
    const m = text.match(/class="search_href"[^>]*>([^<]+)</);
    if (m) return m[1].trim();
    return null;
  } catch {
    return null;
  }
}

async function main() {
  console.log("=".repeat(50));
  console.log("  한국판 세트 분리 백필");
  console.log("=".repeat(50));

  // 1) 모든 kr 카드 가져오기 (Supabase 기본 1000건 제한 → 페이지네이션)
  console.log("\n[1/4] 한국판 카드 로딩...");
  const cards: { id: string; image_small: string | null }[] = [];
  const PAGE = 1000;
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase
      .from("cards")
      .select("id, image_small")
      .eq("region", "kr")
      .range(offset, offset + PAGE - 1);
    if (error) {
      console.error("로딩 에러:", error.message);
      return;
    }
    if (!data || data.length === 0) break;
    cards.push(...data);
    if (data.length < PAGE) break;
  }
  if (cards.length === 0) {
    console.log("kr 카드가 없습니다.");
    return;
  }
  console.log(`  ${cards.length}장`);

  // 2) 세트 코드별 그룹핑
  console.log("\n[2/4] 세트 코드 추출...");
  const codeMap = new Map<string, string[]>(); // code → [cardId, ...]
  for (const c of cards) {
    const code = extractSetCode(c.image_small);
    if (!code) continue;
    if (!codeMap.has(code)) codeMap.set(code, []);
    codeMap.get(code)!.push(c.id);
  }
  console.log(`  ${codeMap.size}개 세트 발견: ${[...codeMap.keys()].sort().join(", ")}`);

  // 3) 각 세트 이름 fetch + sets 테이블 upsert
  console.log("\n[3/4] 세트 이름 스크래핑 + DB 적재...");
  const setRows: Record<string, unknown>[] = [];
  for (const [code, ids] of codeMap.entries()) {
    // 첫 카드의 krId 추출 (id가 "kr-BS2024001001" 형태)
    const sampleId = ids[0];
    const krMatch = sampleId.match(/^kr-(.+)$/);
    if (!krMatch) continue;
    const krId = krMatch[1];
    const name = (await fetchSetNameFromCard(krId)) ?? code;
    setRows.push({
      id: `kr-${code}`,
      name,
      name_ja: name,
      series: "Korean",
      printed_total: ids.length,
      symbol_url: `${SYMBOL_BASE}/${code}.png`,
      logo_url: `${SYMBOL_BASE}/${code}.png`,
      region: "kr",
      updated_at: new Date().toISOString(),
    });
    console.log(`  kr-${code}: ${name} (${ids.length}장)`);
  }
  const { error: setErr } = await supabase.from("sets").upsert(setRows, { onConflict: "id" });
  if (setErr) {
    console.error("세트 upsert 에러:", setErr.message);
    return;
  }
  console.log(`  → ${setRows.length}개 세트 저장`);

  // 4) 각 카드의 set_id 갱신
  console.log("\n[4/4] 카드 set_id 갱신...");
  let updated = 0;
  for (const [code, ids] of codeMap.entries()) {
    const newSetId = `kr-${code}`;
    for (let i = 0; i < ids.length; i += 200) {
      const chunk = ids.slice(i, i + 200);
      const { error } = await supabase.from("cards").update({ set_id: newSetId }).in("id", chunk);
      if (error) {
        console.error(`  ${code} update 에러:`, error.message);
        continue;
      }
      updated += chunk.length;
    }
    console.log(`  ${code}: ${ids.length}장 갱신`);
  }

  // 5) 기존 'kr-cards' 더미 세트 삭제
  console.log("\n기존 'kr-cards' 더미 세트 정리...");
  const { error: delErr } = await supabase.from("sets").delete().eq("id", "kr-cards");
  if (delErr) console.error("delete 에러:", delErr.message);
  else console.log("  삭제 완료");

  console.log(`\n${"=".repeat(50)}`);
  console.log(`  완료! 세트 ${setRows.length}개, 카드 ${updated}장 재할당`);
  console.log("=".repeat(50));
}

main().catch(console.error);
