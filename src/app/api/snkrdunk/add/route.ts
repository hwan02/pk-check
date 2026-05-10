import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

async function fetchProductImage(productUrl: string): Promise<string> {
  try {
    const resp = await fetch(productUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept-Language": "ja,en;q=0.9",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) return "";
    const text = await resp.text();
    const match = text.match(/https:\/\/cdn\.snkrdunk\.com\/upload_bg_removed\/[^"?\s]+/);
    return match ? match[0] : "";
  } catch {
    return "";
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { title, price, url } = body as {
    title: string;
    price: number;
    url: string;
    image: string;
  };

  if (!title || !price) {
    return NextResponse.json({ error: "title and price required" }, { status: 400 });
  }

  const supabase = createServerClient();

  const snkrId = url.match(/\/apparels\/(\d+)/)?.[1] ?? "";
  const cardId = `snkr-${snkrId || Date.now()}`;
  const name = title.split("(")[0].trim();

  // 상품 페이지에서 정확한 이미지 가져오기
  const correctImage = url ? await fetchProductImage(url) : "";

  // custom 세트가 없으면 생성
  await supabase
    .from("sets")
    .upsert({ id: "custom", name: "수동 추가", name_ja: "手動追加", series: "Custom" }, { onConflict: "id" });

  // 카드 upsert
  const { error: cardErr } = await supabase.from("cards").upsert({
    id: cardId,
    name,
    name_ja: name,
    supertype: "Pokémon",
    region: "jp",
    types: null,
    subtypes: null,
    hp: null,
    rarity: null,
    rarity_ja: null,
    set_id: "custom",
    number: snkrId || null,
    artist: null,
    attacks: null,
    weaknesses: null,
    resistances: null,
    retreat_cost: null,
    image_small: correctImage || null,
    image_large: correctImage || null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "id" });

  if (cardErr) {
    return NextResponse.json({ error: cardErr.message }, { status: 500 });
  }

  // 가격 upsert
  const priceData: Record<string, unknown> = {
    card_id: cardId,
    tcg_market: null,
    tcg_low: null,
    tcg_mid: null,
    tcg_high: null,
    snkrdunk_price: price,
    snkrdunk_title: title,
    fetched_at: new Date().toISOString(),
  };
  if (url) priceData.snkrdunk_url = url;

  const { error: priceErr } = await supabase.from("prices").upsert(priceData, { onConflict: "card_id" });

  if (priceErr) {
    return NextResponse.json({ error: priceErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, cardId });
}
