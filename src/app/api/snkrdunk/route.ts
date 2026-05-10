import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";
  if (!q) return NextResponse.json({ items: [] });

  try {
    const encoded = encodeURIComponent(q);
    const url = `https://snkrdunk.com/search?keyword=${encoded}&searchCategoryIds=6`;

    const resp = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept-Language": "ja,en;q=0.9",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!resp.ok) return NextResponse.json({ items: [] });

    const text = await resp.text();

    // href + aria-label + price 추출
    const items: { url: string; title: string; price: number; image: string }[] = [];
    const regex = /href="(https:\/\/snkrdunk\.com\/apparels\/\d+)"[^>]*?aria-label="([^"]+?)\s*-\s*¥([\d,]+)"/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      items.push({
        url: match[1],
        title: match[2],
        price: parseInt(match[3].replace(/,/g, "")),
        image: "",
      });
    }

    // 이미지 URL도 추출 시도
    const imgRegex = /src="(https:\/\/cdn\.snkrdunk\.com\/[^"]+\.webp)"/g;
    let imgIdx = 0;
    while ((match = imgRegex.exec(text)) !== null && imgIdx < items.length) {
      items[imgIdx].image = match[1];
      imgIdx++;
    }

    // 포켓몬 관련 상품만 필터
    const pokemonKeywords = ["ポケモン", "ポケカ", "ピカチュウ", "リザードン", "ミュウ", "イーブイ",
      "ブイズ", "Pokemon", "pokemon", "マクドナルド", "ハッピーセット",
      "ex ", "EX ", "SAR", "SR ", "UR ", "AR ", "VSTAR", "VMAX", " V ",
      "プロモ", "パック", "ボックス", "デッキ", "拡張"];
    const filtered = items.filter((item) =>
      pokemonKeywords.some((kw) => item.title.includes(kw))
    );

    return NextResponse.json({ items: (filtered.length > 0 ? filtered : items).slice(0, 30) });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
