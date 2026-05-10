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

    // 상품 블록 단위로 파싱: 이미지 + href + title + price
    const items: { url: string; title: string; price: number; image: string }[] = [];

    // 각 상품 링크 블록에서 이미지, href, title, price 추출
    // 패턴: <a href="...apparels/ID" ... aria-label="TITLE - ¥PRICE">
    const blockRegex = /href="(https:\/\/snkrdunk\.com\/apparels\/\d+)"[^>]*?aria-label="([^"]+?)\s*-\s*¥([\d,]+)"/g;
    let match;
    const hrefPositions: { href: string; title: string; price: number; pos: number }[] = [];

    while ((match = blockRegex.exec(text)) !== null) {
      hrefPositions.push({
        href: match[1],
        title: match[2],
        price: parseInt(match[3].replace(/,/g, "")),
        pos: match.index,
      });
    }

    // CDN 이미지 위치 수집
    const imgRegex = /src="(https:\/\/cdn\.snkrdunk\.com\/upload_bg_removed\/[^"]+)"/g;
    const imgPositions: { url: string; pos: number }[] = [];
    while ((match = imgRegex.exec(text)) !== null) {
      imgPositions.push({ url: match[1], pos: match.index });
    }

    // 각 상품에 가장 가까운 이전 이미지 매칭
    for (const item of hrefPositions) {
      let bestImg = "";
      for (const img of imgPositions) {
        if (img.pos < item.pos) {
          bestImg = img.url;
        } else {
          break;
        }
      }
      items.push({
        url: item.href,
        title: item.title,
        price: item.price,
        image: bestImg,
      });
    }

    // 검색어 키워드로 관련성 필터링
    const queryParts = q.split(/\s+/).filter(Boolean);
    const relevant = items.filter((item) =>
      queryParts.some((part) => item.title.includes(part))
    );

    // 관련 결과가 있으면 그것만, 없으면 포켓몬 필터
    let result;
    if (relevant.length > 0) {
      result = relevant;
    } else {
      const pokemonKeywords = ["ポケモン", "ポケカ", "ピカチュウ", "リザードン", "ミュウ", "イーブイ",
        "ex ", "SAR", "SR ", "UR ", "AR ", "VSTAR", "VMAX", "プロモ", "パック", "ボックス"];
      result = items.filter((item) =>
        pokemonKeywords.some((kw) => item.title.includes(kw))
      );
    }

    return NextResponse.json({ items: (result.length > 0 ? result : items).slice(0, 30) });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
