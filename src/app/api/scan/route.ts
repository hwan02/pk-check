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
// 한국 약자 → 영문 정규명 매핑 (rarity 컬럼이 영문이라 약자로 들어오면 변환)
const RARITY_ABBR_TO_NAME: Record<string, string> = {
  C: "Common",
  U: "Uncommon",
  R: "Rare",
  RR: "Double Rare",
  AR: "Illustration Rare",
  SR: "Secret Rare",
  SAR: "Special Illustration Rare",
  UR: "Ultra Rare",
  HR: "Hyper Rare",
  ACE: "ACE SPEC Rare",
  ACESPEC: "ACE SPEC Rare",
  CHR: "Trainer Gallery Rare Holo",
  TR: "Trainer Gallery Rare Holo",
};

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const number = (searchParams.get("number") ?? "").trim();
  const region = searchParams.get("region") ?? "";
  const name = (searchParams.get("name") ?? "").trim();
  const rarity = (searchParams.get("rarity") ?? "").trim();

  if (!number && !name && !rarity) {
    return NextResponse.json({ error: "at least one of number/name/rarity required" }, { status: 400 });
  }

  const supabase = createServerClient();

  // region별 number 포맷이 다름:
  //   en: "1", "45", "199" (패딩 없음)
  //   jp: "001", "045" (3자리 패딩, 슬래시 없음)
  //   kr: "013/053" (full)
  //   jp promo: "260/SV-P" (슬래시 + 알파벳 세트코드)
  // 추가로 일부 jp 카드는 number 컬럼이 snkrdunk product id로 저장 + 실제 번호는 name 안에 들어있음
  const numFullDigits = number.match(/^(\d{1,3})\s*\/\s*(\d{1,3})$/);
  const numPromo = number.match(/^(\d{1,3})\s*\/\s*([A-Z][A-Z0-9-]*)$/);
  const localOnly = number.match(/^(\d{1,3})$/);

  let query = supabase
    .from("cards")
    .select("id, name, name_ja, number, region, image_small, rarity, rarity_ja, set:sets(id, name)")
    .limit(60);

  const buildCandidates = (raw: string): string[] => {
    const noPad = String(parseInt(raw, 10));
    const pad3 = raw.padStart(3, "0");
    return Array.from(new Set([raw, noPad, pad3]));
  };

  const conds: string[] = [];
  if (numFullDigits) {
    const locals = buildCandidates(numFullDigits[1]);
    const totals = buildCandidates(numFullDigits[2]);
    for (const l of locals) {
      conds.push(`number.eq.${l}`);
      for (const t of totals) conds.push(`number.eq.${l}/${t}`);
      conds.push(`number.like.${l}/%`);
    }
  } else if (numPromo) {
    // "260/SV-P" → 번호 260 + 세트코드 SV-P. number는 보통 "260"만, 세트는 이름/set_id에서 추정
    const locals = buildCandidates(numPromo[1]);
    const setCode = numPromo[2];
    for (const l of locals) {
      conds.push(`number.eq.${l}`);
      conds.push(`number.eq.${l}/${setCode}`);
      conds.push(`name.ilike.%${l}%${setCode}%`);
      conds.push(`name.ilike.%${setCode}%${l}%`);
    }
  } else if (localOnly) {
    const cands = buildCandidates(localOnly[1]);
    for (const l of cands) {
      conds.push(`number.eq.${l}`);
      conds.push(`number.like.${l}/%`);
      conds.push(`name.ilike.%${l}]%`);
      conds.push(`name.ilike.%${l} %`);
    }
  }

  // 이름 후보도 OR 조건에 추가 (CJK 단편이라도 substring 매칭)
  if (name) {
    conds.push(`name.ilike.%${name}%`);
    conds.push(`name_ja.ilike.%${name}%`);
  }

  if (conds.length === 0) {
    return NextResponse.json({ error: "no usable hints" }, { status: 400 });
  }

  query = query.or(conds.join(","));

  if (region) query = query.eq("region", region);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 후보 정규화 + 점수 기반 정렬 (등급/이름 매칭 가중)
  const rarityName = rarity ? RARITY_ABBR_TO_NAME[rarity.toUpperCase()] ?? null : null;
  const lcName = name.toLowerCase();

  type Candidate = {
    id: string; name: string; name_ja: string | null; number: string | null;
    region: string | null; image_small: string | null; rarity: string | null; rarity_ja: string | null;
    set: { id: string; name: string } | null;
    _score: number;
  };

  // 이름이 있고 그게 CJK면 number-only 후보는 거의 무관 → 큰 가중치 차이
  const nameIsCJK = /[぀-ゟ゠-ヿ一-鿿가-힯]/.test(name);

  const candidates: Candidate[] = (data ?? []).map((c) => {
    let score = 0;
    if (name) {
      const matchEn = c.name?.toLowerCase().includes(lcName);
      const matchJa = c.name_ja?.includes(name);
      if (matchEn || matchJa) score += 10;
    }
    if (rarity) {
      const rUp = rarity.toUpperCase();
      if (c.rarity_ja?.toUpperCase() === rUp) score += 2;
      else if (rarityName && c.rarity === rarityName) score += 2;
    }
    if (number) {
      const fullNum = /\/[A-Z0-9-]/.test(number) ? number : null;
      if (fullNum && c.number === fullNum) score += 5;
      else if (c.number === number) score += 3;
      else if (c.number?.startsWith(number + "/")) score += 2;
    }
    return {
      ...c,
      set: Array.isArray(c.set) ? c.set[0] ?? null : c.set ?? null,
      _score: score,
    } as Candidate;
  });

  // CJK 이름이 있으면 이름 매치 없는 후보는 제외
  let filtered = candidates;
  if (nameIsCJK) {
    const withName = candidates.filter((c) => c._score >= 10);
    if (withName.length > 0) filtered = withName;
  }

  filtered.sort((a, b) => b._score - a._score);

  return NextResponse.json({ candidates: filtered.slice(0, 20) });
}
