// 배송사별 송장 추적 URL 자동 생성

const TEMPLATES: { match: (c: string) => boolean; url: (no: string) => string; label: string }[] = [
  {
    label: "EMS / 우체국",
    match: (c) => c.includes("ems") || c.includes("epost") || c.includes("우체국") || c.includes("post"),
    url: (no) => `https://service.epost.go.kr/trace.RetrieveDomRigiTraceList.comm?sid1=${encodeURIComponent(no)}`,
  },
  {
    label: "DHL",
    match: (c) => c.includes("dhl"),
    url: (no) => `https://www.dhl.com/en/express/tracking.html?AWB=${encodeURIComponent(no)}`,
  },
  {
    label: "FedEx",
    match: (c) => c.includes("fedex"),
    url: (no) => `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(no)}`,
  },
  {
    label: "UPS",
    match: (c) => c.includes("ups"),
    url: (no) => `https://www.ups.com/track?tracknum=${encodeURIComponent(no)}`,
  },
  {
    label: "CJ대한통운",
    match: (c) => c.includes("cj") || c.includes("대한통운"),
    url: (no) => `https://trace.cjlogistics.com/next/tracking.html?wblNo=${encodeURIComponent(no)}`,
  },
  {
    label: "한진택배",
    match: (c) => c.includes("한진") || c.includes("hanjin"),
    url: (no) => `https://www.hanjin.com/kor/CMS/DeliveryMgr/WaybillResult.do?wblnumText2=${encodeURIComponent(no)}`,
  },
];

export function trackingUrlFor(carrier: string | null | undefined, trackingNo: string | null | undefined): string | null {
  if (!trackingNo) return null;
  const c = (carrier ?? "").toLowerCase().trim();
  if (!c) return null;
  for (const t of TEMPLATES) {
    if (t.match(c)) return t.url(trackingNo);
  }
  return null;
}

// 자동완성용 — 어드민 UI 에서 배송사 입력 시 추천
export const KNOWN_CARRIERS = ["EMS", "DHL", "FedEx", "UPS", "CJ대한통운", "한진택배"] as const;
