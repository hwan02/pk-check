export type ProductType = "box" | "pack" | "single";

export interface MarketCard {
  id: string;
  category: "pokemon" | "onepiece";
  product_type: ProductType;
  parent_id: string | null;
  name: string;
  name_en: string | null;
  set_name: string | null;
  rarity: string | null;
  image_url: string | null;
  notes: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export const PRODUCT_TYPE_LABEL: Record<ProductType, string> = {
  box: "박스",
  pack: "팩",
  single: "싱글",
};

// 기본 부모 타입 (구버전 호환). 가능하면 PARENT_TYPES_OF 사용.
export const PARENT_TYPE_OF: Record<ProductType, ProductType | null> = {
  single: "pack",
  pack: "box",
  box: null,
};

// 부모로 허용되는 모든 타입 — single 은 박스나 팩 둘 다 가능.
export const PARENT_TYPES_OF: Record<ProductType, ProductType[]> = {
  single: ["pack", "box"],
  pack: ["box"],
  box: [],
};

export interface MarketPriceRow {
  id: string;
  card_id: string;
  grade: string;
  price_krw: number;
  recorded_at: string;       // 'YYYY-MM-DD'
  created_at: string;
}

export const MARKET_CATEGORY_LABEL: Record<MarketCard["category"], string> = {
  pokemon: "포켓몬",
  onepiece: "원피스",
};

// 자주 쓰는 등급 — 자동완성용
export const COMMON_GRADES = [
  "PSA 10",
  "PSA 9",
  "PSA 8",
  "PSA 7",
  "BGS 10",
  "BGS 9.5",
  "CGC 10",
  "raw",
] as const;

export function formatKRW(n: number | null | undefined): string {
  if (n == null) return "-";
  return `₩${n.toLocaleString("ko-KR")}`;
}

/**
 * 같은 등급의 가격 추이에서 직전 가격과의 변동률 계산.
 */
export function priceChangePct(
  latest: number,
  prev: number | null | undefined,
): { diff: number; pct: number; dir: "up" | "down" | "flat" } | null {
  if (prev == null || prev <= 0) return null;
  const diff = latest - prev;
  const pct = (diff / prev) * 100;
  return { diff, pct, dir: diff > 0 ? "up" : diff < 0 ? "down" : "flat" };
}

/**
 * history 행 배열에서 등급별 최신가 1개씩 추출. 정렬은 등급 우선순위 → 가격 내림차순.
 */
export function latestByGrade(rows: MarketPriceRow[]): {
  grade: string;
  latest: number;
  prev: number | null;
  recorded_at: string;
}[] {
  const byGrade = new Map<string, MarketPriceRow[]>();
  for (const r of rows) {
    const arr = byGrade.get(r.grade) ?? [];
    arr.push(r);
    byGrade.set(r.grade, arr);
  }
  const result: { grade: string; latest: number; prev: number | null; recorded_at: string }[] = [];
  for (const [grade, arr] of byGrade) {
    const sorted = [...arr].sort((a, b) => b.recorded_at.localeCompare(a.recorded_at));
    const latest = sorted[0];
    const prev = sorted[1]?.price_krw ?? null;
    result.push({
      grade,
      latest: latest.price_krw,
      prev,
      recorded_at: latest.recorded_at,
    });
  }
  // 등급 우선순위: COMMON_GRADES 순서, 그 외는 알파벳
  result.sort((a, b) => {
    const ai = (COMMON_GRADES as readonly string[]).indexOf(a.grade);
    const bi = (COMMON_GRADES as readonly string[]).indexOf(b.grade);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.grade.localeCompare(b.grade);
  });
  return result;
}
