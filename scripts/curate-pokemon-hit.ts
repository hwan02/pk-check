/**
 * /hit 페이지 포켓몬 카드 큐레이션 — 사용자 지정 카드만 노출하고 나머지 숨김.
 *
 * 동작:
 * 1) PICKS 리스트 기준으로 각 (세트 키워드, 이름 키워드) 쌍에 매칭되는 싱글을 top-N 활성
 *    (N=1 기본, 같은 이름 두 번 적힌 경우 N=2)
 * 2) 활성 카드의 부모 박스/팩도 활성
 * 3) 그 외 포켓몬 싱글/박스/팩은 모두 is_active=false
 * 4) 원피스는 그대로 유지
 *
 * 사용법: npx tsx scripts/curate-pokemon-hit.ts
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

for (const line of readFileSync("/Users/ssh/workspace/pk-check/.env.local", "utf-8").split("\n")) {
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

// 등급 우선순위 (작을수록 위)
const RARITY_RANK: Record<string, number> = {
  MUR: 1, SAR: 2, SSR: 3, AR: 4, RR: 5, RRR: 5, UR: 6, HR: 7, SR: 8, R: 11, U: 13, C: 14,
};
function rank(r: string | null | undefined): number {
  return r ? (RARITY_RANK[r] ?? 50) : 99;
}

interface Pick {
  setKw: string | null;  // set_name LIKE %setKw%  (null = set_name IS NULL)
  nameKw: string;        // name ILIKE %nameKw%
  count: number;         // top N by rarity rank
  desc: string;          // 사람 읽기용
}

const PICKS: Pick[] = [
  // 낙원드래고나
  { setKw: "낙원드래고나", nameKw: "루티아의 어필", count: 1, desc: "낙원드래고나 / 루티아의 어필" },
  { setKw: "낙원드래고나", nameKw: "라티아스 ex", count: 1, desc: "낙원드래고나 / 라티아스 ex" },

  // 열풍의 아레나
  { setKw: "열풍의 아레나", nameKw: "한카리아스", count: 1, desc: "열풍의아레나 / 난천의한카리아스 ex" },
  { setKw: "열풍의 아레나", nameKw: "칠색조", count: 1, desc: "열풍의아레나 / 상형의칠색조 ex" },

  // 배틀파트너즈
  { setKw: "배틀파트너즈", nameKw: "삐삐", count: 1, desc: "배틀파트너즈 / 릴리에의 삐삐 ex" },
  { setKw: "배틀파트너즈", nameKw: "찌리배리", count: 1, desc: "배틀파트너즈 / 모야모의 찌리배리 ex" },

  // 초전브레이커
  { setKw: "초전브레이커", nameKw: "피카츄 ex", count: 2, desc: "초전브레이커 / 피카츄 ex ×2 (top 2 rarity)" },
  { setKw: "초전브레이커", nameKw: "밀로틱", count: 1, desc: "초전브레이커 / 밀로틱 ex" },

  // 블랙볼트
  { setKw: "블랙볼트", nameKw: "제크로무", count: 2, desc: "블랙볼트 / 제크로무 ex ×2" },
  { setKw: "블랙볼트", nameKw: "n의 방안", count: 1, desc: "블랙볼트 / N의 방안" },

  // 화이트플레어
  { setKw: "화이트플레어", nameKw: "레시라무", count: 2, desc: "화이트플레어 / 레시라무 ex ×2" },
  { setKw: "화이트플레어", nameKw: "투희", count: 1, desc: "화이트플레어 / 투희" },

  // 로켓단의 영광
  { setKw: "로켓단의 영광", nameKw: "뮤츠", count: 1, desc: "로켓단의영광 / 로켓단의 뮤츠 ex" },
  { setKw: "로켓단의 영광", nameKw: "파이어", count: 1, desc: "로켓단의영광 / 로켓단의 파이어 ex" },

  // 메가브레이브 (MUR 가 DB 에 없어 SAR/SR top 2)
  { setKw: "메가브레이브", nameKw: "메가루카리오", count: 2, desc: "메가브레이브 / 메가루카리오 ex ×2 (top 2)" },
  { setKw: "메가브레이브", nameKw: "릴리에의 결심", count: 1, desc: "메가브레이브 / 릴리에의 결심 (SR)" },

  // 메가심포니아
  { setKw: "메가심포니아", nameKw: "메가가디안", count: 2, desc: "메가심포니아 / 메가가디안 ex ×2 (top 2)" },
  { setKw: "메가심포니아", nameKw: "아세로라", count: 1, desc: "메가심포니아 / 아세로라의 장난 (SR)" },

  // 변환의 가면 (placeholder)
  { setKw: "변환의 가면", nameKw: "시유", count: 1, desc: "변환의가면 / 시유" },
  { setKw: "변환의 가면", nameKw: "절친", count: 1, desc: "변환의가면 / 절친 포핀" },

  // 크림슨 헤이즈 (placeholder)
  { setKw: "크림슨 헤이즈", nameKw: "개굴닌자", count: 1, desc: "크림슨헤이즈 / 개굴닌자 ex" },
  { setKw: "크림슨 헤이즈", nameKw: "세류", count: 1, desc: "크림슨헤이즈 / 세류" },

  // MEGA 스타트 덱 100 배틀컬렉션 (placeholder)
  { setKw: "스타트 덱 100", nameKw: "메가리자몽", count: 1, desc: "스타트덱100 / 메가리자몽 ex" },
  { setKw: "스타트 덱 100", nameKw: "피카츄", count: 1, desc: "스타트덱100 / 피카츄 ex" },
  { setKw: "스타트 덱 100", nameKw: "삐삐", count: 1, desc: "스타트덱100 / 릴리에의 삐삐 ex" },
];

async function main() {
  // 1) 모든 포켓몬 싱글/박스/팩 비활성화
  console.log("[1] 포켓몬 전체 비활성화");
  const { error: deactErr } = await admin
    .from("market_cards")
    .update({ is_active: false })
    .eq("category", "pokemon");
  if (deactErr) { console.error(deactErr.message); process.exit(1); }

  // 2) PICKS 순회하며 매칭되는 싱글 top-N 활성화
  console.log("\n[2] 큐레이션 카드 활성화");
  const activatedIds = new Set<string>();
  for (const pick of PICKS) {
    let q = admin
      .from("market_cards")
      .select("id, name, rarity, set_name, parent_id")
      .eq("category", "pokemon")
      .eq("product_type", "single")
      .ilike("name", `%${pick.nameKw}%`);
    if (pick.setKw === null) q = q.is("set_name", null);
    else q = q.ilike("set_name", `%${pick.setKw}%`);

    const { data, error } = await q;
    if (error) { console.error(`  ${pick.desc} 조회 실패: ${error.message}`); continue; }

    if (!data || data.length === 0) {
      console.log(`  × ${pick.desc} — 매칭 없음`);
      continue;
    }
    // rarity rank 순 정렬 후 top N
    const sorted = [...data].sort((a, b) => rank(a.rarity) - rank(b.rarity));
    const top = sorted.slice(0, pick.count);
    const ids = top.map((r) => r.id);
    await admin.from("market_cards").update({ is_active: true }).in("id", ids);
    for (const id of ids) activatedIds.add(id);
    console.log(`  ✓ ${pick.desc}: ${top.map((r) => `${r.rarity}`).join(", ")} (${top.length}/${pick.count}장)`);
  }

  // 3) 활성 싱글들의 부모(팩/박스) + 조부모(박스) 도 활성화
  console.log("\n[3] 부모 박스/팩 활성화");
  const { data: actSingles } = await admin
    .from("market_cards")
    .select("parent_id")
    .in("id", [...activatedIds]);
  const parentIds = [...new Set((actSingles ?? []).map((r) => r.parent_id).filter((x): x is string => !!x))];
  if (parentIds.length > 0) {
    await admin.from("market_cards").update({ is_active: true }).in("id", parentIds);
    const { data: parents } = await admin.from("market_cards").select("id, product_type, parent_id").in("id", parentIds);
    const grandIds = [...new Set((parents ?? []).filter((p) => p.product_type === "pack" && p.parent_id).map((p) => p.parent_id as string))];
    if (grandIds.length > 0) await admin.from("market_cards").update({ is_active: true }).in("id", grandIds);
    console.log(`  부모 ${parentIds.length}건 + 조부모 ${grandIds.length}건 활성화`);
  }

  // 4) 최종 카운트
  console.log("\n[4] 최종 상태");
  for (const t of ["box", "pack", "single"]) {
    const { count } = await admin.from("market_cards").select("*", { count: "exact", head: true })
      .eq("category", "pokemon").eq("product_type", t).eq("is_active", true);
    console.log(`  pokemon ${t} active: ${count}`);
  }
}

main();
