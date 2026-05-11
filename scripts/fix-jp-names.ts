/**
 * region='jp' 카드 중 이름에 일본어가 없는 항목을 PokeAPI로 일본어 이름 백필.
 *  - "Charizard" → "リザードン"
 *  - "ミスティのquagsire" → "ミスティのヌオー" (영문 부분만 치환)
 *  - "ex"/"EX"/"V"/"VSTAR" 같은 변형 어미는 유지
 *
 * 사용법: npx tsx scripts/fix-jp-names.ts
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

const POKEAPI = "https://pokeapi.co/api/v2/pokemon-species";
const cache = new Map<string, string | null>();

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// 변형 어미 제거하고 베이스 영문명 추출
const SUFFIX_RE = /\s*(ex|EX|V|VSTAR|VMAX|GX|BREAK|δ|LV\.X|prime)\s*$/;
function extractBaseEn(text: string): string {
  // 영문 알파벳 시퀀스만 추출 (가장 긴 것)
  const en = text.match(/[A-Za-z][A-Za-z'.-]*/g);
  if (!en) return "";
  const longest = en.sort((a, b) => b.length - a.length)[0];
  return longest.replace(SUFFIX_RE, "").trim().toLowerCase();
}

async function getJaName(en: string): Promise<string | null> {
  const slug = en.toLowerCase().replace(/[^a-z0-9-]/g, "");
  if (cache.has(slug)) return cache.get(slug)!;
  try {
    const r = await fetch(`${POKEAPI}/${slug}`, { signal: AbortSignal.timeout(5000) });
    if (!r.ok) {
      cache.set(slug, null);
      return null;
    }
    const j = await r.json();
    const ja = j.names?.find((n: { language: { name: string }; name: string }) => n.language.name === "ja")?.name ?? null;
    cache.set(slug, ja);
    return ja;
  } catch {
    cache.set(slug, null);
    return null;
  }
}

async function main() {
  console.log("=".repeat(50));
  console.log("  일본판 카드명 일본어 백필");
  console.log("=".repeat(50));

  // 영문 전용/혼합 카드 후보 모두 로드
  const targets: { id: string; name: string }[] = [];
  for (let off = 0; ; off += 1000) {
    const { data } = await supabase
      .from("cards")
      .select("id, name")
      .eq("region", "jp")
      .range(off, off + 999);
    if (!data || data.length === 0) break;
    for (const c of data) {
      // 영문 문자가 포함된 경우 대상 (CJK가 있어도 영문이 같이 있으면 치환 시도)
      if (/[A-Za-z]{3,}/.test(c.name)) targets.push(c);
    }
    if (data.length < 1000) break;
  }
  console.log(`  영문 포함 jp 카드: ${targets.length}장`);

  let updated = 0, miss = 0;
  for (let i = 0; i < targets.length; i++) {
    const c = targets[i];
    const baseEn = extractBaseEn(c.name);
    if (!baseEn || baseEn.length < 3) {
      miss++;
      continue;
    }
    const ja = await getJaName(baseEn);
    if (!ja) {
      miss++;
      continue;
    }
    // 영문 포켓몬 이름을 일본어로 치환 (대소문자 무시)
    const enRe = new RegExp(baseEn, "i");
    const newName = c.name.replace(enRe, ja);
    if (newName === c.name) {
      miss++;
      continue;
    }
    const { error } = await supabase.from("cards").update({ name: newName, name_ja: newName }).eq("id", c.id);
    if (!error) {
      updated++;
      if (updated <= 5 || updated % 50 === 0) {
        console.log(`  ${c.id}: "${c.name}" → "${newName}"`);
      }
    }
    if (i % 30 === 29) await sleep(300); // PokeAPI rate limit
  }

  console.log(`\n${"=".repeat(50)}`);
  console.log(`  완료! 갱신 ${updated}장, 매칭 실패 ${miss}장`);
  console.log("=".repeat(50));
}

main().catch(console.error);
