import { NextRequest, NextResponse } from "next/server";

/**
 * Google Cloud Vision API로 카드 이미지에서 텍스트 추출.
 * 클라이언트가 multipart/form-data로 이미지 업로드 → 서버에서 Vision REST API 호출.
 *
 * 응답: { text, number, name, rarity }
 *  - text: 전체 OCR 텍스트 (디버그용)
 *  - number: 카드 번호 (예: "045/198" 또는 "260")
 *  - name: 카드명 추정 (가장 긴 CJK 문자열)
 *  - rarity: 등급 약자 (C/U/R/RR/AR/SR/SAR/UR/HR/ACE 중 매칭)
 */
const VISION_URL = "https://vision.googleapis.com/v1/images:annotate";

const RARITY_TOKENS = [
  "SAR", "SSR", "SR", "RRR", "RR", "AR", "UR", "HR", "ACE",
  "ACESPEC", "CHR", "TR", "P", "PR", "C", "U", "R",
];

function extractNumber(text: string): string {
  const numMatch = text.match(/(\d{1,3})\s*\/\s*(\d{1,3})/);
  if (numMatch) {
    return `${numMatch[1].padStart(3, "0")}/${numMatch[2].padStart(3, "0")}`;
  }
  const looseMatch = text.match(/\b(\d{2,3})\b/);
  return looseMatch ? looseMatch[1] : "";
}

function extractName(text: string): string {
  const cjkChunks = text.match(/[぀-ゟ゠-ヿ一-鿿가-힯]+(?:[ ・]*[぀-ゟ゠-ヿ一-鿿가-힯]+)*/g) ?? [];
  const longest = cjkChunks.sort((a, b) => b.length - a.length)[0] ?? "";
  return longest.length >= 2 ? longest : "";
}

function extractRarity(text: string): string {
  // 카드 번호 직후 토큰 우선
  const numMatch = text.match(/(\d{1,3})\s*\/\s*(\d{1,3})/);
  if (numMatch) {
    const idx = text.indexOf(numMatch[0]) + numMatch[0].length;
    const after = text.slice(idx, idx + 20);
    const m = after.match(/\b([A-Z]{1,4})\b/);
    if (m && RARITY_TOKENS.includes(m[1])) return m[1];
  }
  // 폴백: 본문 어디서든 (긴 토큰 우선)
  for (const t of RARITY_TOKENS) {
    const re = new RegExp(`(?:^|[^A-Z])${t}(?:[^A-Z]|$)`);
    if (re.test(text)) return t;
  }
  return "";
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GOOGLE_CLOUD_VISION_API_KEY missing" }, { status: 500 });
  }

  const form = await request.formData();
  const file = form.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }

  // 이미지 → base64
  const buf = Buffer.from(await file.arrayBuffer());
  const b64 = buf.toString("base64");

  // Vision API 호출 — DOCUMENT_TEXT_DETECTION가 일반 TEXT보다 정확도 높음
  const visionResp = await fetch(`${VISION_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requests: [
        {
          image: { content: b64 },
          features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
          imageContext: { languageHints: ["ja", "ko", "en"] },
        },
      ],
    }),
    signal: AbortSignal.timeout(20000),
  });

  if (!visionResp.ok) {
    const errText = await visionResp.text();
    return NextResponse.json({ error: `vision api: ${errText.slice(0, 200)}` }, { status: 500 });
  }

  const visionJson = await visionResp.json();
  const text: string = visionJson?.responses?.[0]?.fullTextAnnotation?.text ?? "";

  if (!text) {
    return NextResponse.json({ text: "", number: "", name: "", rarity: "" });
  }

  return NextResponse.json({
    text,
    number: extractNumber(text),
    name: extractName(text),
    rarity: extractRarity(text),
  });
}
