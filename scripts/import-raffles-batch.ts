/**
 * 일본 아마존 응모 17개 일괄 등록.
 *
 * 사용자가 보내준 amzn.to 단축 링크 그대로 사용.
 * 모든 row 는 is_active=false 로 들어가니, 어드민에서 이미지 채우고 일정 채운 후 활성화.
 *
 * DRY_RUN=1 (default) — 카운트만
 * DRY_RUN=0 — 실제 insert (중복 amazon_url 은 건너뜀)
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "fs";

const envPath = "/Users/ssh/workspace/pk-check/.env.local";
if (!existsSync(envPath)) process.exit(1);
for (const line of readFileSync(envPath, "utf-8").split("\n")) {
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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const DRY_RUN = (process.env.DRY_RUN ?? "1") !== "0";

type RaffleSeed = {
  category: "pokemon" | "onepiece";
  title: string;
  title_ja: string;
  amazon_url: string;
  display_order: number;
};

// 노출 순서: 30주년 메인박스 → 프리미엄덱 → 스타팅 1~9세대 → MEGA 시리즈 신상 → 원피스
const RAFFLES: RaffleSeed[] = [
  // ============ 포켓몬 30주년 시리즈 ============
  {
    category: "pokemon",
    title: "MEGA 확장팩 「30th CELEBRATION」 BOX",
    title_ja: "ポケモンカードゲーム MEGA 拡張パック 30th CELEBRATION BOX",
    amazon_url: "https://amzn.to/4fyX5vM",
    display_order: 10,
  },
  {
    category: "pokemon",
    title: "MEGA 30th CELEBRATION 프리미엄 덱 세트 「에브이 · 블래키」",
    title_ja: "ポケモンカードゲーム MEGA 30th CELEBRATION プレミアムデッキセット エーフィ・ブラッキー",
    amazon_url: "https://amzn.to/4g5SocT",
    display_order: 20,
  },
  // 스타팅 1세대 — 칸토
  {
    category: "pokemon",
    title: "30th CELEBRATION 카드 세트 「이상해씨·파이리·꼬부기」 (1세대 칸토)",
    title_ja: "ポケモンカードゲーム MEGA 30th CELEBRATION カードセット フシギダネ・ヒトカゲ・ゼニガメ",
    amazon_url: "https://amzn.to/4dVkw14",
    display_order: 31,
  },
  // 2세대 — 죠토
  {
    category: "pokemon",
    title: "30th CELEBRATION 카드 세트 「치코리타·브케인·리아코」 (2세대 죠토)",
    title_ja: "ポケモンカードゲーム MEGA 30th CELEBRATION カードセット チコリータ・ヒノアラシ・ワニノコ",
    amazon_url: "https://amzn.to/4xiti0w",
    display_order: 32,
  },
  // 3세대 — 호엔
  {
    category: "pokemon",
    title: "30th CELEBRATION 카드 세트 「나무지기·아차모·물짱이」 (3세대 호엔)",
    title_ja: "ポケモンカードゲーム MEGA 30th CELEBRATION カードセット キモリ・アチャモ・ミズゴロウ",
    amazon_url: "https://amzn.to/4vh74uN",
    display_order: 33,
  },
  // 4세대 — 신오
  {
    category: "pokemon",
    title: "30th CELEBRATION 카드 세트 「모부기·불꽃숭이·팽도리」 (4세대 신오)",
    title_ja: "ポケモンカードゲーム MEGA 30th CELEBRATION カードセット ナエトル・ヒコザル・ポッチャマ",
    amazon_url: "https://amzn.to/43k4DLB",
    display_order: 34,
  },
  // 5세대 — 이슈
  {
    category: "pokemon",
    title: "30th CELEBRATION 카드 세트 「주리비얀·뚜꾸리·수댕이」 (5세대 이슈)",
    title_ja: "ポケモンカードゲーム MEGA 30th CELEBRATION カードセット ツタージャ・ポカブ・ミジュマル",
    amazon_url: "https://amzn.to/4fREtaz",
    display_order: 35,
  },
  // 6세대 — 칼로스
  {
    category: "pokemon",
    title: "30th CELEBRATION 카드 세트 「도치마론·푸호꼬·개구마르」 (6세대 칼로스)",
    title_ja: "ポケモンカードゲーム MEGA 30th CELEBRATION カードセット ハリマロン・フォッコ・ケロマツ",
    amazon_url: "https://amzn.to/4ftk7nI",
    display_order: 36,
  },
  // 7세대 — 알로라
  {
    category: "pokemon",
    title: "30th CELEBRATION 카드 세트 「나몰빼미·냐오불꽃·모쿠나이」 (7세대 알로라)",
    title_ja: "ポケモンカードゲーム MEGA 30th CELEBRATION カードセット モクロー・ニャビー・アシマリ",
    amazon_url: "https://amzn.to/3SttbiJ",
    display_order: 37,
  },
  // 8세대 — 갈라르
  {
    category: "pokemon",
    title: "30th CELEBRATION 카드 세트 「흥나숭이·염버니·울머기」 (8세대 갈라르)",
    title_ja: "ポケモンカードゲーム MEGA 30th CELEBRATION カードセット サルノリ・ヒバニー・メッソン",
    amazon_url: "https://amzn.to/3QrFhsc",
    display_order: 38,
  },
  // 9세대 — 팔데아
  {
    category: "pokemon",
    title: "30th CELEBRATION 카드 세트 「나오하·뜨아거·꽥꽥오리」 (9세대 팔데아)",
    title_ja: "ポケモンカードゲーム MEGA 30th CELEBRATION カードセット ニャオハ・ホゲータ・クワッス",
    amazon_url: "https://amzn.to/4usrgs1",
    display_order: 39,
  },

  // ============ MEGA 확장팩 시리즈 ============
  {
    category: "pokemon",
    title: "MEGA 하이클래스팩 「MEGA 드림 ex」 BOX",
    title_ja: "Pokemon Card Game MEGA High Class Pack MEGA Dream ex Box",
    amazon_url: "https://amzn.to/3PSx1Bo",
    display_order: 50,
  },
  {
    category: "pokemon",
    title: "MEGA 확장팩 「메가브레이브」 BOX",
    title_ja: "Pokemon Card Game MEGA Expansion Pack Mega Brave Box",
    amazon_url: "https://amzn.to/43UPqR9",
    display_order: 51,
  },
  {
    category: "pokemon",
    title: "MEGA 확장팩 「인페르노X」 BOX",
    title_ja: "Pokemon Card Game MEGA Expansion Pack Inferno X Box",
    amazon_url: "https://amzn.to/4xiyy4j",
    display_order: 52,
  },
  {
    category: "pokemon",
    title: "MEGA 확장팩 「어비스아이」 BOX",
    title_ja: "Pokemon Card Game MEGA Expansion Pack Abyss Eye Box",
    amazon_url: "https://amzn.to/3QbEyeC",
    display_order: 53,
  },
  {
    category: "pokemon",
    title: "MEGA 확장팩 「니힐제로」 BOX",
    title_ja: "Pokemon Card Game MEGA Expansion Pack Monikis Zero Box",
    amazon_url: "https://amzn.to/4vA9gNx",
    display_order: 54,
  },

  // ============ 원피스 ============
  {
    category: "onepiece",
    title: "원피스 카드 게임 「決戦の刻」 OP-16 BOX",
    title_ja: "Bandai One Piece Card Game Final Battle OP-16 (Box) Pack of 24",
    amazon_url: "https://amzn.to/4oeb10x",
    display_order: 100,
  },
];

async function main() {
  console.log(`모드: ${DRY_RUN ? "DRY RUN" : "🔧 LIVE INSERT"}\n`);
  console.log(`총 ${RAFFLES.length}건 시드`);

  // 중복 체크 — amazon_url 기준
  const urls = RAFFLES.map((r) => r.amazon_url);
  const { data: existing } = await supabase
    .from("raffles")
    .select("amazon_url")
    .in("amazon_url", urls);
  const dup = new Set((existing ?? []).map((r) => r.amazon_url));
  const toInsert = RAFFLES.filter((r) => !dup.has(r.amazon_url));

  console.log(`  · 이미 등록됨: ${dup.size}`);
  console.log(`  · 신규 insert 대상: ${toInsert.length}\n`);

  for (const r of toInsert) {
    console.log(`  [${r.category.padEnd(8)}] ord=${r.display_order} ${r.title}`);
  }

  if (DRY_RUN) {
    console.log("\nDRY_RUN — 실제 insert: DRY_RUN=0 npx tsx scripts/import-raffles-batch.ts");
    return;
  }

  if (toInsert.length === 0) {
    console.log("\n신규 insert 대상 없음 — 종료.");
    return;
  }

  const rows = toInsert.map((r) => ({
    category: r.category,
    title: r.title,
    title_ja: r.title_ja,
    amazon_url: r.amazon_url,
    image_url: null,                  // 어드민에서 채울 것
    apply_start_at: null,
    apply_end_at: null,
    draw_at: null,
    ship_note: null,
    price_jpy: null,
    notes: null,
    display_order: r.display_order,
    is_active: false,                 // 어드민에서 확인 후 켜기
  }));

  const { data, error } = await supabase.from("raffles").insert(rows).select("id, title");
  if (error) {
    console.error("\n❌ insert 실패:", error.message);
    process.exit(1);
  }
  console.log(`\n✅ ${data?.length ?? 0}건 insert 완료. /admin/raffle 에서 이미지/일정 채워주세요.`);
}
main();
