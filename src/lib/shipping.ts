// ===============================================================
// 국제 배송비 계산 — 우체국 K-Packet (등기 항공 소형포장물) 기준
// 출처: https://www.koreapost.go.kr  국제우편 요금표
//
// 요금은 변동될 수 있으므로 연 1회 정도 검토 필요.
// 환율은 PAY_TIME_USD_TO_KRW 로 고시값을 사용 (USD = N KRW)
// ===============================================================

export type ShippingZone = 1 | 2 | 3 | 4;

// ISO 3166-1 alpha-2 country code → zone
// 우체국 국제우편 권역 분류 기반 (대분류만 요약, 미등재 국가는 zone 4 로 폴백)
const COUNTRY_ZONE: Record<string, ShippingZone> = {
  // ----- Zone 1: 동북아 / 중화권 -----
  JP: 1,
  CN: 1,
  TW: 1,
  HK: 1,
  MO: 1,

  // ----- Zone 2: 동남아·서남아·몽골 -----
  VN: 2,
  TH: 2,
  PH: 2,
  ID: 2,
  MY: 2,
  SG: 2,
  KH: 2,
  LA: 2,
  MM: 2,
  IN: 2,
  NP: 2,
  BD: 2,
  LK: 2,
  MN: 2,

  // ----- Zone 3: 북미·오세아니아·중동 -----
  US: 3,
  CA: 3,
  AU: 3,
  NZ: 3,
  AE: 3,
  SA: 3,
  IL: 3,
  TR: 3,
  QA: 3,
  KW: 3,
  OM: 3,
  BH: 3,
  JO: 3,

  // ----- Zone 4: 유럽·중남미·아프리카 (기본 폴백) -----
  GB: 4,
  DE: 4,
  FR: 4,
  IT: 4,
  ES: 4,
  NL: 4,
  BE: 4,
  CH: 4,
  AT: 4,
  SE: 4,
  NO: 4,
  DK: 4,
  FI: 4,
  IE: 4,
  PT: 4,
  PL: 4,
  CZ: 4,
  RU: 4,
  UA: 4,
  RO: 4,
  GR: 4,
  BR: 4,
  MX: 4,
  AR: 4,
  CL: 4,
  CO: 4,
  PE: 4,
  EG: 4,
  ZA: 4,
  NG: 4,
  KE: 4,
  MA: 4,
};

export function isKorea(countryCode: string | null | undefined): boolean {
  return (countryCode ?? "").toUpperCase() === "KR";
}

export function getShippingZone(countryCode: string | null | undefined): ShippingZone {
  if (!countryCode) return 4;
  const cc = countryCode.toUpperCase();
  if (cc === "KR") return 1; // 국내 배송은 별도 처리하지만, zone 요청 시 1로 반환
  return COUNTRY_ZONE[cc] ?? 4;
}

// K-Packet 요금표 (KRW) — 무게 구간별
// 키: 최대 무게(g), 값: KRW
// 출처: koreapost.go.kr 국제우편 요금 (2024 기준 추정치, 인상 시 갱신 필요)
const K_PACKET_KRW: Record<ShippingZone, { maxG: number; krw: number }[]> = {
  1: [
    { maxG: 100, krw: 7500 },
    { maxG: 250, krw: 9500 },
    { maxG: 500, krw: 13000 },
    { maxG: 1000, krw: 19500 },
    { maxG: 2000, krw: 32500 },
  ],
  2: [
    { maxG: 100, krw: 8500 },
    { maxG: 250, krw: 11000 },
    { maxG: 500, krw: 15500 },
    { maxG: 1000, krw: 23500 },
    { maxG: 2000, krw: 39500 },
  ],
  3: [
    { maxG: 100, krw: 10500 },
    { maxG: 250, krw: 13500 },
    { maxG: 500, krw: 18500 },
    { maxG: 1000, krw: 28000 },
    { maxG: 2000, krw: 48000 },
  ],
  4: [
    { maxG: 100, krw: 11500 },
    { maxG: 250, krw: 15000 },
    { maxG: 500, krw: 21000 },
    { maxG: 1000, krw: 32000 },
    { maxG: 2000, krw: 54500 },
  ],
};

// 2kg 초과 시 1kg 당 추가 요금 (KRW)
const PER_EXTRA_KG_KRW: Record<ShippingZone, number> = {
  1: 8000,
  2: 10000,
  3: 13000,
  4: 16000,
};

export function calcShippingKRW(zone: ShippingZone, weightG: number): number {
  const tiers = K_PACKET_KRW[zone];
  for (const t of tiers) {
    if (weightG <= t.maxG) return t.krw;
  }
  // 2kg 초과
  const base = tiers[tiers.length - 1].krw;
  const extraKg = Math.ceil((weightG - 2000) / 1000);
  return base + extraKg * PER_EXTRA_KG_KRW[zone];
}

// 카드 1장 기준 무게 추정 (g): 카드(3g) + 슬리브(1g) + 탑로더(15g) = 19g 정도
// 카드 1장당 20g + 패키징(완충재·봉투) 50g + 박스 가벼울 때 30g
const PACKAGING_BASE_G = 80;
const PER_ITEM_G = 25;

export function estimateWeightG(itemCount: number): number {
  return PACKAGING_BASE_G + PER_ITEM_G * Math.max(1, itemCount);
}

// fallback 환율 (USD = N KRW). API 실패 시에만 사용.
export const FALLBACK_USD_TO_KRW = 1500;

// 호환용 별칭 (구 코드 참조 대비)
export const DEFAULT_USD_TO_KRW = FALLBACK_USD_TO_KRW;

// 실시간 환율 (Frankfurter / ECB) — 1시간 캐시
// https://www.frankfurter.app/
export async function getUsdToKrw(): Promise<number> {
  try {
    const resp = await fetch(
      "https://api.frankfurter.app/latest?from=USD&to=KRW",
      { next: { revalidate: 3600 } }, // 1h
    );
    if (!resp.ok) return FALLBACK_USD_TO_KRW;
    const data: { rates?: { KRW?: number } } = await resp.json();
    const rate = data.rates?.KRW;
    if (typeof rate === "number" && rate > 500 && rate < 3000) return rate;
    return FALLBACK_USD_TO_KRW;
  } catch {
    return FALLBACK_USD_TO_KRW;
  }
}

export interface ShippingQuote {
  zone: ShippingZone;
  country: string;
  weight_g: number;
  shipping_krw: number;
  shipping_usd: number;
  exchange_rate: number;
  domestic: boolean;
}

// 국내 택배비 (KRW)
const DOMESTIC_SHIPPING_KRW = 4000; // 일반 등기소포 기준

export function quoteShipping(
  country: string | null | undefined,
  itemCount: number,
  exchangeRate: number = FALLBACK_USD_TO_KRW,
): ShippingQuote {
  const weight_g = estimateWeightG(itemCount);

  if (isKorea(country)) {
    const shipping_krw = DOMESTIC_SHIPPING_KRW;
    const shipping_usd = Math.round((shipping_krw / exchangeRate) * 100) / 100;
    return {
      zone: 1,
      country: "KR",
      weight_g,
      shipping_krw,
      shipping_usd,
      exchange_rate: exchangeRate,
      domestic: true,
    };
  }

  const zone = getShippingZone(country);
  const shipping_krw = calcShippingKRW(zone, weight_g);
  const shipping_usd = Math.round((shipping_krw / exchangeRate) * 100) / 100;
  return {
    zone,
    country: (country ?? "").toUpperCase() || "??",
    weight_g,
    shipping_krw,
    shipping_usd,
    exchange_rate: exchangeRate,
    domestic: false,
  };
}

export const ZONE_LABEL: Record<ShippingZone, string> = {
  1: "Zone 1 (동북아)",
  2: "Zone 2 (동남아/서남아)",
  3: "Zone 3 (북미/오세아니아/중동)",
  4: "Zone 4 (유럽/중남미/아프리카)",
};

export const DOMESTIC_LABEL = "국내 택배";
