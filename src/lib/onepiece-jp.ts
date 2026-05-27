/**
 * onepiece-cardgame.com (일본 공식) 카드리스트 스크래퍼.
 * - 시리즈(박스/팩/스타트덱/익스트라/프리미엄 등) 목록
 * - 시리즈별 카드 전체 (이름·레어리티·색·파워·텍스트·이미지URL 등)
 *
 * 사이트가 cookie 기반 세션이라 첫 요청은 cookie 세팅을 위한 GET 한 번이 필요.
 * fetchSeriesList() 또는 fetchSeriesCards() 가 알아서 워밍업 해줌.
 */

const BASE = "https://www.onepiece-cardgame.com";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

export type OpCategory = "LEADER" | "CHARACTER" | "EVENT" | "STAGE" | "DON!!";

export interface OpSeries {
  /** option value (예: "550116") */
  value: string;
  /** 시리즈 코드 (예: "OP-16", "ST-30", "EB-04", "PRB-02") — null 이면 코드 미상 */
  code: string | null;
  /** 시리즈명 (예: "ブースターパック 決戦の刻") */
  name: string;
  /** 카테고리 (booster / start / extra / premium / 기타) */
  type: "booster" | "start" | "extra" | "premium" | "other";
}

export interface OpCard {
  /** 카드 ID (예: "OP16-001") */
  id: string;
  /** 시리즈 코드 (예: "OP16") */
  seriesCode: string;
  name: string;
  rarity: string;             // C / UC / R / SR / SEC / L / P 등
  category: OpCategory | string;
  cost: number | null;        // CHARACTER/EVENT/STAGE 의 코스트
  life: number | null;        // LEADER 의 라이프
  power: number | null;
  counter: number | null;     // 카운터 ("-" 면 null)
  color: string;              // 赤 / 緑 / 青 / 紫 / 黒 / 黄 (복수면 "赤/緑")
  block: string | null;       // 블록 아이콘 번호
  attribute: string;          // 斬 / 打 / 特 / 飛 등 (이미지 alt)
  feature: string;            // 특징 (예: "白ひげ海賊団")
  text: string;               // 효과 텍스트
  trigger: string;            // 트리거 효과 (있을 때)
  getInfo: string;            // 입수 정보 (예: "ブースターパック 決戦の刻【OP-16】")
  imageUrl: string;           // 절대 URL
}

let cookieJar: string | null = null;

function buildHeaders(extra?: Record<string, string>): HeadersInit {
  const h: Record<string, string> = {
    "User-Agent": UA,
    "Accept-Language": "ja,en-US;q=0.8,en;q=0.6",
    ...(extra ?? {}),
  };
  if (cookieJar) h["Cookie"] = cookieJar;
  return h;
}

async function fetchHtml(url: string): Promise<{ html: string; finalUrl: string }> {
  const resp = await fetch(url, {
    headers: buildHeaders(),
    signal: AbortSignal.timeout(20000),
    redirect: "follow",
  });
  // set-cookie 가 여러 줄로 올 수 있음 (Node fetch 는 합쳐서 줌)
  const sc = resp.headers.get("set-cookie");
  if (sc) {
    const merged = sc
      .split(/,(?=[^ ]+=)/)
      .map((c) => c.split(";")[0].trim())
      .filter(Boolean)
      .join("; ");
    cookieJar = cookieJar ? `${cookieJar}; ${merged}` : merged;
  }
  if (!resp.ok) throw new Error(`HTTP ${resp.status} ${url}`);
  return { html: await resp.text(), finalUrl: resp.url || url };
}

/** &amp; / &quot; / &lt; / &gt; 단순 디코드. */
function decode(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

/** 시리즈 옵션 라벨에서 코드 ("OP-16", "ST-30" 등) 추출 */
function extractCode(label: string): string | null {
  const m = label.match(/【([A-Z]{1,4}-\d{1,3})】/);
  return m ? m[1] : null;
}

function classifySeries(label: string): OpSeries["type"] {
  if (label.includes("ブースターパック")) return "booster";
  if (label.includes("スタートデッキ") || label.includes("アルティメットデッキ")) return "start";
  if (label.includes("エクストラブースター")) return "extra";
  if (label.includes("プレミアムブースター")) return "premium";
  return "other";
}

/** 시리즈(박스/팩/덱) 전체 목록. */
export async function fetchSeriesList(): Promise<OpSeries[]> {
  const { html } = await fetchHtml(`${BASE}/cardlist/`);
  // <select name="series" ...> ... </select>
  const selMatch = html.match(/<select[^>]+name="series"[^>]*>([\s\S]*?)<\/select>/);
  if (!selMatch) return [];
  const inner = selMatch[1];
  const opts = [...inner.matchAll(/<option\s+value="(\d+)"[^>]*>([\s\S]*?)<\/option>/g)];
  return opts
    .map((m): OpSeries => {
      const value = m[1];
      const raw = decode(m[2]);
      const label = stripTags(raw);
      return {
        value,
        code: extractCode(label),
        name: label.replace(/【[A-Z]{1,4}-\d{1,3}】$/, "").trim(),
        type: classifySeries(label),
      };
    })
    .filter((s) => !!s.value);
}

/** 한 카드 블록 (<dl class="modalCol" id="..."> … </dl>) 을 파싱. */
function parseCardBlock(block: string): OpCard | null {
  // 알트아트/망가레어 변형은 id 에 _p1 / _p2 접미사가 붙음 (예: OP01-003_p1)
  const idMatch = block.match(/id="([A-Za-z0-9_-]+)"/);
  if (!idMatch) return null;
  const id = idMatch[1];
  const seriesCode = id.split("-")[0];

  const nameMatch = block.match(/<div class="cardName">([\s\S]*?)<\/div>/);
  const name = nameMatch ? stripTags(decode(nameMatch[1])) : "";

  // <div class="infoCol"><span>OP16-001</span> | <span>L</span> | <span>LEADER</span></div>
  const info = [...block.matchAll(/<div class="infoCol">([\s\S]*?)<\/div>/g)][0]?.[1] ?? "";
  const infoSpans = [...info.matchAll(/<span>([^<]+)<\/span>/g)].map((m) => m[1].trim());
  const rarity = infoSpans[1] ?? "";
  const category = infoSpans[2] ?? "";

  const imgMatch = block.match(/<img[^>]*data-src="([^"]+)"/);
  const imageUrl = imgMatch
    ? new URL(imgMatch[1].replace(/^\.\.\//, "/"), BASE).toString()
    : "";

  // 필드 일반 파서: <div class="X"><h3>...</h3>VALUE</div>
  function field(cls: string): string | null {
    const re = new RegExp(`<div class="${cls}"[^>]*>([\\s\\S]*?)</div>`, "i");
    const m = block.match(re);
    if (!m) return null;
    const inner = m[1].replace(/<h3[^>]*>[\s\S]*?<\/h3>/i, "");
    return stripTags(decode(inner)) || null;
  }

  function num(cls: string): number | null {
    const v = field(cls);
    if (!v || v === "-") return null;
    const n = parseInt(v.replace(/[^\d-]/g, ""), 10);
    return Number.isFinite(n) ? n : null;
  }

  // 속성은 이미지 alt
  let attribute = "";
  const attrBlock = block.match(/<div class="attribute"[^>]*>([\s\S]*?)<\/div>/);
  if (attrBlock) {
    const alt = attrBlock[1].match(/alt="([^"]+)"/);
    if (alt) attribute = alt[1];
  }

  // 코스트/라이프는 같은 class="cost" 안에 들어가는데, LEADER 면 "ライフ", 그 외엔 "コスト".
  // 사이트가 LEADER 일 때도 div.cost 로 감싸고 안에 <h3>ライフ</h3>5 형태로 옴.
  const costH3 = block.match(/<div class="cost"[^>]*>\s*<h3>([^<]+)<\/h3>([^<]+)<\/div>/);
  let cost: number | null = null;
  let life: number | null = null;
  if (costH3) {
    const label = costH3[1].trim();
    const val = parseInt(costH3[2].trim(), 10);
    if (Number.isFinite(val)) {
      if (label.startsWith("ライフ")) life = val;
      else cost = val;
    }
  }

  return {
    id,
    seriesCode,
    name,
    rarity,
    category,
    cost,
    life,
    power: num("power"),
    counter: num("counter"),
    color: field("color") ?? "",
    block: field("block"),
    attribute,
    feature: field("feature") ?? "",
    text: field("text") ?? "",
    trigger: field("trigger") ?? "",
    getInfo: field("getInfo") ?? "",
    imageUrl,
  };
}

/** 특정 시리즈(option value) 의 카드 전체. */
export async function fetchSeriesCards(seriesValue: string): Promise<OpCard[]> {
  if (!cookieJar) await fetchHtml(`${BASE}/cardlist/`).catch(() => {});
  const { html } = await fetchHtml(`${BASE}/cardlist/?series=${seriesValue}`);
  const blocks = [...html.matchAll(/<dl class="modalCol"[\s\S]*?<\/dl>/g)].map((m) => m[0]);
  const cards: OpCard[] = [];
  for (const b of blocks) {
    const c = parseCardBlock(b);
    if (c) cards.push(c);
  }
  return cards;
}

/**
 * 시리즈 상품 페이지에서 팩/덱 이미지 URL 을 추출.
 * 신구 페이지 형식이 섞여 있어 후보 패턴을 순차로 시도.
 *
 * @param code - 시리즈 코드 (예: "OP-16", "ST-30", "EB-04")
 * @param type - "booster" | "extra" | "premium" | "start"
 */
export async function fetchProductImage(
  code: string,
  type: OpSeries["type"],
): Promise<string | null> {
  const lower = code.toLowerCase().replace("-", "");
  // booster/extra/premium 은 boosters 디렉토리, start 는 decks 디렉토리 사용
  const sub = type === "start" ? "decks" : "boosters";
  const candidates = [
    `${BASE}/products/${lower}.html`,
    `${BASE}/products/${sub}/${lower}.php`,
    `${BASE}/products/${sub}/${lower}/`,
  ];
  // 일부 스타트덱은 묶음 페이지에 들어 있음 (예: ST-15 ~ ST-20 → decks/st15-20.php)
  const num = parseInt(lower.replace(/^[a-z]+/, ""), 10);
  if (type === "start" && Number.isFinite(num)) {
    // 5단위로 묶이는 경향 — 인접 묶음 페이지를 시도
    for (let start = Math.max(1, num - 5); start <= num; start++) {
      for (let end = num; end <= num + 5; end++) {
        if (start === end) continue;
        const pad = (n: number) => n.toString().padStart(2, "0");
        candidates.push(`${BASE}/products/decks/st${pad(start)}-${pad(end)}.php`);
      }
    }
  }

  for (const url of candidates) {
    let result: { html: string; finalUrl: string };
    try {
      result = await fetchHtml(url);
    } catch {
      continue;
    }
    const img = pickProductImage(result.html, result.finalUrl);
    if (img) return img;
  }
  return null;
}

function pickProductImage(html: string, pageUrl: string): string | null {
  // 1순위: alt 에 "パック画像" / "商品画像" 포함된 img (신형식)
  const altMatch = html.match(
    /<img[^>]+src="([^"]+)"[^>]+alt="[^"]*(?:パック画像|商品画像)[^"]*"/,
  );
  if (altMatch) return resolveUrl(altMatch[1], pageUrl);

  // 2순위: src 가 img_item01 인 것
  const item01 = html.match(/<img[^>]+src="([^"]*img_item01[^"]*)"/);
  if (item01) return resolveUrl(item01[1], pageUrl);

  // 3순위: mv_01_sale 또는 mv_01 (구형식 메인 비주얼)
  const mvSale = html.match(/<img[^>]+src="([^"]*mv_01_sale[^"]*)"/);
  if (mvSale) return resolveUrl(mvSale[1], pageUrl);
  const mv01 = html.match(/<img[^>]+src="([^"]*\/mv_01\.[a-z]+[^"]*)"/);
  if (mv01) return resolveUrl(mv01[1], pageUrl);

  // 4순위: img_thumbnail
  const thumb = html.match(/<img[^>]+src="([^"]*img_thumbnail[^"]*)"/);
  if (thumb) return resolveUrl(thumb[1], pageUrl);

  // 5순위: mv_catch_01 (op09 같은 1회성 레이아웃)
  const mvCatch = html.match(/<img[^>]+src="([^"]*mv_catch_01[^"]*)"/);
  if (mvCatch) return resolveUrl(mvCatch[1], pageUrl);

  return null;
}

function resolveUrl(src: string, pageUrl: string): string {
  return new URL(src.replace(/\?[^?]*$/, ""), pageUrl).toString();
}
