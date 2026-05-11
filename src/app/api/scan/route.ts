import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

/**
 * 카드 번호(예: "045/198")로 후보 카드 찾기.
 * 같은 번호가 여러 세트에 존재하므로 일반적으로 다중 후보 반환 → 사용자가 선택.
 *
 * 옵션 query params:
 *   - number: "045/198" 형태 (필수)
 *   - region: 'en'|'jp'|'kr' (선택, 좁힘)
 *   - name: OCR로 잡힌 카드명 일부 (선택, 후보 정렬 보조)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const number = (searchParams.get("number") ?? "").trim();
  const region = searchParams.get("region") ?? "";
  const name = (searchParams.get("name") ?? "").trim();

  if (!number) {
    return NextResponse.json({ error: "number required" }, { status: 400 });
  }

  const supabase = createServerClient();

  // region별 number 포맷이 다름:
  //   en: "1", "45", "199" (패딩 없음)
  //   jp: "001", "045" (3자리 패딩, 슬래시 없음)
  //   kr: "013/053" (full)
  // OCR 결과를 케이스마다 try
  const numMatch = number.match(/^(\d{1,3})\s*\/\s*(\d{1,3})$/);
  const localOnly = number.match(/^(\d{1,3})$/);

  let query = supabase
    .from("cards")
    .select("id, name, name_ja, number, region, image_small, rarity, rarity_ja, set:sets(id, name)")
    .limit(40);

  const buildCandidates = (raw: string): string[] => {
    const noPad = String(parseInt(raw, 10)); // "045" → "45"
    const pad3 = raw.padStart(3, "0");
    return Array.from(new Set([raw, noPad, pad3]));
  };

  if (numMatch) {
    const localCandidates = buildCandidates(numMatch[1]);
    const totalCandidates = buildCandidates(numMatch[2]);
    const conds: string[] = [];
    for (const l of localCandidates) {
      conds.push(`number.eq.${l}`);
      for (const t of totalCandidates) conds.push(`number.eq.${l}/${t}`);
      conds.push(`number.like.${l}/%`);
    }
    query = query.or(conds.join(","));
  } else if (localOnly) {
    const cands = buildCandidates(localOnly[1]);
    const conds: string[] = [];
    for (const l of cands) {
      conds.push(`number.eq.${l}`);
      conds.push(`number.like.${l}/%`);
    }
    query = query.or(conds.join(","));
  } else {
    return NextResponse.json({ error: "invalid number format" }, { status: 400 });
  }

  if (region) query = query.eq("region", region);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let candidates = (data ?? []).map((c) => ({
    ...c,
    set: Array.isArray(c.set) ? c.set[0] ?? null : c.set ?? null,
  }));

  // name 힌트가 있으면 매칭 점수로 정렬
  if (name) {
    const lcName = name.toLowerCase();
    candidates = candidates
      .map((c) => {
        const matchEn = c.name?.toLowerCase().includes(lcName) ? 2 : 0;
        const matchJa = c.name_ja?.includes(name) ? 2 : 0;
        return { ...c, _score: matchEn + matchJa };
      })
      .sort((a, b) => b._score - a._score);
  }

  return NextResponse.json({ candidates: candidates.slice(0, 20) });
}
