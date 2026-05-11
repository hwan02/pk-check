import { NextRequest, NextResponse } from "next/server";

/**
 * Google Cloud Vision API로 카드 이미지 OCR.
 * 카드는 텍스트가 많아(HP/공격 데미지/번호/이름 등) 단순 정규식이 잘못된 숫자를 잡음.
 *  → Vision의 단어별 boundingBox를 활용해 위치 기반으로 영역 분리:
 *    - 카드 번호: 좌하단 (left<55%, top>75%)
 *    - 카드 이름: 상단 (top<25%)
 *    - 등급: 카드 번호 근처 또는 폴백
 */
const VISION_URL = "https://vision.googleapis.com/v1/images:annotate";

const RARITY_TOKENS = [
  "SAR", "SSR", "SR", "RRR", "RR", "AR", "UR", "HR", "ACE",
  "ACESPEC", "CHR", "TR", "P", "PR", "C", "U", "R",
];

interface Vertex { x?: number; y?: number; }
interface BoundingBox { vertices?: Vertex[]; }
interface Symbol { text: string; }
interface Word { symbols: Symbol[]; boundingBox?: BoundingBox; }
interface Paragraph { words: Word[]; }
interface Block { paragraphs: Paragraph[]; }
interface Page { width?: number; height?: number; blocks: Block[]; }
interface VisionResp {
  responses?: { fullTextAnnotation?: { text?: string; pages?: Page[] } }[];
}

type WordInfo = { text: string; cx: number; cy: number; w: number; h: number };

function extractWords(page: Page): WordInfo[] {
  const out: WordInfo[] = [];
  const W = page.width ?? 1;
  const H = page.height ?? 1;
  for (const block of page.blocks ?? []) {
    for (const para of block.paragraphs ?? []) {
      for (const word of para.words ?? []) {
        const text = (word.symbols ?? []).map((s) => s.text).join("");
        if (!text) continue;
        const verts = word.boundingBox?.vertices ?? [];
        if (verts.length < 2) continue;
        const xs = verts.map((v) => v.x ?? 0);
        const ys = verts.map((v) => v.y ?? 0);
        const minX = Math.min(...xs), maxX = Math.max(...xs);
        const minY = Math.min(...ys), maxY = Math.max(...ys);
        out.push({
          text,
          cx: (minX + maxX) / 2 / W,
          cy: (minY + maxY) / 2 / H,
          w: (maxX - minX) / W,
          h: (maxY - minY) / H,
        });
      }
    }
  }
  return out;
}

/** 좌하단 영역의 단어들로 카드 번호 추출. */
function findNumber(words: WordInfo[]): { number: string; nearby: WordInfo[] } {
  // 좌하단 후보: y>0.7, x<0.6
  const bottomLeft = words.filter((w) => w.cy > 0.7 && w.cx < 0.6);
  // y 좌표로 라인을 묶기 위해 정렬
  bottomLeft.sort((a, b) => a.cy - b.cy || a.cx - b.cx);
  // 같은 라인 단어 묶기 (높이 차이 작으면 같은 라인)
  const lines: WordInfo[][] = [];
  for (const w of bottomLeft) {
    const last = lines[lines.length - 1];
    if (last && Math.abs(last[0].cy - w.cy) < 0.02) last.push(w);
    else lines.push([w]);
  }
  // 각 라인의 텍스트를 합쳐서 번호 패턴 검사
  for (const line of lines) {
    line.sort((a, b) => a.cx - b.cx);
    const joined = line.map((w) => w.text).join(" ");
    // 패턴 1: "260/SV-P", "045/198"
    const m1 = joined.match(/(\d{1,3})\s*\/\s*([A-Z][A-Z0-9-]*|\d{1,3})/);
    if (m1) return { number: `${m1[1]}/${m1[2]}`, nearby: line };
    // 패턴 2: 단독 숫자 (jp 패딩 "001" 등)
    const m2 = joined.match(/\b(\d{2,3})\b/);
    if (m2) return { number: m2[1], nearby: line };
  }
  // 폴백: 전체 텍스트에서
  const all = words.map((w) => w.text).join(" ");
  const fb = all.match(/(\d{1,3})\s*\/\s*([A-Z][A-Z0-9-]*|\d{1,3})/);
  if (fb) return { number: `${fb[1]}/${fb[2]}`, nearby: [] };
  return { number: "", nearby: [] };
}

/**
 * 카드명 추출. 카드명은 상단에서 **가장 큰 폰트**로 인쇄됨.
 *  - 영역: y < 0.3
 *  - 단어 높이(h)가 가장 큰 라인 → 그 라인의 텍스트 합쳐서 반환
 *  - CJK 우선이지만 영문 카드(en region)도 대응
 */
function findName(words: WordInfo[]): string {
  const top = words.filter((w) => w.cy < 0.3 && w.text.trim().length > 0);
  if (top.length === 0) return "";

  // y 좌표로 라인 묶기 (높이 ~10% 이내 같은 라인 취급)
  top.sort((a, b) => a.cy - b.cy || a.cx - b.cx);
  const lines: WordInfo[][] = [];
  for (const w of top) {
    const last = lines[lines.length - 1];
    if (last && Math.abs(last[0].cy - w.cy) < Math.max(w.h, 0.02)) last.push(w);
    else lines.push([w]);
  }

  // 각 라인의 평균 단어 높이 → 가장 큰 라인이 카드명일 확률 높음
  const scored = lines.map((line) => {
    const avgH = line.reduce((s, w) => s + w.h, 0) / line.length;
    return { line, avgH };
  });
  scored.sort((a, b) => b.avgH - a.avgH);

  // 상위 라인부터 검사: CJK 또는 충분히 긴 영문 텍스트
  for (const { line } of scored) {
    line.sort((a, b) => a.cx - b.cx);
    const joined = line.map((w) => w.text).join("");
    // 카드 종류/HP/속성 부분 제외
    if (/^(HP|hp)\d/.test(joined)) continue;
    if (/^[\d]+$/.test(joined)) continue;
    // CJK가 있으면 그 부분만, 아니면 전체
    const cjk = joined.match(/[぀-ゟ゠-ヿ一-鿿가-힯][぀-ゟ゠-ヿ一-鿿가-힯ー・]*/g);
    if (cjk && cjk.length > 0) {
      const longest = cjk.sort((a, b) => b.length - a.length)[0];
      if (longest.length >= 2) return longest;
    }
    // 영문 카드명 (대소문자 혼합, 3자 이상)
    const en = joined.match(/[A-Za-z][A-Za-z' .-]{2,}/);
    if (en && en[0].length >= 3) return en[0].trim();
  }
  return "";
}

/** 카드 번호 근처에서 등급 토큰 찾기, 없으면 전체에서 폴백. */
function findRarity(words: WordInfo[], nearby: WordInfo[]): string {
  const sources = [
    nearby.map((w) => w.text).join(" "),
    words.map((w) => w.text).join(" "),
  ];
  for (const src of sources) {
    for (const t of RARITY_TOKENS) {
      const re = new RegExp(`(?:^|[^A-Z])${t}(?:[^A-Z]|$)`);
      if (re.test(src)) return t;
    }
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

  const buf = Buffer.from(await file.arrayBuffer());
  const b64 = buf.toString("base64");

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

  const visionJson: VisionResp = await visionResp.json();
  const ann = visionJson?.responses?.[0]?.fullTextAnnotation;
  const text = ann?.text ?? "";
  const pages = ann?.pages ?? [];

  if (!text || pages.length === 0) {
    return NextResponse.json({ text: "", number: "", name: "", rarity: "" });
  }

  const words = extractWords(pages[0]);
  const { number, nearby } = findNumber(words);
  const name = findName(words);
  const rarity = findRarity(words, nearby);

  return NextResponse.json({ text, number, name, rarity });
}
